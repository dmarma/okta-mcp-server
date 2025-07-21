# Okta MCP Server

[![npm version](https://badge.fury.io/js/@indranilokg%2Fokta-mcp-server.svg)](https://badge.fury.io/js/@indranilokg%2Fokta-mcp-server)
[![npm downloads](https://img.shields.io/npm/dm/@indranilokg/okta-mcp-server.svg)](https://www.npmjs.com/package/@indranilokg/okta-mcp-server)

A Model Context Protocol (MCP) server for managing Okta platform.

## Quick Start

### 1. Initialize & Configure

```bash
# Setup with your Okta credentials (interactive)
npx @indranilokg/okta-mcp-server init
```

You'll be prompted for:
- **Okta Domain**: `your-domain.okta.com` (or `.oktapreview.com`)
- **API Token**: Get from Okta Admin → Security → API → Tokens

### 2. Add to Cursor

Add to your `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "okta-admin": {
      "command": "npx", 
      "args": ["-y", "@indranilokg/okta-mcp-server", "run"]
    }
  }
}
```

### 3. Start Using

Restart Cursor and use Okta tools in your chats!

## Commands

```bash
# Initial setup
npx @indranilokg/okta-mcp-server init

# Check authentication status  
npx @indranilokg/okta-mcp-server session

# Start server (for MCP)
npx @indranilokg/okta-mcp-server run

# Clear credentials
npx @indranilokg/okta-mcp-server logout
```

## Available Tools

See [TOOLS](./TOOLS.md) for a complete, categorized list of all available tools and their descriptions.

## Usage Examples

See [EXAMPLES](./EXAMPLES.md) for practical usage examples for all major tool categories (Application, Group, User).

## Security

Credentials are stored securely using:
1. **OS Keychain** (preferred) - macOS Keychain, Windows Credential Manager, Linux keyring
2. **Secure file** (fallback) - `~/.okta-mcp/config.json` with restricted permissions  
3. **Environment variables** (last resort) - `OKTA_DOMAIN` and `OKTA_API_KEY`

## Getting Okta API Token

1. Log in to Okta Admin console
2. Go to **Security → API → Tokens**
3. Click **Create Token**
4. Name it (e.g., "MCP Server") and create
5. Copy the token immediately (you won't see it again!)

## Troubleshooting

```bash
# Check if authenticated
npx @indranilokg/okta-mcp-server session

# Re-authenticate  
npx @indranilokg/okta-mcp-server logout
npx @indranilokg/okta-mcp-server init

# Test server manually
npx @indranilokg/okta-mcp-server run
```

## License

MIT
