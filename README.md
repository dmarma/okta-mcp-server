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

### Application Manager
| Tool | Description |
|------|-------------|
| `create_application` | Create OIDC applications (web, SPA, native, service) with auto-configuration |
| `list_all_applications` | List all applications with filtering, search, and pagination |

### Group Manager
| Tool | Description |
|------|-------------|
| `list_groups` | List groups with search, filtering, and pagination |
| `assign_application_to_group` | Assign applications to groups with priority settings |

### User Manager
| Tool | Description |
|------|-------------|
| `list_users` | List users with advanced filtering, search, and activity insights |
| `create_user` | Create new users with comprehensive profile setup and validation |
| `get_user` | Get detailed user information with activity insights and status |
| `update_user` | Update user profiles with change tracking and validation |
| `activate_user` | Activate user accounts with optional email notifications |
| `deactivate_user` | Deactivate user accounts with status validation |

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

### User Management

**"List all active users in my Okta org"**

**"Create a new user for john.doe@company.com with first name John and last name Doe"**

**"Get details for user john.doe@company.com including their activity status"**

**"Update user profile for jane.smith@company.com to change her department to Marketing"**

**"Activate the user account for new.employee@company.com and send welcome email"**

**"Deactivate user account for former.employee@company.com"**

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
