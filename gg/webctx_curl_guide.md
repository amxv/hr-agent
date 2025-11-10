⏺ webctx MCP Server - REST API Usage

  Base URL: https://webctx.vercel.app/mcp?apiKey=$WEBCTX_API_KEY

  Required Headers:
  - Content-Type: application/json
  - Accept: application/json, text/event-stream

  Response Format: Server-Sent Events (SSE) with event: message and data: {...}

  ---
  1. search

  Parameters:
  - query (required) - Search query string
  - excludeDomains (optional) - Array of domains to exclude
  - includeKeyword (optional) - Specific keyword to filter results

  curl -X POST "https://webctx.vercel.app/mcp?apiKey=$WEBCTX_API_KEY" \
    -H "Content-Type: application/json" \
    -H "Accept: application/json, text/event-stream" \
    -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"search","arguments":{"query":"nextjs 15 features"}}}'

  With optional parameters:
  curl -X POST "https://webctx.vercel.app/mcp?apiKey=$WEBCTX_API_KEY" \
    -H "Content-Type: application/json" \
    -H "Accept: application/json, text/event-stream" \
    -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"search","arguments":{"query":"react hooks","excludeDomains":["medium.com"]}}}'

  ---
  2. read-link

  Parameters:
  - url (required) - URL to extract content from

  curl -X POST "https://webctx.vercel.app/mcp?apiKey=$WEBCTX_API_KEY" \
    -H "Content-Type: application/json" \
    -H "Accept: application/json, text/event-stream" \
    -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"read-link","arguments":{"url":"https://nextjs.org/blog/next-15"}}}'

  ---
  3. map-site

  Parameters:
  - url (required) - URL to start crawling from

  curl -X POST "https://webctx.vercel.app/mcp?apiKey=$WEBCTX_API_KEY" \
    -H "Content-Type: application/json" \
    -H "Accept: application/json, text/event-stream" \
    -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"map-site","arguments":{"url":"https://nextjs.org"}}}'
