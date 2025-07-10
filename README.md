# Okta MCP Server

A Model Context Protocol (MCP) server for managing Okta applications, users, and groups. This server provides tools to interact with Okta's management APIs through the MCP protocol.

## Features

- **Application Management**: Create and manage OIDC applications (native, web, SPA, service)
- **Group Management**: List groups and assign applications to groups
- **User Management**: Manage user assignments and group memberships
- **Multiple App Types**: Support for all Okta application types with proper OAuth configurations

## Installation

### Option 1: Use with npx (Recommended)
```bash
npx @indranilokg/okta-mcp-server run --tools "*"
```

### Option 2: Install globally
```bash
npm install -g @indranilokg/okta-mcp-server
okta-mcp-server run
```

### Option 3: Install locally
```bash
npm install @indranilokg/okta-mcp-server
npx okta-mcp-server run
```

## Configuration

### Environment Variables

You need to set the following environment variables:

```bash
export OKTA_DOMAIN="your-domain.okta.com"
export OKTA_API_KEY="your-api-token"
```

Or create a `.env` file:
```
OKTA_DOMAIN=your-domain.okta.com
OKTA_API_KEY=your-api-token
```

### Getting Your Okta API Token

1. Log in to your Okta Admin console
2. Go to **Security** > **API** > **Tokens**
3. Click **Create Token**
4. Give it a name and click **Create Token**
5. Copy the token value (you won't be able to see it again)

## Usage

### With Cursor IDE

Add this to your `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "okta-admin": {
      "command": "npx",
      "args": [
        "-y",
        "@indranilokg/okta-mcp-server",
        "run",
        "--tools",
        "*"
      ],
      "env": {
        "OKTA_DOMAIN": "your-domain.okta.com",
        "OKTA_API_KEY": "your-api-token"
      }
    }
  }
}
```

### Command Line Options

```bash
# Start in stdio mode (default)
okta-mcp-server run

# Start in SSE mode for web interfaces
okta-mcp-server run --sse

# Filter tools (currently supports "*" for all)
okta-mcp-server run --tools "*"

# Show help
okta-mcp-server --help
```

## Available Tools

- `create_application` - Create OIDC applications (native, web, SPA, service)
- `list_all_applications` - List all applications in your Okta org
- `list_groups` - List groups in your Okta org  
- `assign_application_to_group` - Assign an application to a group

## Examples

### Create a Web Application
```javascript
{
  "name": "oidc_client",
  "label": "My Web App",
  "signOnMode": "OPENID_CONNECT", 
  "applicationType": "web",
  "redirectUris": ["https://localhost:3000/callback"],
  "postLogoutRedirectUris": ["https://localhost:3000"]
}
```

### Create a Native Mobile App
```javascript
{
  "name": "oidc_client",
  "label": "My Mobile App",
  "signOnMode": "OPENID_CONNECT",
  "applicationType": "native", 
  "redirectUris": ["com.example.app://callback"]
}
```

### Assign App to All Users
```javascript
// First create the app, then assign to Everyone group
{
  "appId": "0oa...",
  "groupId": "00g1rsjefyoO9VfxX1d7" // Everyone group
}
```

## Development

### Local Development
```bash
git clone https://github.com/indranilokg/okta-mcp-server.git
cd okta-mcp-server
npm install
npm start
```

### Testing with SSE
```bash
npm run start:sse
# Server will be available at http://localhost:3000/sse
```

## License

MIT

## Contributing

Please read our contributing guidelines and submit pull requests to help improve this project.
