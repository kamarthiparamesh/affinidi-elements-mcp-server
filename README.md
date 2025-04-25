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
