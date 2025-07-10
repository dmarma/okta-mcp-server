#!/usr/bin/env node

import dotenv from "dotenv";
import express from "express";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { discoverTools } from "./lib/tools.js";

import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, ".env") });

const SERVER_NAME = "okta-mcp-server";

// CLI argument parsing
const args = process.argv.slice(2);
const isSSE = args.includes("--sse");
const runCommand = args.includes("run");
const toolsFilter = args.includes("--tools") ? args[args.indexOf("--tools") + 1] : "*";

// Handle help command
if (args.includes("--help") || args.includes("-h")) {
  console.log(`
Okta MCP Server

Usage:
  okta-mcp-server [run] [options]

Commands:
  run                 Start the MCP server (default if no command specified)

Options:
  --sse              Start in SSE mode instead of stdio
  --tools <filter>   Tool filter pattern (default: "*" for all tools)
  --help, -h         Show this help message

Environment Variables:
  OKTA_DOMAIN    Your Okta domain (e.g., dev-123456.okta.com)
  OKTA_API_KEY   Your Okta API token

Examples:
  okta-mcp-server
  okta-mcp-server run --sse
  okta-mcp-server run --tools "*"
`);
  process.exit(0);
}

async function transformTools(tools) {
  const transformed = tools
    .map((tool) => {
      const definitionFunction = tool.definition?.function;
      if (!definitionFunction) {
        console.log('[MCP] Skipping tool without function definition');
        return;
      }
      console.log(`[MCP] Transforming tool: ${definitionFunction.name}`);
      console.log(`[MCP] Tool parameters:`, JSON.stringify(definitionFunction.parameters, null, 2));
      const transformedTool = {
        name: definitionFunction.name,
        description: definitionFunction.description,
        inputSchema: definitionFunction.parameters,
      };
      console.log(`[MCP] Transformed tool:`, JSON.stringify(transformedTool, null, 2));
      return transformedTool;
    })
    .filter(Boolean);
  
  console.log('[MCP] Available tools after transform:', transformed.map(t => t.name));
  return transformed;
}

async function setupServerHandlers(server, tools) {
  console.log('[MCP] Setting up server handlers with tools:', tools.map(t => t.definition?.function?.name));
  
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    console.log('[MCP] Listing available tools:', tools.map(t => t.definition?.function?.name));
    return {
      tools: await transformTools(tools),
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    console.log('[MCP] Received tool call request:', JSON.stringify(request, null, 2));
    
    const toolName = request.params.name;
    console.log(`[MCP] Looking for tool: ${toolName}`);
    
    const tool = tools.find((t) => t.definition?.function?.name === toolName);
    if (!tool) {
      console.error(`[MCP] Tool not found: ${toolName}. Available tools:`, tools.map(t => t.definition?.function?.name));
      throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${toolName}`);
    }

    const args = request.params.arguments || {};
    console.log(`[MCP] Tool found: ${toolName}, executing with args:`, args);

    const requiredParameters = tool.definition?.function?.parameters?.required || [];
    for (const requiredParameter of requiredParameters) {
      if (!(requiredParameter in args)) {
        console.error(`[MCP] Missing required parameter: ${requiredParameter}`);
        throw new McpError(
          ErrorCode.InvalidParams,
          `Missing required parameter: ${requiredParameter}`
        );
      }
    }

    try {
      console.log(`[MCP] Executing ${toolName}`);
      const result = await tool.function(args);
      console.log(`[MCP] ${toolName} execution completed with result:`, result);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      console.error(`[MCP] Error executing ${toolName}:`, error);
      throw new McpError(
        ErrorCode.InternalError,
        `API error: ${error.message}`
      );
    }
  });
}

async function run() {
  console.log('[MCP] Starting server in', isSSE ? 'SSE' : 'stdio', 'mode');
  
  const tools = await discoverTools();
  console.log('[MCP] Loaded tools:', tools.map(t => t.definition?.function?.name));

  if (isSSE) {
    const app = express();
    const transports = {};
    const servers = {};

    // Add body-parser middleware
    app.use(express.json());

    // Add CORS middleware
    app.use((req, res, next) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      
      // Handle preflight requests
      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
        return;
      }
      next();
    });

    app.get("/sse", async (req, res) => {
      // Create a new Server instance for each session
      const server = new Server(
        {
          name: SERVER_NAME,
          version: "0.1.0",
        },
        {
          capabilities: {
            tools: {},
          },
        }
      );
      server.onerror = (error) => {
        console.error("[Error]", error);
        transport?.send({ type: 'error', error: error.message });
      };
      await setupServerHandlers(server, tools);

      const transport = new SSEServerTransport("/messages", res);
      const sessionId = transport.sessionId;
      console.log(`[SSE] New connection established: ${sessionId}`);

      transports[sessionId] = transport;
      servers[sessionId] = server;

      res.on("close", async () => {
        console.log(`[SSE] Client disconnected: ${sessionId}`);
        delete transports[sessionId];
        await server.close();
        delete servers[sessionId];
      });

      // Connect first
      await server.connect(transport);
      
      // Then send connection confirmation
      transport.send({ 
        type: 'connection', 
        sessionId,
        server: {
          name: SERVER_NAME,
          version: "0.1.0"
        }
      });
    });

    app.post("/messages", async (req, res) => {
      const sessionId = req.query.sessionId;
      console.log(`[SSE] Received message for session: ${sessionId}`);
      
      const transport = transports[sessionId];
      const server = servers[sessionId];

      if (!transport || !server) {
        console.warn(`[SSE] No transport/server found for session: ${sessionId}`);
        return res.status(400).json({ 
          jsonrpc: "2.0",
          error: {
            code: -32602,
            message: "Invalid session",
            data: "No transport/server found for sessionId"
          },
          id: req.body?.id || null
        });
      }

      try {
        // Create a response wrapper that implements all required methods
        const responseWrapper = {
          writeHead: (statusCode, headers) => {
            res.status(statusCode);
            if (headers) {
              Object.entries(headers).forEach(([key, value]) => {
                res.setHeader(key, value);
              });
            }
            return responseWrapper;
          },
          end: (data) => {
            if (data === 'Accepted') {
              // Convert "Accepted" to proper JSON-RPC response
              res.json({
                jsonrpc: "2.0",
                result: { status: "accepted" },
                id: req.body?.id || null
              });
            } else if (data) {
              res.send(data);
            } else {
              res.end();
            }
          },
          write: (data) => {
            res.write(data);
          }
        };

        // Handle the message with the wrapper
        await transport.handlePostMessage(req, responseWrapper, req.body);
      } catch (error) {
        console.error(`[SSE] Error handling message:`, error);
        if (!res.headersSent) {
          res.status(500).json({ 
            jsonrpc: "2.0",
            error: {
              code: -32000,
              message: "Internal server error",
              data: error.message
            },
            id: req.body?.id || null
          });
        }
      }
    });

    const port = process.env.PORT || 3001;
    app.listen(port, () => {
      console.log(`[SSE Server] running on port ${port}`);
    });
  } else {
    // stdio mode: single server instance
    const server = new Server(
      {
        name: SERVER_NAME,
        version: "0.1.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );
    server.onerror = (error) => console.error("[Error]", error);
    await setupServerHandlers(server, tools);

    process.on("SIGINT", async () => {
      await server.close();
      process.exit(0);
    });

    const transport = new StdioServerTransport();
    await server.connect(transport);
  }
}

run().catch(console.error);