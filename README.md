# Okta MCP Server

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

- `create_application` - Create OIDC applications
- `list_all_applications` - List all applications
- `list_groups` - List groups  
- `assign_application_to_group` - Assign app to group

## Usage Examples

Just chat with Cursor using natural language prompts:

### Create Applications

**"Create a React SPA application running at port 3000 and assign to all Okta users"**

**"Create a web application called 'My Dashboard' with callback URL https://localhost:8080/auth/callback"**

**"Create a native mobile app for iOS with custom URL scheme com.mycompany.app://callback"**

**"Create a service application for API access called 'Backend Service'"**

### List and Manage

**"Show me all applications in my Okta org"**

**"List all groups in Okta"**

**"Assign the 'My Dashboard' application to the Marketing team group"**

**"Create a new SPA for Vue.js development and make it available to everyone"**

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
