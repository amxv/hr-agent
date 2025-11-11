# AI Agent Tools Integration with Vercel AI SDK

**Research Date:** 2025-11-11 21:52:13
**Topic:** How AI agent tools are registered, invoked, and integrated with the Vercel AI SDK, including parameter handling, response formatting, and error handling

---

## Overview

The AgentDune Chat application implements a comprehensive tool system that integrates with the Vercel AI SDK to provide AI agents with capabilities like web search, document management, image generation, and HR-specific functions. The architecture follows a three-tier pattern:

1. **Tool Definitions** - Central registry of all available tools with metadata
2. **Tool Implementation** - Individual tool modules using the Vercel AI SDK `tool()` function
3. **Tool Invocation** - Dynamic tool selection and execution via `streamText()` API

The system supports 18 different tools, conditional tool availability based on user permissions and budget, and real-time streaming of tool execution updates to the UI.

---

## Entry Points

### Main Tool Registry
- `/home/user/agentdune-chat/lib/ai/tools/tools.ts:25-108` - `getTools()` function that returns all available tools
- `/home/user/agentdune-chat/lib/ai/tools/tools-definitions.ts:3-99` - Central metadata registry for all tools
- `/home/user/agentdune-chat/app/(chat)/api/chat/route.ts:549-564` - Tool invocation in the main chat API route

### Type Definitions
- `/home/user/agentdune-chat/lib/ai/types.ts:31-50` - Tool name enumeration and type definitions
- `/home/user/agentdune-chat/lib/ai/types.ts:98-117` - `ChatTools` type mapping tool names to their implementations
- `/home/user/agentdune-chat/lib/ai/types.ts:147` - `ToolName` type alias

### System Integration
- `/home/user/agentdune-chat/lib/ai/prompts.ts:3-125` - System prompt that describes tool usage to the AI
- `/home/user/agentdune-chat/components/data-stream-handler.tsx:27-139` - Client-side handler for tool execution updates

---

## Core Implementation

### 1. Tool Registration (`lib/ai/tools/tools.ts`)

#### Central Registry Function
The `getTools()` function at `lib/ai/tools/tools.ts:25-108` serves as the single source of truth for all available tools. It accepts a configuration object and returns a typed object containing all tool instances.

**Parameters:**
```typescript
{
  dataStream: StreamWriter;      // For streaming real-time updates
  session: Session;               // User authentication context
  messageId: string;              // Current message identifier
  selectedModel: ModelId;         // AI model being used
  attachments: FileUIPart[];      // Uploaded files from user
  lastGeneratedImage: {...};      // Most recent generated image for editing
  contextForLLM: ModelMessage[];  // Conversation history
}
```

**Conditional Tool Registration:**
Tools are conditionally included based on environment variables:

```typescript
// Line 70-77: Tavily web search (requires NEXT_PUBLIC_TAVILY_AVAILABLE)
...(env.NEXT_PUBLIC_TAVILY_AVAILABLE
  ? {
      webSearch: tavilyWebSearch({
        dataStream,
        writeTopLevelUpdates: true,
      }),
    }
  : {})

// Line 79-80: Sandbox tools (requires NEXT_PUBLIC_SANDBOX_AVAILABLE)
...(env.NEXT_PUBLIC_SANDBOX_AVAILABLE ? { stockChart } : {})
...(env.NEXT_PUBLIC_SANDBOX_AVAILABLE ? { codeInterpreter } : {})

// Line 81-83: Image generation (requires NEXT_PUBLIC_OPENAI_AVAILABLE)
...(env.NEXT_PUBLIC_OPENAI_AVAILABLE
  ? { generateImage: generateImage({ attachments, lastGeneratedImage }) }
  : {})

// Line 84-93: Deep research (requires NEXT_PUBLIC_TAVILY_AVAILABLE)
...(env.NEXT_PUBLIC_TAVILY_AVAILABLE
  ? {
      deepResearch: deepResearch({
        session,
        dataStream,
        messageId,
        messages: contextForLLM,
      }),
    }
  : {})

// Line 94-99: Document search (requires NEXT_PUBLIC_OPENAI_AVAILABLE)
...(env.NEXT_PUBLIC_OPENAI_AVAILABLE
  ? {
      semanticSearch: semanticSearch({ dataStream }),
      fileRetrieve: fileRetrieve({ dataStream }),
    }
  : {})
```

**RBAC (Role-Based Access Control):**
Some tools include inline comments indicating that access control is enforced within the tool's execute function:

```typescript
// Line 103-104: Manager-only tool
teamAvailability: teamAvailability({ dataStream }),  // RBAC check enforced in execute function

// Line 105-106: HR-only tool
peopleSearch: peopleSearch({ dataStream }),  // RBAC check enforced in execute function
```

#### Tool Metadata Registry (`lib/ai/tools/tools-definitions.ts`)

Each tool has metadata stored in `toolsDefinitions`:

```typescript
// Line 3-99: Tool definitions with name, description, and cost
export const toolsDefinitions: Record<ToolName, ToolDefinition> = {
  getWeather: {
    name: "getWeather",
    description: "Get the weather in a specific location",
    cost: 1,
  },
  semanticSearch: {
    name: "semanticSearch",
    description: "Semantic Search",
    cost: 3,
  },
  generateImage: {
    name: "generateImage",
    description: "Generate images from text descriptions",
    cost: 50,
  },
  // ... 18 total tools
}
```

**Cost-Based Tool Filtering:**
Tools have associated credit costs that determine availability based on user budget (`lib/credits/credits-utils.ts:38-48`):

```typescript
export function filterAffordableTools(
  tools: ToolName[],
  toolBudget: number
): ToolName[] {
  const affordableTools = tools.filter((toolName) => {
    const toolCost = toolsDefinitions[toolName].cost;
    return toolBudget >= toolCost;
  });
  return affordableTools;
}
```

### 2. Tool Implementation Pattern

#### Standard Tool Structure
All tools follow the Vercel AI SDK pattern using the `tool()` function from the `ai` package. Here's the anatomy using `semanticSearch` as an example (`lib/ai/tools/semantic-search.ts`):

**Import Dependencies:**
```typescript
// Line 1-3: Vercel AI SDK imports
import { tool } from "ai";
import { z } from "zod";
```

**Factory Function Pattern:**
Tools are typically exported as factory functions that accept configuration and return a tool instance:

```typescript
// Line 36-163: Factory function that returns a configured tool
export const semanticSearch = ({ dataStream }: SemanticSearchProps) =>
  tool({
    description: "Search the organization's document library...",
    inputSchema: z.object({
      query: z.string().describe("The search query in natural language"),
      limit: z.number().min(1).max(20).optional().describe("Maximum number of results to return (default: 5)"),
    }),
    execute: async ({ query, limit = 5 }: SemanticSearchInput) => {
      // Implementation
    },
  });
```

**Three Key Components:**

1. **Description** (Line 38-39): Human-readable text that tells the AI when and how to use the tool
2. **Input Schema** (Line 40-48): Zod schema defining parameters with descriptions for each field
3. **Execute Function** (Line 49-163): Async function that implements the tool's logic

#### Web Search Tool Example (`lib/ai/tools/web-search.ts`)

**Complex Parameter Schema:**
```typescript
// Line 123-137: Multi-parameter input schema with nested types
inputSchema: z.object({
  search_queries: searchQueriesSchema,  // Array of query objects
  topics: z
    .array(z.enum(["general", "news"]))
    .describe("Array of topic types to search for.")
    .nullable(),
  searchDepth: z
    .enum(["basic", "advanced"])
    .describe('Search depth to use. Defaults to "basic".')
    .nullable(),
  exclude_domains: z
    .array(z.string())
    .describe("A list of domains to exclude from all search results.")
    .nullable(),
})
```

**Detailed Description for AI:**
```typescript
// Line 116-122: Comprehensive description with use cases
description: `Multi-query web search (supports depth, topic & result limits). Always cite sources inline.

Use for:
- General information gathering via web search

Avoid:
- Pulling content from a single known URL (use retrieve instead)`
```

#### Image Generation Tool Example (`lib/ai/tools/generate-image.ts`)

**Handling Attachments and Context:**
```typescript
// Line 45-194: Execute function with complex state management
execute: async ({ prompt }) => {
  const startMs = Date.now();

  // Filter only image file parts for reference
  const imageParts = attachments.filter(
    (part) => part.type === "file" && part.mediaType?.startsWith("image/")
  );

  const hasLastGeneratedImage = lastGeneratedImage !== null;
  const isEdit = imageParts.length > 0 || hasLastGeneratedImage;

  // Different execution path for edit vs generate
  if (isEdit) {
    // OpenAI edit mode using toFile conversion
    const inputImages = [] as File[];
    // Add lastGeneratedImage first if it exists
    if (lastGeneratedImage) {
      const response = await fetch(lastGeneratedImage.imageUrl);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const lastGenImage = await toFile(buffer, lastGeneratedImage.name, {
        type: "image/png",
      });
      inputImages.push(lastGenImage);
    }
    // ... rest of edit logic
  } else {
    // Generate mode using experimental_generateImage
    const res = await experimental_generateImage({
      model: getImageModel(imageModel),
      prompt,
      n: 1,
      providerOptions: {
        telemetry: { isEnabled: true },
      },
    });
    // ... rest of generate logic
  }
}
```

#### HR Case Tool Example (`lib/ai/tools/hr-case.ts`)

**Multi-Action Tool Pattern:**
Tools can support multiple actions within a single tool definition:

```typescript
// Line 331-369: Input schema with action enum and conditional parameters
inputSchema: z.object({
  action: z
    .enum(["create", "status", "list"])
    .describe("Action to perform: create new case, check status, or list all cases"),
  category: z
    .enum(["payroll", "benefits", "policy", "equipment", "leave", "performance", "other"])
    .optional()
    .describe("Category of the issue (for create action)"),
  description: z
    .string()
    .optional()
    .describe("Description of the issue (required for create action)"),
  caseId: z
    .string()
    .optional()
    .describe("Case ID to query (required for status action)"),
  attachChat: z
    .boolean()
    .optional()
    .describe("Whether to attach current conversation transcript"),
})
```

**Action-Based Execution Logic:**
```typescript
// Line 370-541: Execute function with branching logic
execute: async ({ action, category, description, caseId, attachChat = false }) => {
  // Write start update to stream
  dataStream.write({
    type: "data-researchUpdate",
    data: {
      title: `${action === "create" ? "Creating" : action === "status" ? "Retrieving" : "Listing"} HR case...`,
      timestamp: Date.now(),
      type: "started",
    },
  });

  try {
    if (action === "create") {
      // Create new case logic
      const newCase: HRCase = { /* ... */ };
      return {
        action: "create",
        case: newCase,
        message: `Case ${newCase.caseId} created successfully...`,
      };
    }

    if (action === "status") {
      // Check status logic
      return {
        action: "status",
        case: existingCase,
      };
    }

    if (action === "list") {
      // List cases logic
      return {
        action: "list",
        cases: MOCK_EXISTING_CASES,
        totalOpen: openCases.length,
        totalClosed: closedCases.length,
      };
    }
  } catch (error) {
    return {
      error: `Failed to ${action} HR case: ${(error as Error).message}`,
    };
  }
}
```

### 3. Tool Invocation in Chat API (`app/(chat)/api/chat/route.ts`)

#### Tool Budget Calculation and Filtering

**Credit Reservation System:**
```typescript
// Line 356-379: Reserve credits for the message and tools
const baseModelCost = getBaseModelCostByModelId(selectedModelId);

let reservation: CreditReservation | null = null;

if (!isAnonymous) {
  const { reservation: res, error: creditError } =
    await getCreditReservation(userId, baseModelCost);

  if (creditError) {
    return new Response(creditError, { status: 402 });
  }

  reservation = res;
} else if (anonymousSession) {
  anonymousSession.remainingCredits -= baseModelCost;
  await setAnonymousSession(anonymousSession);
}
```

**Dynamic Tool Filtering:**
```typescript
// Line 381-403: Filter tools based on available budget
let activeTools: ToolName[] = filterAffordableTools(
  isAnonymous ? ANONYMOUS_LIMITS.AVAILABLE_TOOLS : allTools,
  isAnonymous
    ? ANONYMOUS_LIMITS.CREDITS
    : reservation
      ? reservation.budget - baseModelCost
      : 0
);

// Disable all tools for models with unspecified features
if (modelDefinition?.input) {
  // Don't allow deepResearch if the model supports reasoning
  if (
    modelDefinition.reasoning &&
    activeTools.some((tool: ToolName) => tool === "deepResearch")
  ) {
    activeTools = activeTools.filter(
      (tool: ToolName) => tool !== "deepResearch"
    );
  }
} else {
  activeTools = [];
}
```

**Explicit Tool Requests:**
```typescript
// Line 343-354: Handle explicit tool requests from UI
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

// Line 423-429: Override activeTools if explicitly requested
if (explicitlyRequestedTools && explicitlyRequestedTools.length > 0) {
  activeTools = explicitlyRequestedTools;
}
```

#### StreamText Integration

**Main Invocation:**
```typescript
// Line 523-576: Call Vercel AI SDK streamText with tools
const result = streamText({
  model: getLanguageModel(modelDefinition.apiModelId),
  system: systemPrompt(),
  messages: contextForLLM,

  // Stop conditions
  stopWhen: [
    stepCountIs(5),
    ({ steps }) => {
      return steps.some((step) => {
        const toolResults = step.content;
        return toolResults.some(
          (toolResult) =>
            toolResult.type === "tool-result" &&
            toolResult.toolName === "deepResearch" &&
            (toolResult.output as any).format === "report"
        );
      });
    },
  ],

  activeTools,  // Array of tool names to make available
  experimental_transform: markdownJoinerTransform(),
  experimental_telemetry: {
    isEnabled: true,
    functionId: "chat-response",
  },

  // Pass all registered tools
  tools: getTools({
    dataStream,
    session: { user: { id: userId || undefined }, expires: "noop" },
    contextForLLM,
    messageId,
    selectedModel: modelDefinition.apiModelId,
    attachments: userMessage.parts.filter((part) => part.type === "file"),
    lastGeneratedImage,
  }),

  onError: (error) => {
    log.error({ error }, "streamText error");
  },
  abortSignal: abortController.signal,

  ...(modelDefinition.fixedTemperature
    ? { temperature: modelDefinition.fixedTemperature }
    : {}),

  providerOptions: getModelProviderOptions(selectedModelId),
});
```

**Key Parameters:**

- `model`: Language model instance from provider
- `system`: System prompt describing tool usage
- `messages`: Conversation history
- `activeTools`: Array of tool names that can be invoked (budget-filtered)
- `tools`: Full tool registry from `getTools()`
- `stopWhen`: Conditions to halt generation (e.g., after 5 tool calls or when deepResearch completes)
- `experimental_transform`: Custom transform for markdown processing
- `abortSignal`: Timeout controller for cleanup

### 4. Parameter Handling

#### Type Safety with Zod

**Schema Definition Pattern:**
All tools use Zod for runtime type validation and TypeScript type inference:

```typescript
// Example from web-search.ts:14-29
const searchQueriesSchema = z
  .array(
    z.object({
      query: z.string(),
      maxResults: z
        .number()
        .min(1)
        .max(10)
        .nullable()
        .describe(`Maximum number of results for this query. Defaults to ${DEFAULT_MAX_RESULTS}.`),
    })
  )
  .max(MAX_SEARCH_QUERIES)
  .describe(`Array of search queries. Maximum ${MAX_SEARCH_QUERIES} queries.`);
```

**Type Inference:**
```typescript
// Types are automatically inferred from schema
type SemanticSearchInput = z.infer<typeof inputSchema>;
// Equivalent to:
// {
//   query: string;
//   limit?: number;
// }
```

#### Parameter Defaults and Nullability

**Handling Optional Parameters:**
```typescript
// Line 138-163 in web-search.ts: Handle nullable parameters with defaults
execute: async ({
  search_queries,
  topics,
  searchDepth,
  exclude_domains,
}: {
  search_queries: { query: string; maxResults: number | null }[];
  topics: ("general" | "news")[] | null;
  searchDepth: "basic" | "advanced" | null;
  exclude_domains: string[] | null;
}) => {
  // Handle nullable arrays with defaults
  const safeTopics = topics ?? ["general"];
  const _safeSearchDepth = searchDepth ?? "basic";
  const safeExcludeDomains = exclude_domains ?? [];

  return executeMultiQuerySearch({
    search_queries: search_queries.map((query) => ({
      query: query.query,
      maxResults: query.maxResults ?? DEFAULT_MAX_RESULTS,
    })),
    options: {
      baseProviderOptions: { provider: "firecrawl" },
      topics: safeTopics,
      excludeDomains: safeExcludeDomains,
    },
    // ...
  });
}
```

#### Parameter Descriptions for AI

**Detailed Descriptions:**
Every parameter includes a `.describe()` call that provides context to the AI model:

```typescript
// semantic-search.ts:40-48
inputSchema: z.object({
  query: z.string().describe("The search query in natural language"),
  limit: z
    .number()
    .min(1)
    .max(20)
    .optional()
    .describe("Maximum number of results to return (default: 5)"),
})
```

The AI model uses these descriptions to understand:
- What each parameter represents
- When to use specific values
- Valid ranges and constraints
- Default behavior when parameters are omitted

### 5. Response Formatting

#### Streaming Updates via DataStream

**Real-Time Progress Updates:**
Tools write intermediate updates to the `dataStream` for real-time UI feedback:

```typescript
// semantic-search.ts:53-61: Start notification
dataStream.write({
  type: "data-researchUpdate",
  data: {
    title: "Searching documents",
    timestamp: Date.now(),
    type: "started",
  },
});

// semantic-search.ts:122-130: Completion notification
dataStream.write({
  type: "data-researchUpdate",
  data: {
    title: "Search complete",
    timestamp: Date.now(),
    type: "completed",
  },
});
```

**Custom Data Types:**
The application defines custom stream data types (`lib/ai/types.ts:123-138`):

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
  researchUpdate: ResearchUpdate;  // Tool progress updates
  followupSuggestions: FollowupSuggestions;
};
```

#### Structured Return Values

**Type-Safe Outputs:**
Each tool defines its expected output type:

```typescript
// semantic-search.ts:27-30: Output type definition
export type SemanticSearchOutput = {
  results: SearchResultItem[];
  totalResults: number;
};

// semantic-search.ts:18-25: Individual result item type
export type SearchResultItem = {
  documentId: string;
  documentName: string;
  chunkContent: string;
  pageNumber: number | null;
  relevanceScore: number;
  blobUrl: string;
};

// semantic-search.ts:140-143: Return structured data
return {
  results,
  totalResults: results.length,
};
```

**Union Types for Multi-Action Tools:**
```typescript
// hr-case.ts:73-91: Union type with discriminated actions
export type HRCaseOutput =
  | {
      action: "create";
      case: HRCase;
      message: string;
    }
  | {
      action: "status";
      case: HRCase;
    }
  | {
      action: "list";
      cases: HRCase[];
      totalOpen: number;
      totalClosed: number;
    }
  | {
      error: string;
    };
```

#### UI Rendering of Tool Results

**Message Parts Component:**
The `message-parts.tsx` component handles rendering different tool result types:

```typescript
// message-parts.tsx:149-150: Weather tool result
if (type === "tool-getWeather") {
  const { toolCallId, state } = part;
  // ... render Weather component
}

// Various tool result renderers imported:
// Line 11: BenefitsInfoResult
// Line 12: CodeInterpreterMessage
// Line 13-14: DocumentToolCall, DocumentToolResult
// Line 15: FileRetrieveResult
// Line 16: GeneratedImage
// Line 17: HRCaseResult
// Line 18: LeaveBalanceResult
// Line 22: PeopleSearchResult
// Line 25: SemanticSearchResult
// Line 26: StockChartMessage
// Line 27: TeamAvailabilityResult
```

**Research Updates Collection:**
```typescript
// message-parts.tsx:69-107: Collect research updates between tool invocations
function useResearchUpdates(
  messageId: string,
  partIdx: number,
  type: ChatMessage["parts"][number]["type"]
) {
  const types = useMessagePartTypesById(messageId);
  const startIdx = partIdx;
  const nextIdx = types.findIndex(
    (t, i) =>
      i > startIdx && (t === "tool-deepResearch" || t === "tool-webSearch")
  );

  // Find all data-researchUpdate parts between tool invocations
  let sliceEnd = nextIdx === -1 ? types.length - 1 : nextIdx - 1;
  if (type !== "tool-deepResearch" && type !== "tool-webSearch") {
    sliceEnd = startIdx;
  }

  const range = useMessagePartsByPartRange(messageId, startIdx + 1, sliceEnd);

  return range
    .filter((p) => p.type === "data-researchUpdate")
    .map((u) => u.data);
}
```

### 6. Error Handling

#### Tool-Level Error Handling

**Try-Catch Pattern:**
All tool execute functions use try-catch blocks with structured error returns:

```typescript
// semantic-search.ts:63-162: Error handling with logging
try {
  const vectorStoreId = await getVectorStoreId();

  if (!vectorStoreId) {
    log.warn("semanticSearch: no vector store found");
    return {
      results: [],
      totalResults: 0,
    };
  }

  // Perform search...
  const searchResults = await searchVectorStore(vectorStoreId, query, limit);

  // Process results...

  return {
    results,
    totalResults: results.length,
  };
} catch (error) {
  log.error(
    {
      ms: Date.now() - startMs,
      error: {
        name: (error as Error).name,
        message: (error as Error).message,
      },
    },
    "semanticSearch: failure"
  );

  return {
    error: `Search failed: ${(error as Error).message}`,
    results: [],
    totalResults: 0,
  };
}
```

**Graceful Degradation:**
Tools return valid response structures even on error, allowing the conversation to continue:

```typescript
// hr-case.ts:534-539: Error handling that returns error object
try {
  // ... execute logic
} catch (error) {
  log.error({ error }, "hrCase: failure");
  return {
    error: `Failed to ${action} HR case: ${(error as Error).message}`,
  };
}
```

#### Structured Logging

**Module-Specific Loggers:**
All tools use structured logging via `createModuleLogger`:

```typescript
// semantic-search.ts:11
const log = createModuleLogger("ai.tools.semantic-search");

// semantic-search.ts:50-51: Start logging
log.info({ query, limit }, "semanticSearch: start");

// semantic-search.ts:75-76: Debug logging
log.debug({ vectorStoreId }, "semanticSearch: performing search");

// semantic-search.ts:131-137: Success logging with metrics
log.info(
  {
    ms: Date.now() - startMs,
    resultCount: results.length,
  },
  "semanticSearch: success"
);
```

**Timing Metrics:**
Tools consistently track execution time:

```typescript
// generate-image.ts:46
const startMs = Date.now();

// generate-image.ts:160-167: Log completion time
log.info(
  {
    mode: "generate",
    ms: Date.now() - startMs,
    imageUrl: result.url,
    uploadedFilename: filename,
  },
  "generateImage: success"
);
```

#### API-Level Error Handling

**streamText Error Handler:**
```typescript
// route.ts:565-567
onError: (error) => {
  log.error({ error }, "streamText error");
}
```

**Credit Reservation Cleanup:**
```typescript
// route.ts:473-480: Abort controller with timeout cleanup
const abortController = new AbortController();
const timeoutId = setTimeout(async () => {
  if (reservation) {
    await reservation.cleanup();
  }
  abortController.abort();
}, 290_000); // 290 seconds

// route.ts:692-704: Error handler with credit refund
onError: (error) => {
  clearTimeout(timeoutId);
  log.error({ error }, "onError");
  // Release reserved credits on error
  if (reservation) {
    reservation.cleanup();
  }
  if (anonymousSession) {
    anonymousSession.remainingCredits += baseModelCost;
    setAnonymousSession(anonymousSession);
  }
  return "Oops, an error occured!";
}
```

**HTTP Error Responses:**
```typescript
// route.ts:364-372: Credit reservation error
if (creditError) {
  console.log("RESPONSE > POST /api/chat: Credit reservation error:", creditError);
  return new Response(creditError, { status: 402 });
}

// route.ts:412-421: Insufficient budget error
if (
  explicitlyRequestedTools &&
  explicitlyRequestedTools.length > 0 &&
  !activeTools.some((tool: ToolName) =>
    explicitlyRequestedTools.includes(tool)
  )
) {
  log.warn({ explicitlyRequestedTools }, "Insufficient budget for requested tool");
  return new Response(
    `Insufficient budget for requested tool: ${explicitlyRequestedTools}.`,
    { status: 402 }
  );
}
```

#### Client-Side Error Handling

**Data Stream Handler:**
```typescript
// data-stream-handler.tsx:39-136: Process stream updates with error boundary
useEffect(() => {
  if (!dataStream?.length) {
    return;
  }

  const newDeltas = dataStream.slice(lastProcessedIndex.current + 1);
  lastProcessedIndex.current = dataStream.length - 1;

  newDeltas.forEach((delta) => {
    // Clear deepResearch tool when a research process completes
    if (delta.type === "data-researchUpdate") {
      const update: any = (delta as any).data;
      if (update?.type === "completed") {
        setSelectedTool((current) =>
          current === "deepResearch" ? null : current
        );
      }
    }

    // Process different delta types...
    setArtifact((draftArtifact) => {
      switch (delta.type) {
        case "data-id":
          return { ...draftArtifact, documentId: delta.data, status: "streaming" };
        case "data-messageId":
          return { ...draftArtifact, messageId: delta.data, status: "streaming" };
        case "data-title":
          return { ...draftArtifact, title: delta.data, status: "streaming" };
        case "data-kind":
          return { ...draftArtifact, kind: delta.data, status: "streaming" };
        case "data-clear":
          return { ...draftArtifact, content: "", status: "streaming" };
        case "data-finish":
          return { ...draftArtifact, status: "idle" };
        default:
          return draftArtifact;
      }
    });
  });
}, [dataStream, setArtifact, setMetadata, artifact, /* ... */]);
```

---

## Data Flow

### Complete Tool Invocation Flow

1. **User Request** → Chat UI (`components/multimodal-input.tsx`)
   - User types message or selects explicit tool from UI
   - Message metadata includes `selectedTool` and `selectedModel`

2. **API Route Handler** → `app/(chat)/api/chat/route.ts:161-782`
   - Extract `selectedTool` from message metadata (line 284)
   - Map explicit tool selection to `explicitlyRequestedTools` array (line 343-354)
   - Calculate base model cost (line 356)
   - Reserve credits for authenticated users or check anonymous limits (line 358-379)

3. **Tool Budget Filtering** → `route.ts:381-429`
   - Call `filterAffordableTools()` with available budget (line 381-388)
   - Remove incompatible tools based on model capabilities (line 391-403)
   - Override with explicit tools if requested by user (line 423-429)

4. **Tool Registration** → `lib/ai/tools/tools.ts:25-108`
   - Call `getTools()` with session, dataStream, and context (line 549-564 in route.ts)
   - Each tool factory function receives configuration
   - Tools conditionally included based on environment variables
   - Return typed object with all available tool instances

5. **AI Model Invocation** → `route.ts:523-576`
   - Call `streamText()` from Vercel AI SDK
   - Pass `activeTools` array (names of tools to make available)
   - Pass `tools` object (full registry from `getTools()`)
   - Include system prompt with tool usage instructions
   - Set up streaming with `dataStream` writer

6. **Tool Selection by AI** → Vercel AI SDK (internal)
   - AI model analyzes user message and system prompt
   - Decides which tool(s) to invoke based on descriptions
   - Generates tool call with parameters matching input schema

7. **Tool Execution** → Individual tool files
   - Vercel SDK validates parameters against Zod schema
   - Calls tool's `execute()` function with validated parameters
   - Tool writes progress updates to `dataStream`
   - Tool performs its operation (API calls, database queries, etc.)
   - Tool returns structured result object

8. **Response Streaming** → `route.ts:585-604`
   - Tool results merged into UI message stream
   - Custom transforms applied (markdown joiner)
   - Stream piped to client via Server-Sent Events (SSE)

9. **Client-Side Handling** → `components/data-stream-handler.tsx`
   - Data stream provider collects stream chunks
   - Data stream handler processes each delta
   - Updates artifact state (documents, images, etc.)
   - Triggers UI re-renders

10. **UI Rendering** → `components/message-parts.tsx`
    - Maps tool result types to UI components
    - Renders tool calls and results
    - Displays research updates and progress indicators
    - Shows citations and source links

11. **Credit Finalization** → `route.ts:621-688`
    - Calculate actual cost based on tools used (line 630-649)
    - Update message in database with final state (line 659-676)
    - Finalize credit reservation with actual cost (line 679-681)
    - Clean up on error and refund credits if needed (line 682-688)

---

## Key Patterns

### Factory Pattern
**Tools as Factory Functions:**
Most tools are exported as factory functions that accept configuration and return a tool instance:

```typescript
// Pattern used by most tools
export const toolName = ({ dataStream, session }: ToolProps) =>
  tool({
    description: "...",
    inputSchema: z.object({ /* ... */ }),
    execute: async (params) => { /* ... */ },
  });
```

**Benefits:**
- Tools can access contextual data (dataStream, session) via closure
- Configuration injected at registration time
- Each invocation uses the same configuration
- Type-safe configuration parameters

### Repository Pattern
**Database Access Abstraction:**
Tools use query functions from `lib/db/queries.ts` instead of direct database access:

```typescript
// semantic-search.ts:64-65
const vectorStoreId = await getVectorStoreId();

// semantic-search.ts:93-96
const document = await getUploadedDocumentByOpenAIFileId(
  result.file_id
);
```

### Streaming Architecture
**Progressive Response Pattern:**
Tools write incremental updates to allow real-time UI feedback:

```typescript
// Pattern: Start notification
dataStream.write({
  type: "data-researchUpdate",
  data: { title: "Starting...", timestamp: Date.now(), type: "started" },
});

// ... perform work ...

// Pattern: Completion notification
dataStream.write({
  type: "data-researchUpdate",
  data: { title: "Complete", timestamp: Date.now(), type: "completed" },
});
```

### Budget-Based Tool Selection
**Credit Reservation and Filtering:**
Tools have associated costs that determine availability:

```typescript
// route.ts:381-388
let activeTools: ToolName[] = filterAffordableTools(
  isAnonymous ? ANONYMOUS_LIMITS.AVAILABLE_TOOLS : allTools,
  isAnonymous
    ? ANONYMOUS_LIMITS.CREDITS
    : reservation
      ? reservation.budget - baseModelCost
      : 0
);
```

**Cost Calculation:**
```typescript
// route.ts:630-649: Calculate actual cost after execution
const actualCost =
  baseModelCost +
  messages
    .flatMap((message) => message.parts)
    .reduce((acc, toolResult) => {
      if (!toolResult.type.startsWith("tool-")) {
        return acc;
      }

      const toolDef =
        toolsDefinitions[
          toolResult.type.replace("tool-", "") as ToolName
        ];

      if (!toolDef) {
        return acc;
      }

      return acc + toolDef.cost;
    }, 0);
```

### Discriminated Union Types
**Type-Safe Multi-Action Results:**
Tools with multiple actions use discriminated unions:

```typescript
// hr-case.ts:73-91
export type HRCaseOutput =
  | { action: "create"; case: HRCase; message: string; }
  | { action: "status"; case: HRCase; }
  | { action: "list"; cases: HRCase[]; totalOpen: number; totalClosed: number; }
  | { error: string; };

// TypeScript narrows type based on discriminant
if (result.action === "create") {
  // result.case and result.message are available
  console.log(result.message);
}
```

### Early Exit Pattern
**Validation and Guard Clauses:**
```typescript
// semantic-search.ts:64-73: Early exit if no vector store
const vectorStoreId = await getVectorStoreId();

if (!vectorStoreId) {
  log.warn("semanticSearch: no vector store found");
  return {
    results: [],
    totalResults: 0,
  };
}

// hr-case.ts:399-401: Validate required parameters
if (!description) {
  return { error: "Description is required to create a case" };
}
```

---

## Configuration

### Environment Variables

**Tool Availability:**
- `NEXT_PUBLIC_TAVILY_AVAILABLE` - Enables web search and deep research tools
- `NEXT_PUBLIC_SANDBOX_AVAILABLE` - Enables code interpreter and stock chart tools
- `NEXT_PUBLIC_OPENAI_AVAILABLE` - Enables image generation and semantic search tools

**API Keys:**
- `OPENAI_API_KEY` - Required for image generation, semantic search, file retrieval
- `TAVILY_API_KEY` - Required for web search functionality
- `E2B_API_KEY` - Required for code interpreter sandbox

**Model Selection:**
- `CHAT_MODEL` - Default model for chat (can be overridden per message)
- `IMAGE_GEN_MODEL` - Model for image generation (defaults to `DEFAULT_IMAGE_MODEL`)
- `DISABLE_MODEL_SELECTION` - Forces use of `CHAT_MODEL` for all requests

**Redis Configuration:**
- `REDIS_URL` - Required for resumable streams and rate limiting

### Tool Cost Configuration

Defined in `lib/ai/tools/tools-definitions.ts:3-99`:

| Tool | Cost | Usage |
|------|------|-------|
| getWeather | 1 | Weather information |
| retrieve | 1 | Fetch content from URL |
| fileRetrieve | 1 | Get document files |
| readDocument | 1 | Read artifact content |
| stockChart | 1 | Stock data visualization |
| requestSuggestions | 1 | Document suggestions |
| leaveBalance | 2 | Leave balance queries |
| benefitsInfo | 2 | Benefits information |
| peopleSearch | 2 | Employee lookup |
| webSearch | 3 | Web search queries |
| semanticSearch | 3 | Document semantic search |
| teamAvailability | 3 | Team availability (managers) |
| hrCase | 3 | HR case management |
| createDocument | 5 | Create artifacts |
| updateDocument | 5 | Update artifacts |
| codeInterpreter | 10 | Code execution |
| generateImage | 50 | Image generation |
| deepResearch | 50 | Multi-step research |

### Anonymous User Limits

Defined in `lib/types/anonymous.ts` (referenced in route.ts):

```typescript
export const ANONYMOUS_LIMITS = {
  CREDITS: 50,  // Total credits per session
  AVAILABLE_MODELS: [/* limited model list */],
  AVAILABLE_TOOLS: [/* limited tool list */],
};
```

### System Prompt Configuration

The system prompt at `lib/ai/prompts.ts:3-125` includes:
- Tool usage instructions for the AI
- When to use each tool
- Response formatting guidelines
- Citation requirements
- Language support (English/Arabic)
- Current date injection: `${new Date().toLocaleDateString()}`

---

## Type System

### Core Type Definitions

**Tool Name Enum:**
```typescript
// lib/ai/types.ts:31-50
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
  "semanticSearch",
  "fileRetrieve",
  "leaveBalance",
  "benefitsInfo",
  "hrCase",
  "teamAvailability",
  "peopleSearch",
]);

export type ToolName = keyof ChatTools;
```

**Tool Type Mapping:**
```typescript
// lib/ai/types.ts:98-117
export type ChatTools = {
  getWeather: InferUITool<typeof getWeather>;
  createDocument: InferUITool<ReturnType<typeof createDocument>>;
  updateDocument: InferUITool<ReturnType<typeof updateDocument>>;
  requestSuggestions: InferUITool<ReturnType<typeof requestSuggestions>>;
  deepResearch: InferUITool<ReturnType<typeof deepResearch>>;
  readDocument: InferUITool<ReturnType<typeof readDocument>>;
  generateImage: InferUITool<ReturnType<typeof generateImage>>;
  webSearch: InferUITool<ReturnType<typeof tavilyWebSearch>>;
  stockChart: InferUITool<typeof stockChart>;
  codeInterpreter: InferUITool<typeof codeInterpreter>;
  retrieve: InferUITool<typeof retrieve>;
  semanticSearch: InferUITool<ReturnType<typeof semanticSearch>>;
  fileRetrieve: InferUITool<ReturnType<typeof fileRetrieve>>;
  leaveBalance: InferUITool<ReturnType<typeof leaveBalance>>;
  benefitsInfo: InferUITool<ReturnType<typeof benefitsInfo>>;
  hrCase: InferUITool<ReturnType<typeof hrCase>>;
  teamAvailability: InferUITool<ReturnType<typeof teamAvailability>>;
  peopleSearch: InferUITool<ReturnType<typeof peopleSearch>>;
};
```

**Message Type:**
```typescript
// lib/ai/types.ts:140-145
export type ChatMessage = Omit<
  UIMessage<MessageMetadata, CustomUIDataTypes, ChatTools>,
  "metadata"
> & {
  metadata: MessageMetadata;
};
```

**Stream Writer:**
```typescript
// lib/ai/types.ts:149
export type StreamWriter = UIMessageStreamWriter<ChatMessage>;
```

### Vercel AI SDK Type Integration

**InferUITool:**
The `InferUITool` utility type from Vercel AI SDK extracts the type from a tool definition:

```typescript
import type { InferUITool } from "ai";

// For factory functions that return tools
type semanticSearchTool = InferUITool<ReturnType<typeof semanticSearch>>;

// For direct tool exports
type weatherTool = InferUITool<typeof getWeather>;
```

**UIMessage:**
The base message type from Vercel AI SDK, parameterized with custom types:

```typescript
UIMessage<
  MessageMetadata,      // Custom metadata (selectedModel, parentMessageId, etc.)
  CustomUIDataTypes,    // Custom streaming data types
  ChatTools            // Tool registry type
>
```

---

## Summary

The AgentDune Chat application implements a sophisticated tool system that seamlessly integrates with the Vercel AI SDK. Key architectural decisions include:

1. **Centralized Tool Registry** - Single source of truth at `lib/ai/tools/tools.ts` with conditional tool loading based on environment configuration

2. **Factory Pattern** - Tools are factory functions that receive context (dataStream, session) and return configured tool instances

3. **Budget-Based Tool Selection** - Dynamic tool filtering based on user credits and model capabilities, with explicit tool requests supported from UI

4. **Streaming Architecture** - Real-time progress updates via custom data stream types, enabling responsive UI feedback during long-running operations

5. **Type Safety** - Complete TypeScript coverage using Zod schemas for runtime validation and `InferUITool` for compile-time type checking

6. **Structured Error Handling** - Consistent error patterns with structured logging, graceful degradation, and automatic credit refunds on failures

7. **Modular Design** - Each tool is self-contained with its own schema, execution logic, and error handling, making the system highly maintainable

The system successfully handles 18 different tools ranging from simple weather queries to complex multi-step research operations, with seamless integration between the Vercel AI SDK, backend services, and React UI components.
