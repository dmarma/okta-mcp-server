# Okta MCP Server Tests

This directory contains various test tools and utilities for testing the Okta MCP Server.

## UI Tests

### SSE Test Client (`ui/test-sse.html`)

A simple web-based client for testing the Server-Sent Events (SSE) mode of the MCP server.

#### Setup and Usage

1. Start the MCP server in SSE mode:
   ```bash
   node mcpServer.js --sse
   ```

2. Serve the test page (choose one method):
   ```bash
   # Using npx http-server
   npx http-server -p 8080
   
   # Or using Python's built-in server
   python -m http.server 8080
   ```

3. Open the test page in your browser:
   - Navigate to: `http://localhost:8080/test/ui/test-sse.html`

#### Available Test Operations

1. **Connection Management**:
   - Click "Connect SSE" to establish SSE connection
   - Connection status is shown at the top
   - Use "Clear Output" to clear the message log

2. **Okta API Operations**:
   - List Applications: Get all applications in your Okta org
   - Create Test Application: Create a new test application
   - Retrieve Application: Get details of a specific application (requires App ID)
   - Delete Application: Remove a specific application (requires App ID)

3. **Output**:
   - All API responses and events are shown in the output section
   - Timestamps are added to each message
   - Messages are shown in chronological order (newest first)

## Environment Setup

Make sure you have set up your environment variables in `.env`:
```
OKTA_DOMAIN=your-org.okta.com
OKTA_API_KEY=your-api-key
``` 