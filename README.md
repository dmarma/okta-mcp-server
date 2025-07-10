# Okta MCP Server

A Model Context Protocol (MCP) server for managing Okta applications, users, and groups. This server provides tools to interact with Okta's management APIs through the MCP protocol.

## Features

- **Application Management**: Create and manage OIDC applications (native, web, SPA, service)
- **Group Management**: List groups and assign applications to groups
- **User Management**: Manage user assignments and group memberships
- **Multiple App Types**: Support for all Okta application types with proper OAuth configurations
- **🔐 Three-Tier Security**: Automatic fallback from keychain → file → environment variables
- **🛡️ Universal Compatibility**: Works on any system with graceful security degradation
- **🔒 Zero-Config MCP**: No credentials needed in mcp.json configuration

## Installation & Setup

### Step 1: Install & Initialize

```bash
# Install globally
npm install -g @indranilokg/okta-mcp-server

# Or use with npx (no installation needed)
npx oktamcp init
```

### Step 2: Authenticate with Okta

```bash
# Interactive setup (recommended)
oktamcp init

# Follow the prompts:
# - Enter your Okta domain (e.g., dev-123456.okta.com)
# - Enter your Okta API token
# - Credentials are validated and stored securely
```

### Step 3: Getting Your Okta API Token

1. Log in to your Okta Admin console
2. Go to **Security** > **API** > **Tokens**
3. Click **Create Token**
4. Give it a name (e.g., "MCP Server Token")
5. Click **Create Token**
6. Copy the token value (you won't be able to see it again!)

### Step 4: Verify Setup

```bash
# Check your authentication status
oktamcp session

# Test the server
oktamcp run
```

## Usage

### With Cursor IDE

After running `oktamcp init`, add this to your `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "okta-admin": {
      "command": "npx",
      "args": ["-y", "oktamcp", "run"]
    }
  }
}
```

**No credentials needed in mcp.json!** 🔒 Credentials are stored securely and loaded automatically.

### Command Line Options

```bash
# Initial setup (interactive)
oktamcp init

# Start in stdio mode (default)
oktamcp run

# Start in SSE mode for web interfaces
oktamcp run --sse

# Check authentication status
oktamcp session

# Clear stored credentials
oktamcp logout

# Show help
oktamcp --help
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

## 🔒 Security

The Okta MCP Server prioritizes security with enterprise-grade credential management using a three-tier approach:

### **Three-Tier Security Model**
1. **🔑 Keychain (Preferred)**: OS-level encrypted credential store
   - **macOS**: Keychain Access (encrypted with your login keychain)
   - **Windows**: Windows Credential Manager (encrypted with DPAPI)
   - **Linux**: libsecret/keyring (encrypted with login credentials)

2. **📁 Secure File (Fallback)**: File with restricted permissions
   - **Location**: `~/.okta-mcp/config.json`
   - **Permissions**: 0o600 (owner read/write only)
   - **Hidden directory**: Starts with `.` to hide from casual browsing

3. **🌍 Environment Variables (Last Resort)**: Always available but least secure
   - **OKTA_DOMAIN** and **OKTA_API_KEY**
   - Used when keychain and file storage fail

### **Automatic Fallback Chain**
The server automatically tries storage methods in order of security:
```
Keychain → Secure File → Environment Variables
```
- **Zero Configuration**: No manual selection needed
- **Cross-Platform**: Works on all systems regardless of keychain availability
- **Graceful Degradation**: Always finds a working storage method

### **Auth0-Style Experience**
Similar to Auth0 MCP Server:
- ✅ **Clean Configuration**: No credentials in `mcp.json`
- ✅ **Session Management**: `init`, `session`, `logout` commands  
- ✅ **Automatic Validation**: Credentials tested during setup
- ✅ **Fallback Support**: Environment variables as backup

### **Security Commands**
```bash
# Secure setup (stores in keychain)
oktamcp init

# Check session and credential validity
oktamcp session

# Securely clear credentials from keychain
oktamcp logout
```

### **Credential Flow**
1. **Setup**: `oktamcp init` → Tries keychain first, falls back to secure file
2. **Runtime**: Server automatically retrieves using fallback chain (keychain → file → env)
3. **Cleanup**: `oktamcp logout` → Clears from all storage locations

### **Storage Location Examples**
- **Keychain**: OS credential store (invisible to user)
- **File**: `~/.okta-mcp/config.json` (permissions: 600, hidden directory)
- **Environment**: `OKTA_DOMAIN` and `OKTA_API_KEY` variables

**Automatic Behavior**: The server intelligently chooses the most secure available method and provides clear feedback about which storage is being used.

## License

MIT

## Contributing

Please read our contributing guidelines and submit pull requests to help improve this project.
