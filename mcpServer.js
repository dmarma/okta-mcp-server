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
import { 
  storeCredentials, 
  getCredentials, 
  getSessionInfo, 
  clearCredentials, 
  validateCredentials,
  isKeychainAvailable,
  getStorageInfo
} from "./lib/credentials.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, ".env") });

const SERVER_NAME = "okta-mcp-server";

// CLI argument parsing
const args = process.argv.slice(2);
const isSSE = args.includes("--sse");
const runCommand = args.includes("run") || (!args.includes("init") && !args.includes("session") && !args.includes("logout"));
const toolsFilter = args.includes("--tools") ? args[args.indexOf("--tools") + 1] : "*";

// Handle different commands
if (args.includes("init")) {
  await initCommand();
  process.exit(0);
} else if (args.includes("session")) {
  await sessionCommand();
  process.exit(0);
} else if (args.includes("logout")) {
  await logoutCommand();
  process.exit(0);
} else if (args.includes("--help") || args.includes("-h")) {
  console.log(`
Okta MCP Server

Usage:
  oktamcp <command> [options]

Commands:
  init               Initialize authentication with Okta
  run                Start the MCP server (default)
  session            Show current authentication status
  logout             Clear stored credentials

Options:
  --sse              Start in SSE mode instead of stdio
  --tools <filter>   Tool filter pattern (default: "*" for all tools)
  --help, -h         Show this help message

Setup:
  1. Run 'oktamcp init' to authenticate
  2. Add to your mcp.json without any credentials:
     {
       "mcpServers": {
         "okta-admin": {
           "command": "npx",
           "args": ["-y", "oktamcp", "run"]
         }
       }
     }

Examples:
  oktamcp init
  oktamcp run
  oktamcp session
  oktamcp logout
`);
  process.exit(0);
}

// Initialize authentication
async function initCommand() {
  console.log('🔐 Okta MCP Server Authentication Setup\n');
  
  // Check available storage methods
  const storageInfo = await getStorageInfo();
  console.log('📋 Available credential storage methods:');
  console.log(`   🔑 Keychain: ${storageInfo.keychain ? '✅ Available' : '❌ Not available'}`);
  console.log(`   📁 File: ${storageInfo.file ? '✅ Available' : '❌ Not available'}`);
  console.log(`   🌍 Environment: ${storageInfo.environment ? '✅ Available' : '❌ Not available'}`);
  console.log(`\n🎯 Will use: ${storageInfo.preferred} storage\n`);
  
  // Check for existing credentials
  const existingCredentials = await getCredentials();
  if (existingCredentials) {
    console.log('📋 Found existing credentials for:', existingCredentials.domain);
    process.stdout.write('Do you want to update them? (y/N): ');
    const answer = await getUserInput();
    if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
      console.log('✨ Using existing credentials. Run: okta-mcp-server run');
      return;
    }
  }
  
  // Prompt for Okta domain
  console.log('\nPlease provide your Okta configuration:');
  process.stdout.write('Okta Domain (e.g., dev-123456.okta.com): ');
  
  const domain = await getUserInput();
  if (!domain) {
    console.error('❌ Domain is required');
    process.exit(1);
  }
  
  // Prompt for API token
  process.stdout.write('Okta API Token: ');
  const apiToken = await getUserInput();
  if (!apiToken) {
    console.error('❌ API token is required');
    process.exit(1);
  }
  
  // Test the credentials
  console.log('\n🔍 Testing credentials...');
  try {
    const response = await fetch(`https://${domain}/api/v1/apps?limit=1`, {
      headers: {
        'Authorization': `SSWS ${apiToken}`,
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    console.log('✅ Credentials validated successfully!');
    
    // Store credentials securely in keychain
    await storeCredentials(domain, apiToken);
    console.log('\n✨ Setup complete! You can now run: okta-mcp-server run');
    
  } catch (error) {
    console.error('❌ Failed to validate/store credentials:', error.message);
    process.exit(1);
  }
}

// Show session information
async function sessionCommand() {
  try {
    const sessionInfo = await getSessionInfo();
    
    if (!sessionInfo) {
      console.log('❌ No active session. Run: okta-mcp-server init');
      process.exit(1);
    }
    
    console.log('✅ Active Okta MCP Session');
    console.log(`📋 Domain: ${sessionInfo.domain}`);
    console.log(`🕐 Created: ${new Date(sessionInfo.createdAt).toLocaleString()}`);
    console.log(`📦 Version: ${sessionInfo.version}`);
    
    // Show actual storage method
    const storageDisplay = {
      'keychain': '🔑 System Keychain',
      'file': '📁 Secure File',
      'environment': '🌍 Environment Variables'
    };
    console.log(`💾 Storage: ${storageDisplay[sessionInfo.storage] || sessionInfo.storage}`);
    
    // Test if token is still valid
    console.log('\n🔍 Testing token validity...');
    const isValid = await validateCredentials();
    
    if (isValid) {
      console.log('🟢 Token Status: Valid');
    } else {
      console.log('🔴 Token Status: Invalid (run init to re-authenticate)');
    }
    
  } catch (error) {
    console.error('❌ Error checking session:', error.message);
    process.exit(1);
  }
}

// Logout and clear credentials
async function logoutCommand() {
  try {
    const hadCredentials = await clearCredentials();
    
    if (hadCredentials) {
      console.log('✅ Logged out successfully. Credentials cleared from all storage locations.');
    } else {
      console.log('ℹ️ No active session to logout from.');
    }
  } catch (error) {
    console.error('❌ Error clearing credentials:', error.message);
    process.exit(1);
  }
}

// Helper function to get user input
async function getUserInput() {
  return new Promise((resolve) => {
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    process.stdin.once('data', (data) => {
      process.stdin.pause();
      resolve(data.toString().trim());
    });
  });
}

// Load credentials from keychain or environment variables
async function loadCredentials() {
  const credentials = await getCredentials();
  
  if (!credentials) {
    console.error('❌ No credentials found. Run: okta-mcp-server init');
    process.exit(1);
  }
  
  return credentials;
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
  
  // Load credentials
  const credentials = await loadCredentials();
  console.log(`[MCP] Connected to Okta domain: ${credentials.domain}`);
  
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