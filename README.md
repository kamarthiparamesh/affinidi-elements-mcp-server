# MCP Server – Affinidi Elements API

A **Model Context Protocol (MCP)** streamable HTTP server to interact with the **Affinidi Elements API** using the **Affinidi TDK**.

This TypeScript-based server showcases how to build a simple note system while demonstrating core MCP concepts such as:

- **Resources**: Represent text notes with URIs and metadata
- **Tools**: Enable interaction like creating or listing data
- **Prompts**: Support dynamic generation such as note summaries

---

## 🚀 Features

### 🛠️ Tools

- `list_project` – Retrieve the list of projects created in Affinidi
- `list_login_configurations` – Get all login configurations within a project
- `vc_issuance_event_ticket` – Issue a Verifiable Credential (VC) for an event ticket

---

## 🧑‍💻 Development

### 1. Install dependencies

```bash
npm install
```

### 2. Run the server

```bash
npm run dev
```

## 💬 Chat App Integration

The accompanying Chat App connects to this MCP server and interacts with tools dynamically—enabling users to perform actions like listing projects or issuing credentials through natural language input.

Repo to this [https://github.com/kamarthiparamesh/affinidi-ai-chat-bot](https://github.com/kamarthiparamesh/affinidi-ai-chat-bot)

## TODO

1. Convert OpenAPI spec to Tools, so that all APIs will be converted to tool definitions

## Test with sample MCP client

1. Run the MCP server in a new terminal

```
npm run dev
```

2. Run the MCP client in a new terminal

```
npm run test
```

Sample Output

```
affinidi-elements-mcp-server % npm run test

> mcp-elements-server@0.1.0 test
> npx tsx src/affinidi-test-client.ts

MCP Interactive Client
=====================
Connecting to http://localhost:3002/mcp...
Transport created with session ID: 92ba5c09-ccfc-4218-bb1a-de32ca6728b5
Connected to MCP server

Available commands:
  connect [url]              - Connect to MCP server (default: http://localhost:3000/mcp)
  disconnect                 - Disconnect from server
  terminate-session          - Terminate the current session
  reconnect                  - Reconnect to the server
  list-tools                 - List available tools
  call-tool <name> [args]    - Call a tool with optional JSON arguments
  list-project <uat>  - Call the list projects tool by passing user access token
  list-login-config <pst>  - Call the list projects tool by passing project scope token
  list-prompts               - List available prompts
  get-prompt [name] [args]   - Get a prompt with optional JSON arguments
  list-resources             - List available resources
  read-resource [id]         - Read resource
  help                       - Show this help
  quit                       - Exit the program

> list-tools
Available tools:
  - list_project: Get the list of projects created in affinidi
  - list_login_configurations: List all the Login Configurations in the default Project
  - vc_issuance_event_ticket: Issue a verifiable credential (VC) for an event ticket. Use this tool when a user requests a ticket or VC for an event (e.g., "I want a ticket VC for Tech Event in Bangalore tomorrow"). On success, it returns a VC offer URL for the user to claim the ticket.

> list-project <YOUR USER ACCESS TOKEN>
Calling tool 'list_project' with args: {
  apiKey: 'eyJh...'
}
Tool result:
  List of projects => [{"id":"0be8df01-6099-4e1e-bcb6-2dc3562d72fd","name":"Test Project","description":"","createdAt":"2024-07-16T12:07:07.805Z","updatedAt":"2024-07-16T12:07:07.805Z","ownerId":"user/349f037d-c10c-4e81-a168-1222333"}]

> list-login-config <YOUR PROJECT SCOPE TOKEN>
Calling tool 'list_login_configurations' with args: {
  apiKey: 'ey....'
}
Tool result:
  List of Login Configurations => [{"ari":"ari:identity:ap-southeast-1:801a212a-90b1-4463-bfb3-5235181d477d:login_configuration/3b1433f3-1886-4a34-9072-7130ef3c3fbb","projectId":"801a212a-90b1-4463-bfb3-5235181d477d","configurationId":"3b1433f3-1886-4a34-9072-7130ef3c3fbb","name":"Eventi","redirectUris":["http://localhost:3000/api/auth/callback/affinidi"],"auth":{"clientId":"5619f48e-bca8-4529-ace3-96ebaafc2f04","issuer":"https://801a212a-90b1-4463-bfb3-5235181d477d.apse1.login.affinidi.io"},"tokenEndpointAuthMethod":"client_secret_post","description":"description#733123","createdAt":"2024-09-17T10:17:08.755Z","modifiedAt":"2024-09-17T10:17:08.755Z","createdBy":"user/349f037d-c10c-4e81-a168-f1b273c287e3","modifiedBy":"user/349f037d-c10c-4e81-a168-f1b273c287e3","creationDate":"2024-09-17T10:17:09Z","failOnMappingConflict":true,"clientMetadata":{"name":"Eventi","logo":"https://login.affinidi.com/default-client-logo.svg","domainVerified":false,"origin":"http://localhost:3000"}}]

> isssue-event-vc <YOUR PROJECT SCOPE TOKEN> <YOUR PROJECT ID>
Calling tool 'vc_issuance_event_ticket' with args: {
  apiKey: 'eyJ0eX...',
  project_id: '801a212a-90b1-4463-bfb3-5235181d477d',
  given_name: 'paramesh',
  last_name: 'kamarthi',
  email: 'paramesh@affinidi.com',
  event_name: 'MCP Event',
  location: 'Banglore',
  ticket_type: 'regular',
  event_date: '2025-10-01'
}
Tool result:
  **Event ticket VC offer ready to claim!**
  Click the link below and enter the transaction code to complete the process:
  🔗 [Claim your Event Ticket VC](https://vault.affinidi.com/claim?credential_offer_uri=https://801a212a-90b1-4463-bfb3-5235181d477d.apse1.issuance.affinidi.io/offers/d620285d-a993-4ae5-a969-c3861ecbd414)
  🔒 **Transaction Code:** `539848`

```
