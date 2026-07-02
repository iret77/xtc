#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerTools } from "./tools.js";

const server = new McpServer({
  name: "climbx-mcp",
  version: "0.3.0",
});

registerTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);

// stdout belongs to the MCP protocol; log to stderr only.
console.error("climbx-mcp running on stdio");
