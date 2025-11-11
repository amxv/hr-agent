# AI Tools Exposure Research Report

## Overview

This research analyzes the AI chat application architecture to understand what tools are exposed to the AI model, how they are registered, configured, and what capabilities they provide. The application uses the **Vercel AI SDK** ("ai" package) as its core framework and implements a sophisticated tool system with support for Model Context Protocol (MCP) servers.

---

## 1. AI Framework and SDK

### Primary Framework
- **Framework**: Vercel AI SDK (`ai` package v5.0.39)
- **Location**: `/Users/ashray/code/amxv/agentdune-chat/package.json:108`
- **Type**: JavaScript/TypeScript SDK for AI model integration

### Related Packages
- **AI Provider SDKs**:
  - `@ai-sdk/anthropic` (v2.0.3) - Anthropic Claude models
  - `@ai-sdk/openai` (v2.0.12) - OpenAI models
  - `@ai-sdk/google` (v2.0.6) - Google Gemini models
  - `@ai-sdk/xai` (v2.0.7) - xAI models
  - `@ai-sdk/gateway` (v1.0.23) - Vercel AI Gateway

- **Related UI Tools**:
  - `@ai-sdk/react` (v2.0.22) - React hooks for AI integration

### Core SDK Functions Used
- `streamText()` - Stream text responses with tool calling
- `tool()` - Create tool definitions
- `streamObject()` - Stream structured object responses
- `experimental_generateImage()` - Generate images
- `experimental_createMCPClient()` - Create MCP protocol clients

**Entry Point**: `/Users/ashray/code/amxv/agentdune-chat/app/(chat)/api/chat/route.ts:1-9`

---

## 2. Tool Definition and Registration

### Tool Definition Files

#### Main Tool Registry
- **Definitions File**: `/Users/ashray/code/amxv/agentdune-chat/lib/ai/tools/tools-definitions.ts`
- **Tools Factory**: `/Users/ashray/code/amxv/agentdune-chat/lib/ai/tools/tools.ts`
- **Type Definitions**: `/Users/ashray/code/amxv/agentdune-chat/lib/ai/types.ts`

#### Tool Definition Structure
Each tool in `toolsDefinitions` includes:
- `name`: string
- `description`: string
- `cost`: number (credit cost for using the tool)

**Example from `/Users/ashray/code/amxv/agentdune-chat/lib/ai/tools/tools-definitions.ts:3-64`**:
```typescript
export const toolsDefinitions: Record<ToolName, ToolDefinition> = {
  getWeather: {
    name: "getWeather",
    description: "Get the weather in a specific location",
    cost: 1,
  },
  // ... more tools
};
```

### Tool Registration Mechanism

#### Tool Factory Function
**Location**: `/Users/ashray/code/amxv/agentdune-chat/lib/ai/tools/tools.ts:18-88`

The `getTools()` function registers all available tools and returns them as a single tools object:

```typescript
export function getTools({
  dataStream,
  session,
  messageId,
  selectedModel,
  attachments = [],
  lastGeneratedImage = null,
  contextForLLM,
}: {...}): {
  return {
    getWeather,
    createDocument: createDocumentTool({...}),
    updateDocument: updateDocument({...}),
    // ... more tools
  };
}
```

#### Tool Availability Control
Tools are conditionally registered based on environment variables:
- `env.NEXT_PUBLIC_TAVILY_AVAILABLE` - Web search and deep research tools
- `env.NEXT_PUBLIC_SANDBOX_AVAILABLE` - Code interpreter and stock chart tools
- `env.NEXT_PUBLIC_OPENAI_AVAILABLE` - Image generation tool

**Location**: `/Users/ashray/code/amxv/agentdune-chat/lib/ai/tools/tools.ts:63-86`

### Tool Integration Flow

1. **User sends message** → Chat endpoint receives request
2. **Tool selection** → Check `userMessage.metadata.selectedTool`
3. **Tool retrieval** → Call `getTools()` with context
4. **Tool filtering** → Filter based on availability and credits
5. **AI uses tools** → AI SDK calls tools during streaming

**Location**: `/Users/ashray/code/amxv/agentdune-chat/app/(chat)/api/chat/route.ts:274-420`

---

## 3. All Exposed Tools - Comprehensive List

### Complete Tool Inventory

#### 1. **getWeather**
- **Type**: Core Tool
- **Cost**: 1 credit
- **Implementation**: `/Users/ashray/code/amxv/agentdune-chat/lib/ai/tools/get-weather.ts:4-24`
- **Description**: Get the current weather at a location
- **Input Schema**:
  - `latitude`: number (required)
  - `longitude`: number (required)
- **Provider**: Open-Meteo (free API)
- **Output**: WeatherAtLocation object with current conditions, hourly forecast, daily sunrise/sunset
- **Uses**: Fetches from `https://api.open-meteo.com/v1/forecast`

#### 2. **webSearch**
- **Type**: Core Tool (Conditional)
- **Cost**: 3 credits
- **Implementation**: `/Users/ashray/code/amxv/agentdune-chat/lib/ai/tools/web-search.ts:108-182`
- **Availability**: Requires `env.NEXT_PUBLIC_TAVILY_AVAILABLE`
- **Description**: Multi-query web search with support for depth, topic filtering, and domain exclusion
- **Input Schema**:
  - `search_queries`: array of query objects (max 2 queries)
    - `query`: string (required)
    - `maxResults`: number 1-10 (optional, defaults to 5)
  - `topics`: array of "general" or "news" (optional, defaults to "general")
  - `searchDepth`: "basic" or "advanced" (optional, defaults to "basic")
  - `exclude_domains`: array of domain strings (optional)
- **Provider**: Tavily Search API via Firecrawl
- **Output**: Search results grouped by query
- **Capabilities**:
  - Advanced content extraction via Firecrawl
  - Multi-query support (up to 2 queries per request)
  - Topic-specific filtering
  - Domain exclusion

#### 3. **retrieve**
- **Type**: Core Tool
- **Cost**: 1 credit
- **Implementation**: `/Users/ashray/code/amxv/agentdune-chat/lib/ai/tools/retrieve.ts:10-76`
- **Description**: Fetch structured information from a single URL
- **Input Schema**:
  - `url`: string (required) - The URL to retrieve
- **Provider**: Firecrawl
- **Output**: Structured page data with:
  - `title`: string
  - `content`: string (markdown)
  - `url`: string
  - `description`: string
  - `language`: string
- **Features**:
  - Scrapes URL and extracts content as markdown
  - Fallback extraction using schema if primary content missing
  - Handles missing metadata

#### 4. **generateImage**
- **Type**: Core Tool (Conditional)
- **Cost**: 50 credits
- **Implementation**: `/Users/ashray/code/amxv/agentdune-chat/lib/ai/tools/generate-image.ts:21-190`
- **Availability**: Requires `env.NEXT_PUBLIC_OPENAI_AVAILABLE`
- **Description**: Generate images from text descriptions
- **Input Schema**:
  - `prompt`: string (required) - Detailed description of image to generate
- **Modes**:
  - **Generate Mode**: Create new images from scratch
  - **Edit Mode**: Edit/transform existing images (when attachments or lastGeneratedImage provided)
- **Provider**: OpenAI (uses `gpt-image-1` model for edits)
- **Storage**: Uploads generated images to Vercel Blob storage
- **Output**:
  - `imageUrl`: string (URL of generated image)
  - `prompt`: string (the input prompt used)
- **Features**:
  - Supports image editing with reference images
  - Handles batch image uploads
  - Base64 to blob conversion
  - Error handling with detailed logging

#### 5. **codeInterpreter**
- **Type**: Core Tool (Conditional)
- **Cost**: 10 credits
- **Implementation**: `/Users/ashray/code/amxv/agentdune-chat/lib/ai/tools/code-interpreter.ts:6-86`
- **Availability**: Requires `env.NEXT_PUBLIC_SANDBOX_AVAILABLE`
- **Description**: Python-only sandbox for calculations, data analysis, and visualizations
- **Input Schema**:
  - `title`: string (required) - Title of the code snippet
  - `code`: string (required) - Python code to execute
  - `icon`: enum ["stock", "date", "calculation", "default"] (required) - Display icon
- **Provider**: E2B Code Interpreter sandbox
- **Capabilities**:
  - Executes Python code in isolated environment
  - Pre-installed libraries: matplotlib, pandas, numpy, sympy, yfinance
  - Can install additional packages inline with `!pip install`
  - Produces line/scatter/bar charts
  - Returns execution results, stdout, stderr, and chart data
- **Output**:
  - `message`: string (execution results)
  - `chart`: object or empty string (chart data if generated)

#### 6. **stockChart**
- **Type**: Core Tool (Conditional)
- **Cost**: 1 credit
- **Implementation**: `/Users/ashray/code/amxv/agentdune-chat/lib/ai/tools/stock-chart.ts:6-110`
- **Availability**: Requires `env.NEXT_PUBLIC_SANDBOX_AVAILABLE`
- **Description**: Generate line stock charts and fetch historical price data
- **Input Schema**:
  - `title`: string (required) - Chart title
  - `code`: string (required) - Python code using matplotlib and yfinance
  - `icon`: enum ["stock", "date", "calculation", "default"] (required)
  - `stock_symbols`: array of strings (required) - Stock ticker symbols
  - `interval`: enum ["1d", "5d", "1mo", "3mo", "6mo", "1y", "2y", "5y", "10y", "ytd", "max"] (required)
- **Provider**: E2B Code Interpreter + yfinance
- **Output**: Same as codeInterpreter (message and chart data)
- **Features**: Restricted to publicly traded stocks, line charts only

#### 7. **createDocument**
- **Type**: Artifact Tool (Frontend-exposed)
- **Cost**: 5 credits
- **Implementation**: `/Users/ashray/code/amxv/agentdune-chat/lib/ai/tools/create-document.ts:24-108`
- **Description**: Create persistent documents (text, code, or spreadsheet)
- **Input Schema**:
  - `title`: string (required) - File name with extension for code artifacts
  - `description`: string (required) - What document should contain
  - `kind`: enum of artifact kinds (required) - Document type
- **Supported Kinds**:
  - Defined in `/Users/ashray/code/amxv/agentdune-chat/lib/artifacts/artifact-kind.ts`
  - Includes: text, code, spreadsheet, etc.
- **Handler System**: Uses pluggable document handlers for different artifact types
  - **Location**: `/Users/ashray/code/amxv/agentdune-chat/lib/artifacts/server.ts`
  - Each handler implements `onCreateDocument()` method
- **Features**:
  - Streams document creation progress to UI
  - Context-aware using conversation history
  - Supports user authentication/session
  - Generates UUID for document tracking
  - Sends real-time UI updates via StreamWriter

#### 8. **updateDocument**
- **Type**: Artifact Tool (Frontend-exposed)
- **Cost**: 5 credits
- **Implementation**: `/Users/ashray/code/amxv/agentdune-chat/lib/ai/tools/update-document.ts:16-98`
- **Description**: Modify an existing document
- **Input Schema**:
  - `id`: string (required) - Document ID to update
  - `description`: string (required) - Description of changes needed
- **Features**:
  - Validates document ownership
  - Uses same handler system as createDocument
  - Streams updates to UI
  - Supports major rewrites or targeted edits
- **Constraints**: Requires previous document creation in conversation

#### 9. **readDocument**
- **Type**: Artifact Tool
- **Cost**: 1 credit
- **Implementation**: `/Users/ashray/code/amxv/agentdune-chat/lib/ai/tools/read-document.ts:12-50`
- **Description**: Read contents of a document created earlier in chat
- **Input Schema**:
  - `id`: string (required) - Document ID
- **Security**: Validates user authorization (checks document.userId)
- **Output**: Complete document data with ID, title, kind, content, and createdAt

#### 10. **requestSuggestions**
- **Type**: Artifact Tool
- **Cost**: 1 credit
- **Implementation**: `/Users/ashray/code/amxv/agentdune-chat/lib/ai/tools/request-suggestions.ts:16-114`
- **Description**: Generate writing-improvement suggestions without applying edits
- **Input Schema**:
  - `documentId`: string (required) - Existing document ID
- **Process**:
  - Uses separate LLM call with specialized prompt
  - Generates up to 5 suggestions
  - Streams suggestions to UI in real-time
  - Persists suggestions to database for later review
- **Output**:
  - `id`: document ID
  - `title`: document title
  - `kind`: document kind
  - `message`: confirmation message
- **Suggestion Format** (streamed as `data-suggestion`):
  - `originalText`: original sentence
  - `suggestedText`: rewritten sentence
  - `description`: rationale for suggestion
  - Includes metadata (user ID, timestamps, resolution status)

#### 11. **deepResearch**
- **Type**: Core Tool (Frontend-exposed, Conditional)
- **Cost**: 50 credits
- **Implementation**: `/Users/ashray/code/amxv/agentdune-chat/lib/ai/tools/deep-research/deep-research.ts:10-81`
- **Availability**: Requires `env.NEXT_PUBLIC_TAVILY_AVAILABLE`
- **Description**: Autonomous research tool that conducts deep analysis with clarification, parallel research tasks, and synthesis
- **Input Schema**: Empty object (uses conversation context)
- **Features**:
  - **Autonomous Clarification**: Asks clarifying questions if request is ambiguous
  - **Parallel Research**: Breaks down queries into parallel research tasks
  - **Multi-source Gathering**: Scours multiple web sources
  - **Synthesis**: Creates comprehensive reports with citations
  - **Iterative**: Can continue research after user responds to clarifications
- **Output Formats**:
  - `report`: Comprehensive research report with synthesis
  - `clarifying_question`: Questions to clarify user intent
  - `problem`: Error message
- **Telemetry**: Integrates with Langfuse for tracing and observability
- **Implementation Details**:
  - **Core Runner**: `runDeepResearcher()` in `/Users/ashray/code/amxv/agentdune-chat/lib/ai/tools/deep-research/deep-researcher.ts`
  - **Configuration**: Loaded from environment or config object
  - **Models**: Uses configurable models for different stages (default: gpt-4o-mini variants)
  - **Context Window**: Respects model context limits

---

## 4. Tool Capabilities and Features

### Capability Categories

#### Web Research & Information Retrieval
- **webSearch**: Multi-query search with Tavily/Firecrawl
- **retrieve**: Single-URL content extraction
- **deepResearch**: Autonomous research with synthesis

#### Content Generation
- **generateImage**: AI image generation (OpenAI DALL-E)
- **createDocument**: Create text/code/spreadsheet artifacts
- **codeInterpreter**: Generate Python visualizations/analyses

#### Document Management
- **createDocument**: Create new documents
- **updateDocument**: Edit existing documents
- **readDocument**: Retrieve document content
- **requestSuggestions**: Generate editing suggestions

#### Data & Analysis
- **codeInterpreter**: Python execution for calculations, data analysis
- **stockChart**: Financial data visualization
- **getWeather**: Weather data retrieval

### Real-time Streaming
All tools support **streaming via StreamWriter** for real-time UI updates:
- Research progress updates (`data-researchUpdate`)
- Document creation progress
- Suggestion generation
- Code execution results

**Location**: `/Users/ashray/code/amxv/agentdune-chat/lib/ai/types.ts:95-110`

### Cost System
Tools have credit costs to manage usage:
- Weather & Document Reading: 1 credit
- Web Search: 3 credits
- Code Execution: 10 credits (codeInterpreter)
- Image Generation & Deep Research: 50 credits
- Document Creation/Update: 5 credits each

**Cost Filtering**: `/Users/ashray/code/amxv/agentdune-chat/app/(chat)/api/chat/route.ts:372-379`

The system filters available tools based on user budget (credits remaining).

---

## 5. MCP (Model Context Protocol) Integration

### MCP Overview
The application supports **Model Context Protocol (MCP)** servers for extending tool capabilities. This is specifically implemented in the **deepResearch** tool.

**Location**: `/Users/ashray/code/amxv/agentdune-chat/lib/ai/tools/deep-research/utils.ts:1-75`

### MCP Implementation Details

#### MCP Client Creation
```typescript
client = await experimental_createMCPClient({
  transport: {
    type: "sse",  // Server-Sent Events transport
    url: config.mcp_config.url,
  },
});
```

**Location**: `/Users/ashray/code/amxv/agentdune-chat/lib/ai/tools/deep-research/utils.ts:26-31`

#### MCP Configuration
Defined in schema: `/Users/ashray/code/amxv/agentdune-chat/lib/ai/tools/deep-research/configuration.ts:7-14`

```typescript
export const MCPConfigSchema = z.object({
  url: z.string().optional(),           // MCP server URL
  tools: z.array(z.string()).optional(), // Specific tools to use
  headers: z.record(z.string(), z.string()).optional(), // Custom headers
});
```

#### Tool Loading from MCP
Function: `loadMcpTools()` in `/Users/ashray/code/amxv/agentdune-chat/lib/ai/tools/deep-research/utils.ts:14-75`

Process:
1. Connects to MCP server via SSE transport
2. Retrieves all available tools via `client.tools()`
3. Filters tools based on:
   - Configured tool whitelist (if specified)
   - Conflict with existing local tools
4. Returns filtered MCP tools
5. Closes connection safely

#### MCP Tool Integration
In `getAllTools()`: `/Users/ashray/code/amxv/agentdune-chat/lib/ai/tools/deep-research/utils.ts:101-117`

MCP tools are merged with search tools:
```typescript
const mcpTools = await loadMcpTools(config, existingToolNames);
return { ...mcpTools, ...searchTools };
```

This allows MCP tools to coexist with built-in search tools while preventing name conflicts.

### MCP Configuration Loading
**Location**: `/Users/ashray/code/amxv/agentdune-chat/lib/ai/tools/deep-research/configuration.ts:54-88`

Environment variables mapped to config:
- `SEARCH_API`: Sets search provider (tavily, firecrawl, none)
- `RESEARCH_MODEL`: Model for research phase
- `SUMMARIZATION_MODEL`: Model for summarization
- `COMPRESSION_MODEL`: Model for data compression
- `FINAL_REPORT_MODEL`: Model for final synthesis
- Plus model token limits and feature flags

### MCP Capabilities
- **SSE Transport**: Uses Server-Sent Events for real-time communication
- **Tool Discovery**: Automatically discovers available tools from MCP server
- **Tool Filtering**: Selective tool activation via configuration
- **Error Handling**: Graceful fallback if MCP unavailable
- **Cleanup**: Automatic client disconnection after use

---

## 6. Tool Registration and Configuration

### Configuration Sources

#### 1. Environment Variables
**Location**: `/Users/ashray/code/amxv/agentdune-chat/lib/env.ts` (not shown but referenced)

Key environment variables:
- `NEXT_PUBLIC_TAVILY_AVAILABLE`: Enable web search tools
- `NEXT_PUBLIC_SANDBOX_AVAILABLE`: Enable code interpreter and stock chart
- `NEXT_PUBLIC_OPENAI_AVAILABLE`: Enable image generation
- `OPENAI_API_KEY`: OpenAI API credentials
- `FIRECRAWL_API_KEY`: Firecrawl API key
- `SANDBOX_TEMPLATE_ID`: E2B sandbox template ID

#### 2. Deep Research Configuration
**Location**: `/Users/ashray/code/amxv/agentdune-chat/lib/ai/tools/deep-research/configuration.ts`

Can be configured via:
- Environment variables (mapped in `loadConfigFromEnv()`)
- Direct config object passed to `createDeepResearchConfig()`
- Defaults are provided for all options

#### 3. Tool Availability

Tools are conditionally exported in `getTools()`:
```typescript
// Line 63-70: Tavily-dependent tools
...(env.NEXT_PUBLIC_TAVILY_AVAILABLE ? {
  webSearch: tavilyWebSearch({...}),
} : {}),

// Line 72-73: Sandbox-dependent tools
...(env.NEXT_PUBLIC_SANDBOX_AVAILABLE ? {
  codeInterpreter,
  stockChart,
} : {}),

// Line 74-76: OpenAI-dependent tools
...(env.NEXT_PUBLIC_OPENAI_AVAILABLE ? {
  generateImage: generateImage({...}),
} : {}),
```

### Tool Registration Flow

**Location**: `/Users/ashray/code/amxv/agentdune-chat/app/(chat)/api/chat/route.ts:540-555`

```typescript
tools: getTools({
  dataStream,
  session: {
    user: {
      id: userId || undefined,
    },
    expires: "noop",
  },
  contextForLLM,
  messageId,
  selectedModel: modelDefinition.apiModelId,
  attachments: userMessage.parts.filter(
    (part) => part.type === "file"
  ),
  lastGeneratedImage,
})
```

### Tool Filtering Based on Credits

**Location**: `/Users/ashray/code/amxv/agentdune-chat/app/(chat)/api/chat/route.ts:372-420`

Process:
1. Get base model cost
2. Retrieve credit reservation for user
3. Filter affordable tools using `filterAffordableTools()`:
   - Checks each tool's cost
   - Keeps tools user can afford
4. For models with reasoning, disable expensive deepResearch tool
5. If tool explicitly requested, validate sufficient budget exists
6. If sufficient budget, make that tool the only active tool

---

## 7. Data Flow: How Tools Are Invoked

### User Message Processing Flow

**Location**: `/Users/ashray/code/amxv/agentdune-chat/app/(chat)/api/chat/route.ts:161-772`

#### Step 1: Receive Message (Lines 161-187)
- Parse user message and selected model from request
- Validate message and model ID
- Extract selectedTool metadata if provided

#### Step 2: Authentication & Authorization (Lines 189-272)
- Check if user is authenticated
- For anonymous users: rate limiting, credit validation, model availability check
- For authenticated users: load user from database

#### Step 3: Tool Selection (Lines 274-345)
Parse explicitly requested tools from message metadata:
```typescript
let explicitlyRequestedTools: ToolName[] | null = null;
if (selectedTool === "deepResearch") {
  explicitlyRequestedTools = ["deepResearch"];
} else if (selectedTool === "webSearch") {
  explicitlyRequestedTools = ["webSearch"];
} else if (selectedTool === "generateImage") {
  explicitlyRequestedTools = ["generateImage"];
} else if (selectedTool === "createDocument") {
  explicitlyRequestedTools = ["createDocument", "updateDocument"];
}
```

#### Step 4: Credit Management (Lines 347-420)
- Get credit reservation for authenticated users
- Calculate available tool budget
- Filter tools based on availability and affordability
- Validate explicitly requested tools are affordable

#### Step 5: Message Context Preparation (Lines 436-461)
- Retrieve message thread up to parent message
- Get last 5 messages for context
- Extract recent generated images for reference
- Add explicit tool request context to messages
- Filter out reasoning parts for compatibility
- Convert to model messages format

#### Step 6: Tool Registration (Lines 514-555)
```typescript
const result = streamText({
  model: getLanguageModel(modelDefinition.apiModelId),
  system: systemPrompt(),
  messages: contextForLLM,
  activeTools,  // Only these tools available
  experimental_transform: markdownJoinerTransform(),
  tools: getTools({  // Register tools with context
    dataStream,
    session,
    contextForLLM,
    messageId,
    selectedModel: modelDefinition.apiModelId,
    attachments,
    lastGeneratedImage,
  }),
  // ... more config
});
```

#### Step 7: Tool Invocation
- AI SDK determines which tools to call based on:
  - What's in `activeTools` list
  - Tool descriptions and input schemas
  - Model's judgment of what's needed
- Tools are called with provided context
- Results are streamed back to client

#### Step 8: Cost Finalization (Lines 612-680)
- Calculate actual cost based on tools used
- Sum all tool costs from tool-result parts
- Look up tool definitions for costs:
  ```typescript
  const toolDef = toolsDefinitions[
    toolResult.type.replace("tool-", "") as ToolName
  ];
  ```
- Finalize credit deduction or rollback on error

### Tool Invocation Context

Each tool receives:
- **dataStream**: StreamWriter for real-time UI updates
- **session**: User/authentication context
- **messageId**: Current message ID for tracking
- **selectedModel**: Model ID for decision-making
- **contextForLLM**: Full conversation history for context
- **attachments**: User-provided file attachments
- **lastGeneratedImage**: Reference to last generated image

---

## 8. Frontend Tools (User-Exposed)

These tools are exposed to the user interface for explicit selection:

**Location**: `/Users/ashray/code/amxv/agentdune-chat/lib/ai/types.ts:42-47`

```typescript
export const frontendToolsSchema = z.enum([
  "webSearch",
  "deepResearch",
  "generateImage",
  "createDocument",
]);
```

### Frontend Tool Selection
Users can explicitly select one of these tools before sending a message. The selection is stored in message metadata:
- **Field**: `userMessage.metadata.selectedTool`
- **Type**: `UiToolName` enum

**Processing Location**: `/Users/ashray/code/amxv/agentdune-chat/app/(chat)/api/chat/route.ts:334-345`

When explicitly selected, the tool becomes the only active tool (overriding normal tool filtering).

---

## 9. Type System

### Tool Type Definitions

**Location**: `/Users/ashray/code/amxv/agentdune-chat/lib/ai/types.ts:1-127`

#### ToolName Enum
All available tools defined via Zod schema:
```typescript
export const toolNameSchema = z.enum([
  "getWeather",
  "createDocument",
  "updateDocument",
  "requestSuggestions",
  "readDocument",
  "retrieve",
  "webSearch",
  "stockChart",
  "codeInterpreter",
  "generateImage",
  "deepResearch",
]);
```

#### ChatTools Type
Composite type containing all tool types:
```typescript
export type ChatTools = {
  getWeather: weatherTool;
  createDocument: createDocumentTool;
  updateDocument: updateDocumentTool;
  requestSuggestions: requestSuggestionsTool;
  deepResearch: deepResearchTool;
  readDocument: readDocumentTool;
  generateImage: generateImageTool;
  webSearch: webSearchTool;
  stockChart: stockChartTool;
  codeInterpreter: codeInterpreterTool;
  retrieve: retrieveTool;
};
```

#### Custom UI Data Types
Tools can stream custom data types to UI:
```typescript
export type CustomUIDataTypes = {
  textDelta: string;
  imageDelta: string;
  sheetDelta: string;
  codeDelta: string;
  suggestion: Suggestion;
  appendMessage: string;
  id: string;
  messageId: string;
  title: string;
  kind: ArtifactKind;
  clear: null;
  finish: null;
  researchUpdate: ResearchUpdate;
  followupSuggestions: FollowupSuggestions;
};
```

---

## 10. Error Handling and Validation

### Tool-Level Error Handling

#### Web Search Error Handling
**Location**: `/Users/ashray/code/amxv/agentdune-chat/lib/ai/tools/web-search.ts:71-76`
- Logs search errors
- Returns error in results
- Continues processing other queries

#### Image Generation Error Handling
**Location**: `/Users/ashray/code/amxv/agentdune-chat/lib/ai/tools/generate-image.ts:170-188`
- Detailed error logging with mode, timing, and error details
- Error object serialization for safe logging
- Re-throws errors for caller handling

#### Document Validation
**Location**: `/Users/ashray/code/amxv/agentdune-chat/lib/ai/tools/read-document.ts:27-40`
- Validates document exists
- Checks user authorization (document.userId match)
- Returns error object if validation fails

### API-Level Error Handling

**Location**: `/Users/ashray/code/amxv/agentdune-chat/app/(chat)/api/chat/route.ts:755-772`

```typescript
catch (error) {
  clearTimeout(timeoutId);
  log.error({ error }, "RESPONSE > POST /api/chat error");

  // Cleanup on error
  if (reservation) {
    await reservation.cleanup();
  }
  if (anonymousSession) {
    anonymousSession.remainingCredits += baseModelCost;
    setAnonymousSession(anonymousSession);
  }

  return new Response(
    "An error occurred while processing your request!",
    { status: 404 }
  );
}
```

---

## 11. Key Integration Points

### 1. Resumable Streams
- **Technology**: resumable-stream library
- **Purpose**: Resume interrupted streams using Redis
- **Implementation**: `/Users/ashray/code/amxv/agentdune-chat/app/(chat)/api/chat/route.ts:66-106`
- **TTL**: 10 minutes with automatic cleanup

### 2. Telemetry & Observability
- **Langfuse Integration**: Deep research tool traces
- **Location**: `/Users/ashray/code/amxv/agentdune-chat/lib/ai/tools/deep-research/deep-research.ts:40-58`
- **Purpose**: Track research execution and performance

### 3. Database Integration
- **Read Operations**: `getDocumentById()`, `getMessageById()`, `getChatById()`
- **Write Operations**: `saveMessage()`, `updateMessage()`, `saveSuggestions()`
- **Location**: `/Users/ashray/code/amxv/agentdune-chat/lib/db/queries.ts`

### 4. File Storage
- **Provider**: Vercel Blob
- **Used By**: Image generation tool
- **Function**: `uploadFile()` in `/Users/ashray/code/amxv/agentdune-chat/lib/blob.ts`

### 5. Redis Integration
- **Purpose**: Rate limiting, session storage, stream tracking
- **Publishers**: OpenAI API key management, stream coordination
- **Subscribers**: Event-driven processing
- **Location**: `/Users/ashray/code/amxv/agentdune-chat/app/(chat)/api/chat/route.ts:66-76`

---

## 12. Security Considerations

### Authentication
- Session-based via BetterAuth (`@auth` package)
- User ID extraction from session headers
- Anonymous user support with separate limits

### Authorization
- Document access controlled by userId checks
- Chat ownership validation
- Per-tool authorization via selectedTool validation

### Rate Limiting
- Anonymous user rate limiting by IP address
- Credit-based tool usage limits
- Budget enforcement before tool invocation

### Data Protection
- File attachments processed as binary data
- File parts replaced by binary data before LLM context
- Session data secured via cookies

---

## 13. Summary of Tool Capabilities

| Tool | Type | Cost | Provider | Capability |
|------|------|------|----------|------------|
| getWeather | Core | 1 | Open-Meteo | Weather forecast data |
| webSearch | Core | 3 | Tavily/Firecrawl | Multi-query web search |
| retrieve | Core | 1 | Firecrawl | Single-URL content extraction |
| generateImage | Core | 50 | OpenAI | AI image generation |
| codeInterpreter | Core | 10 | E2B | Python code execution & analysis |
| stockChart | Core | 1 | E2B + yfinance | Stock price visualization |
| createDocument | Artifact | 5 | LLM-generated | Create text/code/spreadsheet |
| updateDocument | Artifact | 5 | LLM-generated | Edit existing documents |
| readDocument | Artifact | 1 | Database | Read document content |
| requestSuggestions | Artifact | 1 | LLM-generated | Generate editing suggestions |
| deepResearch | Core | 50 | Tavily/Firecrawl/MCP | Autonomous research & synthesis |

---

## 14. Conclusion

The application exposes **11 primary tools** to the AI model through the Vercel AI SDK framework. These tools are:

1. **Conditionally available** based on environment configuration
2. **Cost-controlled** through a credit system
3. **Context-aware** with access to conversation history
4. **Real-time streaming** for UI updates
5. **Extensible** through MCP protocol support
6. **Secure** with authentication and authorization checks
7. **Typed** using Zod schemas for validation

The tool system provides comprehensive capabilities spanning web research, content generation, code execution, document management, and data analysis, all orchestrated through the Vercel AI SDK's tool calling mechanism.

---

**Document Generated**: 2025-10-20
**Research Scope**: Complete tool enumeration and integration analysis
**Framework**: Vercel AI SDK v5.0.39
**Total Tools Exposed**: 11 primary tools + MCP extensibility
