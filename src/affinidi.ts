import express, { Request, Response } from 'express';
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CallToolResult, GetPromptResult, isInitializeRequest, ReadResourceResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { randomUUID } from 'node:crypto';
import { listProjects } from './libs/iam-client.js';
import { listLoginConfigurations } from './libs/login-config-client.js';
import { startIssuance } from './libs/credential-issuance.js';
import { StartIssuanceInput, StartIssuanceInputClaimModeEnum } from '@affinidi-tdk/credential-issuance-client';

const PORT = 3002;

const server = new McpServer(
    {
        name: "mcp-affinidi-elements-server",
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

server.tool(
    'list_project',
    'Get the list of projects created in affinidi',
    {
        apiKey: z.string().describe('API key'),
        limit: z.number().optional().describe('Maximum number of projects to fetch in a list, Default value : 100').default(10),
        exclusiveStartKey: z.string().optional().describe('The base64url encoded key of the first item that this operation will evaluate (it is not returned). Use the value that was returned in the previous operation.'),
    },
    async (params, { sendNotification }): Promise<CallToolResult> => {
        try {
            const projects = await listProjects(params)

            return {
                content: [{
                    type: "text",
                    name: "result",
                    text: `List of projects => ${JSON.stringify(projects)}`
                }]
            };
        } catch (error: any) {
            return {
                content: [{
                    type: "text",
                    name: "error",
                    text: `Error while fetching projects ${error.message}`
                }]
            };
        }
    }
);

server.tool(
    'list_login_configurations',
    'List all the Login Configurations in the Project',
    {
        apiKey: z.string().describe('API key'),
        limit: z.number().optional().describe('Maximum number of projects to fetch in a list, Default value : 100').default(10),
        exclusiveStartKey: z.string().optional().describe('The base64url encoded key of the first item that this operation will evaluate (it is not returned). Use the value that was returned in the previous operation.'),
    },
    async (params, { sendNotification }): Promise<CallToolResult> => {
        try {
            const loginConfigs = await listLoginConfigurations(params)

            const strippedLoginConfigs = loginConfigs.map(config => {
                const { idTokenMapping, presentationDefinition, ...rest } = config;
                return rest;
            });

            return {
                content: [{
                    type: "text",
                    name: "result",
                    text: `List of Login Configurations => ${JSON.stringify(strippedLoginConfigs)}`
                }]
            };
        } catch (error: any) {
            return {
                content: [{
                    type: "text",
                    name: "error",
                    text: `Error while fetching login configurations ${error.message}`
                }]
            };
        }

    }
);

server.tool(
    'vc_issuance_event_ticket',
    'Issue a verifiable credential (VC) for an event ticket. Use this tool when a user requests a ticket or VC for an event (e.g., "I want a ticket VC for Tech Event in Bangalore tomorrow"). On success, it returns a VC offer URL for the user to claim the ticket.',
    {
        apiKey: z.string().describe('API key'),
        project_id: z.string().describe('Project id under which it should use issuance config for issuing a verifiable credential(VC)'),
        given_name: z.string().describe('first/given Name of the customer who is purchasing the event ticket'),
        last_name: z.string().describe('last/family Name of the customer who is purchasing the event ticket'),
        email: z.string().describe('Email of the customer who is purchasing the event ticket'),
        event_name: z.string().describe('Name of event for which ticket should be purchased'),
        location: z.string().describe('Event Location of the event where its happening'),
        ticket_type: z.string().optional().describe('ticket type premium or regular'),
        event_date: z.string().describe('Event date when it is happening'),
    },
    async (params, { sendNotification }): Promise<CallToolResult> => {
        try {

            const ticketCredentailData = {
                event: {
                    eventId: "event1234",
                    name: params.event_name,
                    location: params.location,
                    startDate: params.event_date + "T00:00:00Z",
                    endDate: params.event_date + "T23:59:59Z",
                },
                ticket: {
                    ticketId: randomUUID(),
                    ticketType: params.ticket_type || "premium",
                    seat: "1B",
                },
                createdAt: new Date(),
                attendeeAtrributes: {
                    email: params.email,
                    firstName: params.given_name,
                    lastName: params.last_name,
                    dateOfBirth: "2010-10-17",
                },
                secrete: "Secrete for event entrance(use for QR code)",
            };

            //Prepare the data for issuance
            const apiData: StartIssuanceInput = {
                claimMode: StartIssuanceInputClaimModeEnum.TxCode,
                data: [
                    {
                        credentialTypeId: "EventTicketVC",
                        credentialData: {
                            ...ticketCredentailData,
                        },
                        statusListDetails: [
                            {
                                purpose: "REVOCABLE",
                                standard: "RevocationList2020",
                            },
                        ],
                    },
                ],
            };

            const vcOffer = await startIssuance(params.apiKey, params.project_id, apiData);

            console.log("vcOffer", vcOffer);

            const claimURL = `https://vault.affinidi.com/claim?credential_offer_uri=${vcOffer.credentialOfferUri}`

            return {
                content: [{
                    type: "text",
                    name: "result",
                    text: `**Event ticket VC offer ready to claim!**  
                        Click the link below and enter the transaction code to complete the process:
                        🔗 [Claim your Event Ticket VC](${claimURL})
                        🔒 **Transaction Code:** \`${vcOffer.txCode}\`
                        `
                }]
            };
        } catch (error: any) {
            console.log("Error while issuing event ticket VC", error);
            return {
                content: [{
                    type: "text",
                    name: "error",
                    text: `Error while creating event ticket vc ${error.message}`
                }]
            };
        }

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