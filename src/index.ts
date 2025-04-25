/**
 * This is a template MCP server that implements a simple notes system.
 * It demonstrates core MCP concepts like resources and tools by allowing:
 * - Listing notes as resources
 * - Reading individual notes
 * - Creating new notes via a tool
 * - Summarizing all notes via a prompt
 */

import express, { Request, Response } from 'express';
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CallToolResult, GetPromptResult, isInitializeRequest, ReadResourceResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { randomUUID } from 'node:crypto';

const PORT = 3001;

/**
 * Type alias for a note object.
 */
type Note = { title: string, content: string };

/**
 * Simple in-memory storage for notes.
 * In a real implementation, this would likely be backed by a database.
 */
const notes: { [id: string]: Note } = {
  "1": { title: "First Note", content: "This is note 1" },
  "2": { title: "Second Note", content: "This is note 2" }
};

/**
 * Create an MCP server with capabilities for resources (to list/read notes),
 * tools (to create new notes), and prompts (to summarize notes).
 */
const server = new McpServer(
  {
    name: "mcp-note-server",
    version: "0.1.0",
  },
  {
    capabilities: {
      resources: {},
      tools: {},
      prompts: {},
      logging: {}
    },
  }
);

/**
 * Handler for listing available notes as resources.
 * Each note is exposed as a resource with:
 * - A note:// URI scheme
 * - Plain text MIME type
 * - Human readable name and description (now including the note title)
 */

server.resource(
  "notes-resource",
  new ResourceTemplate("note://{id}", { list: undefined }),
  async (uri, { id }): Promise<ReadResourceResult> => {

    const note = notes[id as string];

    if (!note) {
      throw new Error(`Note ${id} not found`);
    }

    return {
      contents: [{
        uri: uri.href,
        mimeType: "text/plain",
        text: note.content
      }]
    };

  }
);

/**
 * Handler that lists available tools.
 * Exposes a single "create_note" tool that lets clients create new notes.
 */
server.tool(
  'create_note',
  'Create a new note',
  {
    title: z.string().describe('Title of the note'),
    content: z.string().describe('Text content of the note'),
  },
  async ({ title, content }, { sendNotification }): Promise<CallToolResult> => {

    await sendNotification({
      method: "notifications/message",
      params: { level: "debug", data: `Starting create_note for ${title}` }
    });

    /**
     * Handler for the create_note tool.
     * Creates a new note with the provided title and content, and returns success message.
     */

    if (!title || !content) {
      throw new Error("Title and content are required");
    }

    const id = String(Object.keys(notes).length + 1);
    notes[id] = { title, content };

    return {
      content: [{
        type: "text",
        text: `Created note ${id}: ${title}`
      }]
    };

  }
);

server.tool(
  'list_notes',
  'Get all the notes',
  {
  },
  async (): Promise<CallToolResult> => {
    return {
      content: Object.entries(notes).map(([id, note]) => ({
        type: "text",
        text: `id:${id}, title:${note.title}, content:${note.content}`
      }))
    };
  }
);

/**
 * Handler that lists available prompts.
 * Exposes a single "summarize_notes" prompt that summarizes all notes.
 */
server.prompt(
  'summarize_notes',
  'Summarize all notes',
  {
  },
  async (): Promise<GetPromptResult> => {
    /**
     * Handler for the summarize_notes prompt.
     * Returns a prompt that requests summarization of all notes, with the notes' contents embedded as resources.
     */
    const embeddedNotes = Object.entries(notes).map(([id, note]) => ({
      type: "resource" as const,
      resource: {
        uri: `note:///${id}`,
        mimeType: "text/plain",
        text: note.content
      }
    }));

    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: "Please summarize the following notes:"
          }
        },
        ...embeddedNotes.map(note => ({
          role: "user" as const,
          content: note
        })),
        {
          role: "user",
          content: {
            type: "text",
            text: "Provide a concise summary of all the notes above."
          }
        }
      ]
    };

  }
);


const app = express();
app.use(express.json());
const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};

async function main() {

  app.post('/mcp', async (req: Request, res: Response) => {
    console.log('Received MCP request:', req.body);
    try {
      const sessionId = req.headers['mcp-session-id'] as string | undefined;
      let transport: StreamableHTTPServerTransport;
      if (sessionId && transports[sessionId]) {
        // Reuse existing transport
        transport = transports[sessionId];
      } else if (!sessionId && isInitializeRequest(req.body)) {

        // const eventStore = new InMemoryEventStore();
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          // eventStore, // Enable resumability
          onsessioninitialized: (sessionId) => {
            // Store the transport by session ID when session is initialized
            // This avoids race conditions where requests might come in before the session is stored
            console.log(`Session initialized with ID: ${sessionId}`);
            transports[sessionId] = transport;
          }
        });

        // Set up onclose handler to clean up transport when closed
        transport.onclose = () => {
          const sid = transport.sessionId;
          if (sid && transports[sid]) {
            console.log(`Transport closed for session ${sid}, removing from transports map`);
            delete transports[sid];
          }
        };
        // Connect the transport to the MCP server BEFORE handling the request
        // so responses can flow back through the same transport
        await server.connect(transport);

      }
      else {
        // Invalid request - no session ID or not initialization request
        res.status(400).json({
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: 'Bad Request: No valid session ID provided',
          },
          id: null,
        });
        return;
      }
      // Handle the request with existing transport - no need to reconnect
      // The existing transport is already connected to the server
      await transport.handleRequest(req, res, req.body);

    } catch (error: any) {
      console.error('Error handling MCP request:', error);
      if (!res.headersSent) {
        res.status(500).send('Internal server error ' + error.message);
      }
    }
  });

  app.get('/mcp', async (req: Request, res: Response) => {

    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    if (!sessionId || !transports[sessionId]) {
      res.status(400).send('Invalid or missing session ID');
      return;
    }
    // Check for Last-Event-ID header for resumability
    // const lastEventId = req.headers['last-event-id'] as string | undefined;
    // if (lastEventId) {
    //   console.log(`Client reconnecting with Last-Event-ID: ${lastEventId}`);
    // } else {
    //   console.log(`Establishing new SSE stream for session ${sessionId}`);
    // }
    const transport = transports[sessionId];
    await transport.handleRequest(req, res);

  });

  // Handle DELETE requests for session termination (according to MCP spec)
  app.delete('/mcp', async (req: Request, res: Response) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    if (!sessionId || !transports[sessionId]) {
      res.status(400).send('Invalid or missing session ID');
      return;
    }

    console.log(`Received session termination request for session ${sessionId}`);

    try {
      const transport = transports[sessionId];
      await transport.handleRequest(req, res);
    } catch (error) {
      console.error('Error handling session termination:', error);
      if (!res.headersSent) {
        res.status(500).send('Error processing session termination');
      }
    }
  });


  app.listen(PORT, () => {
    console.log(`MCP Streamable HTTP Server listening on port ${PORT}`);
  });

}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});


// Handle server shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down server...');

  // Close all active transports to properly clean up resources
  for (const sessionId in transports) {
    try {
      console.log(`Closing transport for session ${sessionId}`);
      await transports[sessionId].close();
      delete transports[sessionId];
    } catch (error) {
      console.error(`Error closing transport for session ${sessionId}:`, error);
    }
  }
  await server.close();
  console.log('Server shutdown complete');
  process.exit(0);
});