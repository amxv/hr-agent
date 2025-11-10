# Tools Backend Architecture Research



**Date:** 2025-11-10

**Focus:** How tools are provided to the chat agent (backend/logic side)



---



## Executive Summary



The AgentDune Chat application uses the Vercel AI SDK (v5) to provide tool calling capabilities to AI agents. Tools are defined using the `tool()` function from the AI SDK, registered dynamically based on environment configuration and user permissions, and executed server-side during streaming text generation. The semantic search tool serves as the reference implementation for document RAG functionality, leveraging OpenAI's Vector Store API for semantic search across uploaded documents.



---



## Table of Contents



1. [Tool Definition Architecture](#tool-definition-architecture)

2. [Tool Registration & Availability](#tool-registration--availability)

3. [Tool Execution Flow](#tool-execution-flow)

4. [Semantic Search Tool - Deep Dive](#semantic-search-tool---deep-dive)

5. [Data Flow Diagrams](#data-flow-diagrams)

6. [Key Patterns & Best Practices](#key-patterns--best-practices)

7. [Configuration & Environment](#configuration--environment)



---



## Tool Definition Architecture



### Overview



Tools in AgentDune are defined using the Vercel AI SDK's `tool()` function. Each tool consists of:

- A description (used by the AI to understand when to use the tool)

- An input schema (Zod schema for type-safe parameters)

- An execute function (the actual tool logic)



### Tool Definition Registry



**File:** `/home/user/agentdune-chat/lib/ai/tools/tools-definitions.ts`



This file maintains metadata about all available tools:



```typescript

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

  fileRetrieve: {

    name: "fileRetrieve",

    description: "File Retrieve",

    cost: 1,

  },

  // ... other tools

};

```



**Key Points:**

- Each tool has a name, description, and credit cost

- The `cost` field is used for budget management and credit deduction

- Tool names must match the keys in `ChatTools` type (line 83-97 in `lib/ai/types.ts`)



### Tool Type System



**File:** `/home/user/agentdune-chat/lib/ai/types.ts`



The type system ensures compile-time safety for tool definitions:



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

  "semanticSearch",

  "fileRetrieve",

]);



export type ChatTools = {

  getWeather: weatherTool;

  createDocument: createDocumentTool;

  semanticSearch: semanticSearchTool;

  fileRetrieve: fileRetrieveTool;

  // ... other tools

};



export type ToolName = keyof ChatTools;

```



**Lines 26-40:** Zod schema defines all available tool names

**Lines 83-97:** Type definition for all chat tools using `InferUITool`

**Line 127:** `ToolName` type is derived from `ChatTools` keys



### Tool Implementation Pattern



All tools follow a consistent pattern. Here's a simple example:



**File:** `/home/user/agentdune-chat/lib/ai/tools/get-weather.ts`



```typescript

import { tool } from "ai";

import { z } from "zod";



export const getWeather = tool({

  description: "Get the current weather at a location",

  inputSchema: z.object({

    latitude: z.number(),

    longitude: z.number(),

  }),

  execute: async ({ latitude, longitude }) => {

    const response = await fetch(

      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}...`

    );

    const weatherData = await response.json();

    return weatherData as WeatherAtLocation;

  },

});

```



**Pattern Components:**

1. Import `tool` from "ai" SDK (line 1)

2. Define input schema with Zod (lines 6-9)

3. Implement execute function (lines 10-23)

4. Return structured data



---



## Tool Registration & Availability



### Dynamic Tool Registration



**File:** `/home/user/agentdune-chat/lib/ai/tools/tools.ts`



The `getTools()` function dynamically builds the tool registry based on:

- Environment configuration (which APIs are available)

- User session and permissions

- Current context (attachments, previous messages)



```typescript

export function getTools({

  dataStream,

  session,

  messageId,

  selectedModel,

  attachments = [],

  lastGeneratedImage = null,

  contextForLLM,

}: {

  dataStream: StreamWriter;

  session: Session;

  messageId: string;

  selectedModel: ModelId;

  attachments: FileUIPart[];

  lastGeneratedImage: { imageUrl: string; name: string } | null;

  contextForLLM: ModelMessage[];

}) {

  return {

    getWeather,

    createDocument: createDocumentTool({

      session,

      dataStream,

      contextForLLM,

      messageId,

      selectedModel,

    }),

    // Conditional tools based on environment

    ...(env.NEXT_PUBLIC_TAVILY_AVAILABLE

      ? {

          webSearch: tavilyWebSearch({

            dataStream,

            writeTopLevelUpdates: true,

          }),

        }

      : {}),

    ...(env.NEXT_PUBLIC_OPENAI_AVAILABLE

      ? {

          semanticSearch: semanticSearch({ dataStream }),

          fileRetrieve: fileRetrieve({ dataStream }),

        }

      : {}),

  };

}

```



**Lines 20-36:** Function signature defines required context

**Lines 37-96:** Return object with all available tools

**Lines 65-72, 74-94:** Conditional tool inclusion based on environment flags



### Tool Factory Pattern



Some tools are factory functions that return configured tool instances:



```typescript

// Factory function that takes dependencies

export const semanticSearch = ({ dataStream }: SemanticSearchProps) =>

  tool({

    description: "Search the organization's document library...",

    inputSchema: z.object({...}),

    execute: async ({ query, limit = 5 }) => {

      // Tool implementation uses injected dataStream

    },

  });

```



This pattern allows tools to:

- Access shared resources (dataStream, session)

- Maintain context across invocations

- Be configured at runtime



### Tool Filtering & Budget Management



**File:** `/home/user/agentdune-chat/app/(chat)/api/chat/route.ts`



Tools are filtered based on user budget and model capabilities:



```typescript

// Line 381-388: Filter tools based on available budget

let activeTools: ToolName[] = filterAffordableTools(

  isAnonymous ? ANONYMOUS_LIMITS.AVAILABLE_TOOLS : allTools,

  isAnonymous

    ? ANONYMOUS_LIMITS.CREDITS

    : reservation

      ? reservation.budget - baseModelCost

      : 0

);



// Line 391-403: Disable tools for models without proper support

if (modelDefinition?.input) {

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



**Line 381:** `filterAffordableTools()` removes tools user can't afford

**Line 391-403:** Model-specific tool filtering (e.g., disable expensive tools for reasoning models)



---



## Tool Execution Flow



### End-to-End Request Flow



```

1. User sends message

   ↓

2. POST /api/chat receives request (route.ts:161)

   ↓

3. Authentication & authorization checks (route.ts:198-281)

   ↓

4. Tool filtering & budget reservation (route.ts:381-429)

   ↓

5. Create UI message stream (route.ts:521)

   ↓

6. Call streamText with tools (route.ts:523)

   ↓

7. AI decides to call tool → execute function runs

   ↓

8. Tool result streamed to client via dataStream

   ↓

9. AI receives result, continues generation

   ↓

10. Save final message & finalize credits (route.ts:621-689)

```



### Chat Route - Core Logic



**File:** `/home/user/agentdune-chat/app/(chat)/api/chat/route.ts`



The main POST handler orchestrates the entire flow:



```typescript

export async function POST(request: NextRequest) {

  // 1. Parse request (lines 164-172)

  const { id: chatId, message: userMessage, prevMessages } = await request.json();



  // 2. Extract selected model (lines 180-196)

  let selectedModelId = userMessage.metadata?.selectedModel as AppModelId;



  // 3. Auth & rate limiting (lines 198-281)

  const session = await auth.api.getSession({ headers: await headers() });



  // 4. Budget & credit reservation (lines 356-379)

  const { reservation: res, error: creditError } =

    await getCreditReservation(userId, baseModelCost);



  // 5. Filter affordable tools (lines 381-403)

  let activeTools: ToolName[] = filterAffordableTools(...);



  // 6. Build message context (lines 445-470)

  const messages = [...messageThreadToParent, userMessage].slice(-5);

  const contextForLLM = await replaceFilePartUrlByBinaryDataInMessages(modelMessages);



  // 7. Create streaming response (lines 521-576)

  const stream = createUIMessageStream<ChatMessage>({

    execute: async ({ writer: dataStream }) => {

      const result = streamText({

        model: getLanguageModel(modelDefinition.apiModelId),

        system: systemPrompt(),

        messages: contextForLLM,

        activeTools,

        tools: getTools({

          dataStream,

          session,

          contextForLLM,

          messageId,

          selectedModel: modelDefinition.apiModelId,

          attachments,

          lastGeneratedImage,

        }),

      });

      // ... stream handling

    },

  });



  // 8. Return streaming response (lines 740-763)

  return new Response(stream.pipeThrough(new JsonToSseTransformStream()), {

    headers: {

      "Content-Type": "text/event-stream",

      "Cache-Control": "no-cache",

      Connection: "keep-alive",

    },

  });

}

```



### Tool Invocation Mechanism



When the AI decides to call a tool:



1. **AI SDK detects tool call need** - Model returns structured tool call request

2. **SDK invokes execute function** - Calls the tool's execute method with parsed parameters

3. **Tool runs asynchronously** - Execute function performs its operation

4. **Results streamed back** - Tool can stream intermediate updates via `dataStream`

5. **AI receives result** - Tool output becomes part of conversation context

6. **AI continues** - Model generates response incorporating tool results



### DataStream Updates



Tools can send real-time updates to the UI:



```typescript

// Example from semantic-search.ts (lines 54-61)

dataStream.write({

  type: "data-researchUpdate",

  data: {

    title: "Searching documents",

    timestamp: Date.now(),

    type: "started",

  },

});

```



**Custom Data Types (lib/ai/types.ts:103-118):**

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



## Semantic Search Tool - Deep Dive



### Overview



The semantic search tool is the core of the document RAG system. It searches across uploaded documents using OpenAI's Vector Store API and returns relevant text passages with citations.



**File:** `/home/user/agentdune-chat/lib/ai/tools/semantic-search.ts`



### Complete Implementation Analysis



```typescript

export const semanticSearch = ({ dataStream }: SemanticSearchProps) =>

  tool({

    description:

      "Search the organization's document library using semantic similarity to find relevant information. Returns text passages with citations to source documents.",

    inputSchema: z.object({

      query: z.string().describe("The search query in natural language"),

      limit: z

        .number()

        .min(1)

        .max(20)

        .optional()

        .describe("Maximum number of results to return (default: 5)"),

    }),

    execute: async ({ query, limit = 5 }: SemanticSearchInput) => {

      const startMs = Date.now();

      log.info({ query, limit }, "semanticSearch: start");



      // 1. Write data stream update: Search started

      dataStream.write({

        type: "data-researchUpdate",

        data: {

          title: "Searching documents",

          timestamp: Date.now(),

          type: "started",

        },

      });



      try {

        // 2. Get vector store ID from database

        const vectorStoreId = await getVectorStoreId();



        if (!vectorStoreId) {

          log.warn("semanticSearch: no vector store found");

          return {

            results: [],

            totalResults: 0,

          };

        }



        // 3. Use Vector Store Search API

        const searchResults = await searchVectorStore(

          vectorStoreId,

          query,

          limit

        );



        // 4. Map search results to our format

        const results: SearchResultItem[] = [];



        for (const result of searchResults.data) {

          // Get document from database using openaiFileId

          const document = await getUploadedDocumentByOpenAIFileId(

            result.file_id

          );



          if (!document) {

            log.warn(

              { fileId: result.file_id },

              "semanticSearch: document not found in database"

            );

            continue;

          }



          // Extract text content from result

          const chunkContent = result.content

            .filter((c) => c.type === "text")

            .map((c) => c.text)

            .join("\n");



          results.push({

            documentId: document.id,

            documentName: document.filename,

            chunkContent,

            pageNumber: null,

            relevanceScore: result.score,

            blobUrl: document.blobUrl,

          });

        }



        // 5. Write data stream update: Search completed

        dataStream.write({

          type: "data-researchUpdate",

          data: {

            title: "Search complete",

            timestamp: Date.now(),

            type: "completed",

          },

        });



        return {

          results,

          totalResults: results.length,

        };

      } catch (error) {

        log.error({ error }, "semanticSearch: failure");

        return {

          error: `Search failed: ${(error as Error).message}`,

          results: [],

          totalResults: 0,

        };

      }

    },

  });

```



### Step-by-Step Execution Flow



#### Step 1: Tool Definition (lines 36-48)



- Factory function accepts `dataStream` dependency

- Returns configured `tool()` instance

- Description helps AI understand when to use the tool

- Input schema validates `query` (string) and `limit` (optional number, 1-20, default 5)



#### Step 2: Execution Starts (lines 49-51)



- Logs start time for performance tracking

- Structured logging with query and limit parameters



#### Step 3: UI Update - Search Started (lines 54-61)



- Writes `data-researchUpdate` to stream

- UI displays "Searching documents" indicator

- This happens before the actual search for better UX



#### Step 4: Get Vector Store ID (lines 64-73)



**Calls:** `lib/db/queries.ts:726` - `getVectorStoreId()`



```typescript

export async function getVectorStoreId(): Promise<string | null> {

  const [config] = await db

    .select()

    .from(vectorStoreConfig)

    .where(eq(vectorStoreConfig.id, "singleton"))



  return config?.vectorStoreId ?? null;

}

```



- Retrieves singleton vector store ID from database

- Returns null if no vector store exists yet

- Vector store is created when first document is uploaded



#### Step 5: Perform Semantic Search (lines 78-82)



**Calls:** `lib/openai/vector-store.ts:262` - `searchVectorStore()`



```typescript

export async function searchVectorStore(

  vectorStoreId: string,

  query: string,

  maxNumResults = 10

): Promise<{

  data: Array<{

    file_id: string;

    filename: string;

    score: number;

    content: Array<{

      type: string;

      text: string;

    }>;

  }>;

}> {

  const results = await withRetry(() =>

    openaiClient.vectorStores.search(vectorStoreId, {

      query,

      max_num_results: maxNumResults,

    })

  );



  return results;

}

```



**OpenAI API Call:** `openaiClient.vectorStores.search()` (line 279)

- Uses new Vector Store Search API (not Assistants API)

- Performs semantic similarity search

- Returns ranked results with relevance scores

- Automatically handles chunking and embedding



#### Step 6: Map Results to Application Format (lines 89-120)



For each search result:



1. **Look up document metadata** (lines 93-96)

   - Calls `getUploadedDocumentByOpenAIFileId()` (lib/db/queries.ts:1007)

   - Maps OpenAI file_id to database document record

   - Retrieves document ID, filename, blobUrl



2. **Extract text content** (lines 107-110)

   - Filters content array for text chunks

   - Joins multiple text chunks with newlines

   - Stores in `chunkContent` field



3. **Build result object** (lines 112-119)

   ```typescript

   {

     documentId: document.id,        // Internal document ID

     documentName: document.filename, // Display name

     chunkContent,                    // Actual text chunk

     pageNumber: null,                // OpenAI doesn't provide this

     relevanceScore: result.score,    // Semantic similarity score

     blobUrl: document.blobUrl,       // URL for document access

   }

   ```



#### Step 7: UI Update - Search Complete (lines 123-130)



- Writes completion update to stream

- UI can show "Search complete" message

- Total time logged



#### Step 8: Return Results (lines 140-143)



- Returns structured object with results array and total count

- AI receives this and can cite documents in response

- Error handling returns empty results with error message



### OpenAI Vector Store Integration



#### Vector Store Client



**File:** `/home/user/agentdune-chat/lib/openai/client.ts`



```typescript

import OpenAI from "openai";

import { env } from "@/lib/env";



export const openaiClient = new OpenAI({

  apiKey: env.OPENAI_API_KEY,

});

```



**Note:** This is a separate client from the AI SDK's OpenAI provider

- Used specifically for Files API and Vector Stores API

- Not routed through Vercel AI Gateway

- Requires direct OpenAI API key



#### Vector Store Operations



**File:** `/home/user/agentdune-chat/lib/openai/vector-store.ts`



##### Get or Create Vector Store (lines 16-59)



```typescript

export async function getOrCreateVectorStore(): Promise<string> {

  // Try to get existing vector store ID from database

  const existingVectorStoreId = await getVectorStoreId();



  if (existingVectorStoreId) {

    return existingVectorStoreId;

  }



  // Create new vector store

  const vectorStore = await withRetry(() =>

    openaiClient.vectorStores.create({

      name: "Organization Documents",

    })

  );



  // Save vector store ID to database

  await setVectorStoreId(vectorStore.id);



  return vectorStore.id;

}

```



- Singleton pattern: one vector store per organization

- ID stored in database `vectorStoreConfig` table

- Created on-demand when first document is uploaded



##### Add File to Vector Store (lines 70-99)



```typescript

export async function addFileToVectorStore(

  vectorStoreId: string,

  fileId: string

): Promise<void> {

  await withRetry(() =>

    openaiClient.vectorStores.files.create(vectorStoreId, {

      file_id: fileId,

    })

  );

}

```



- Non-blocking: file indexing happens asynchronously

- OpenAI processes and embeds document in background

- Status must be polled to check completion



##### Check File Processing Status (lines 206-248)



```typescript

export async function getVectorStoreFileStatus(

  vectorStoreId: string,

  fileId: string

): Promise<{

  status: "in_progress" | "completed" | "failed" | "cancelled";

  lastError: { code: string; message: string } | null;

}> {

  const file = await withRetry(() =>

    openaiClient.vectorStores.files.retrieve(fileId, {

      vector_store_id: vectorStoreId,

    })

  );



  return {

    status: file.status,

    lastError: file.last_error ? {...} : null,

  };

}

```



- Used during document upload to track processing

- Status transitions: `in_progress` → `completed` or `failed`

- CRITICAL: Must check individual file status, not aggregate counts



#### File Operations



**File:** `/home/user/agentdune-chat/lib/openai/files.ts`



##### Upload File (lines 17-73)



```typescript

export async function uploadFileToOpenAI(

  filename: string,

  fileBuffer: Buffer

): Promise<string> {

  const file = new File([fileBuffer], filename, {

    type: "application/octet-stream",

  });



  const uploadedFile = await withRetry(() =>

    openaiClient.files.create({

      file,

      purpose: "assistants",

    })

  );



  return uploadedFile.id;

}

```



- Converts Buffer to File object for OpenAI API

- Purpose "assistants" enables vector store usage

- Returns file ID for vector store association



##### Retrieve File Content (lines 90-146)



```typescript

export async function retrieveFileContent(

  vectorStoreId: string,

  fileId: string

): Promise<string> {

  const page = await withRetry(() =>

    openaiClient.vectorStores.files.content(fileId, {

      vector_store_id: vectorStoreId,

    })

  );



  const textChunks: string[] = [];



  for await (const chunk of page) {

    if (chunk?.type !== "text") continue;



    if (typeof chunk.text === "string") {

      textChunks.push(chunk.text);

    }

    // Handle different chunk.text formats

  }



  return textChunks.join("\n");

}

```



- Used by `fileRetrieve` tool to get full document content

- Iterates through all chunks asynchronously

- Handles various text chunk formats from OpenAI



### Database Integration



**File:** `/home/user/agentdune-chat/lib/db/queries.ts`



##### Vector Store Configuration (lines 726-771)



```typescript

// Get singleton vector store ID

export async function getVectorStoreId(): Promise<string | null> {

  const [config] = await db

    .select()

    .from(vectorStoreConfig)

    .where(eq(vectorStoreConfig.id, "singleton"))



  return config?.vectorStoreId ?? null;

}



// Set vector store ID (upsert)

export async function setVectorStoreId(vectorStoreId: string): Promise<void> {

  await db

    .insert(vectorStoreConfig)

    .values({

      id: "singleton",

      vectorStoreId,

      createdAt: new Date(),

    })

    .onConflictDoUpdate({

      target: vectorStoreConfig.id,

      set: {

        vectorStoreId,

        updatedAt: new Date(),

      },

    });

}

```



##### Document Queries (lines 875-1020)



```typescript

// Get document by internal ID

export async function getUploadedDocumentById(

  id: string

): Promise<UploadedDocument | null> {

  const [document] = await db

    .select()

    .from(uploadedDocument)

    .where(

      and(

        eq(uploadedDocument.id, id),

        isNull(uploadedDocument.deletedAt)

      )

    )



  return document ?? null;

}



// Get document by OpenAI file ID (used in semantic search)

export async function getUploadedDocumentByOpenAIFileId(

  openaiFileId: string

): Promise<UploadedDocument | null> {

  const [document] = await db

    .select()

    .from(uploadedDocument)

    .where(

      and(

        eq(uploadedDocument.openaiFileId, openaiFileId),

        isNull(uploadedDocument.deletedAt)

      )

    )



  return document ?? null;

}

```



### Complete Data Flow for Semantic Search



```

┌──────────────┐

│ User Message │

└──────┬───────┘

       │

       ▼

┌──────────────────────────┐

│ AI decides to call       │

│ semanticSearch tool      │

└──────┬───────────────────┘

       │

       ▼

┌──────────────────────────┐

│ Tool execute() called    │

│ with query parameter     │

└──────┬───────────────────┘

       │

       ▼

┌──────────────────────────┐

│ Get vectorStoreId from   │

│ database (singleton)     │

└──────┬───────────────────┘

       │

       ▼

┌──────────────────────────────────┐

│ Call OpenAI Vector Store API     │

│ openaiClient.vectorStores.search()│

└──────┬───────────────────────────┘

       │

       ▼

┌────────────────────────────┐

│ OpenAI performs:           │

│ 1. Query embedding         │

│ 2. Semantic similarity     │

│ 3. Ranking by relevance    │

└──────┬─────────────────────┘

       │

       ▼

┌────────────────────────────┐

│ Receive results with:      │

│ - file_id                  │

│ - filename                 │

│ - score                    │

│ - content chunks           │

└──────┬─────────────────────┘

       │

       ▼

┌────────────────────────────┐

│ For each result:           │

│ 1. Get document metadata   │

│    from DB by file_id      │

│ 2. Extract text content    │

│ 3. Build result object     │

└──────┬─────────────────────┘

       │

       ▼

┌────────────────────────────┐

│ Return results to AI with: │

│ - documentId               │

│ - documentName             │

│ - chunkContent             │

│ - relevanceScore           │

│ - blobUrl (for citations)  │

└──────┬─────────────────────┘

       │

       ▼

┌────────────────────────────┐

│ AI incorporates results    │

│ into response with inline  │

│ citations to documents     │

└────────────────────────────┘

```



### System Prompt Integration



**File:** `/home/user/agentdune-chat/lib/ai/prompts.ts`



The system prompt explicitly instructs the AI to use semantic search:



```typescript

export const systemPrompt = () => `You are an AI-powered HR Assistant...



## CRITICAL: Tool Usage Protocol



**ALWAYS use the Semantic Search tool for EVERY user question.** This is mandatory.



**How to use tools effectively:**

1. **Semantic Search** - Use this FIRST for every question to find relevant information

2. **File Retrieval** - Use this when you need complete documents



**Never answer questions without using these tools.**



## Answer Format Guidelines



### Always include citations

- Cite sources immediately after relevant information

- Format: [Document Name, Page X](URL)

- Make citations clickable and specific

...

```



**Lines 15-23:** Mandatory semantic search usage

**Lines 27-31:** Citation format requirements

**Lines 57-67:** Reinforces rules with checkmarks



---



## Data Flow Diagrams



### High-Level Tool Architecture



```

┌─────────────────────────────────────────────────────────┐

│                    Client (Browser)                      │

│                                                          │

│  ┌────────────────────────────────────────────────┐    │

│  │  POST /api/chat                                 │    │

│  │  { message, chatId, selectedModel }            │    │

│  └───────────────────────┬────────────────────────┘    │

│                          │                              │

└──────────────────────────┼──────────────────────────────┘

                           │

                           │ HTTP Request

                           │

                           ▼

┌─────────────────────────────────────────────────────────┐

│              Server: app/(chat)/api/chat/route.ts        │

│                                                          │

│  1. Parse request & extract model/message               │

│  2. Authenticate user session                           │

│  3. Reserve credits & filter affordable tools           │

│  4. Build message context (last 5 messages)             │

│  5. Call streamText() with tools                        │

│                                                          │

│  ┌─────────────────────────────────────────────┐       │

│  │  streamText({                                │       │

│  │    model: getLanguageModel(modelId),        │       │

│  │    system: systemPrompt(),                  │       │

│  │    messages: contextForLLM,                 │       │

│  │    activeTools: ["semanticSearch", ...],    │       │

│  │    tools: getTools({...})                   │       │

│  │  })                                          │       │

│  └─────────────────┬───────────────────────────┘       │

│                    │                                    │

└────────────────────┼────────────────────────────────────┘

                     │

                     │ Tools Registry

                     │

                     ▼

┌─────────────────────────────────────────────────────────┐

│              lib/ai/tools/tools.ts                       │

│                                                          │

│  getTools() returns:                                    │

│  {                                                      │

│    semanticSearch: semanticSearch({ dataStream }),     │

│    fileRetrieve: fileRetrieve({ dataStream }),         │

│    webSearch: tavilyWebSearch({ dataStream }),         │

│    createDocument: createDocumentTool({...}),          │

│    ...                                                 │

│  }                                                      │

│                                                          │

└─────────────────────┬───────────────────────────────────┘

                      │

                      │ AI decides to call tool

                      │

                      ▼

┌─────────────────────────────────────────────────────────┐

│         Tool Execute Function                            │

│         (e.g., semantic-search.ts)                       │

│                                                          │

│  1. Log start                                           │

│  2. Write "started" to dataStream                       │

│  3. Get vector store ID from database                   │

│  4. Call OpenAI Vector Store API                        │

│  5. Map results to application format                   │

│  6. Write "completed" to dataStream                     │

│  7. Return results                                      │

│                                                          │

└─────────────────────┬───────────────────────────────────┘

                      │

                      │ Results

                      │

                      ▼

┌─────────────────────────────────────────────────────────┐

│         AI SDK (streamText)                              │

│                                                          │

│  - Receives tool result                                 │

│  - Incorporates into context                            │

│  - Generates response with citations                    │

│  - Streams tokens to client                             │

│                                                          │

└─────────────────────┬───────────────────────────────────┘

                      │

                      │ SSE Stream

                      │

                      ▼

┌─────────────────────────────────────────────────────────┐

│                    Client (Browser)                      │

│                                                          │

│  - Receives streaming response                          │

│  - Displays tool progress updates                       │

│  - Renders final message with citations                 │

│                                                          │

└─────────────────────────────────────────────────────────┘

```



### Semantic Search Tool - Detailed Flow



```

┌──────────────────────────────────────────────────────────────┐

│ 1. AI calls semanticSearch({ query: "vacation policy" })     │

└───────────────────────────┬──────────────────────────────────┘

                            │

                            ▼

┌──────────────────────────────────────────────────────────────┐

│ 2. semantic-search.ts:execute()                              │

│    - Log: "semanticSearch: start"                            │

│    - dataStream.write({ type: "researchUpdate",              │

│                         data: { title: "Searching..." } })    │

└───────────────────────────┬──────────────────────────────────┘

                            │

                            ▼

┌──────────────────────────────────────────────────────────────┐

│ 3. lib/db/queries.ts:getVectorStoreId()                      │

│    SELECT vectorStoreId FROM vector_store_config             │

│    WHERE id = 'singleton'                                    │

│    → Returns: "vs_abc123xyz"                                 │

└───────────────────────────┬──────────────────────────────────┘

                            │

                            ▼

┌──────────────────────────────────────────────────────────────┐

│ 4. lib/openai/vector-store.ts:searchVectorStore()            │

│    openaiClient.vectorStores.search(                         │

│      "vs_abc123xyz",                                         │

│      { query: "vacation policy", max_num_results: 5 }        │

│    )                                                         │

└───────────────────────────┬──────────────────────────────────┘

                            │

                            ▼

┌──────────────────────────────────────────────────────────────┐

│ 5. OpenAI Vector Store API                                   │

│    - Embeds query "vacation policy"                          │

│    - Searches indexed document embeddings                    │

│    - Ranks by cosine similarity                              │

│    - Returns top 5 results with scores                       │

│                                                              │

│    Response:                                                 │

│    {                                                         │

│      data: [                                                 │

│        {                                                     │

│          file_id: "file-xyz789",                             │

│          filename: "employee-handbook.pdf",                  │

│          score: 0.89,                                        │

│          content: [                                          │

│            { type: "text", text: "Annual leave policy..." }  │

│          ]                                                   │

│        },                                                    │

│        ...                                                   │

│      ]                                                       │

│    }                                                         │

└───────────────────────────┬──────────────────────────────────┘

                            │

                            ▼

┌──────────────────────────────────────────────────────────────┐

│ 6. semantic-search.ts: Map results                           │

│    For each result:                                          │

│                                                              │

│    a) lib/db/queries.ts:getUploadedDocumentByOpenAIFileId() │

│       SELECT * FROM uploaded_documents                       │

│       WHERE openai_file_id = 'file-xyz789'                   │

│       → Returns: { id, filename, blobUrl, ... }              │

│                                                              │

│    b) Extract text chunks                                    │

│       chunkContent = result.content                          │

│         .filter(c => c.type === "text")                      │

│         .map(c => c.text)                                    │

│         .join("\n")                                          │

│                                                              │

│    c) Build SearchResultItem                                 │

│       {                                                      │

│         documentId: "doc_123",                               │

│         documentName: "employee-handbook.pdf",               │

│         chunkContent: "Annual leave policy...",              │

│         pageNumber: null,                                    │

│         relevanceScore: 0.89,                                │

│         blobUrl: "https://blob.store/doc_123.pdf"            │

│       }                                                      │

└───────────────────────────┬──────────────────────────────────┘

                            │

                            ▼

┌──────────────────────────────────────────────────────────────┐

│ 7. semantic-search.ts: Complete                              │

│    - dataStream.write({ type: "researchUpdate",              │

│                         data: { title: "Search complete" } }) │

│    - Log: "semanticSearch: success"                          │

│    - Return: { results: [...], totalResults: 5 }             │

└───────────────────────────┬──────────────────────────────────┘

                            │

                            ▼

┌──────────────────────────────────────────────────────────────┐

│ 8. AI SDK receives tool result                               │

│    Tool result becomes part of conversation context          │

│    AI can now cite documents in response:                    │

│                                                              │

│    "According to the employee handbook, you receive 20 days  │

│     of annual leave [employee-handbook.pdf](blob-url)"       │

└──────────────────────────────────────────────────────────────┘

```



---



## Key Patterns & Best Practices



### 1. Tool Definition Pattern



**Standard Structure:**

```typescript

import { tool } from "ai";

import { z } from "zod";



export const myTool = tool({

  description: "Clear description for AI to understand when to use this tool",

  inputSchema: z.object({

    param1: z.string().describe("What this parameter is for"),

    param2: z.number().optional().describe("Optional parameter"),

  }),

  execute: async ({ param1, param2 }) => {

    // Implementation

    return result;

  },

});

```



**Best Practices:**

- Clear, specific descriptions help AI make correct tool choices

- Use Zod `.describe()` for parameter-level documentation

- Return structured data that AI can easily parse

- Handle errors gracefully and return meaningful error messages



### 2. Factory Pattern for Dependency Injection



**When to use:**

- Tool needs access to shared resources (dataStream, session)

- Tool needs runtime configuration

- Tool has complex initialization



**Example:**

```typescript

export const myTool = ({ dataStream, session }: Props) =>

  tool({

    description: "...",

    inputSchema: z.object({...}),

    execute: async (params) => {

      // Can access dataStream and session here

      dataStream.write({...});

    },

  });

```



### 3. Streaming Updates Pattern



**For long-running operations:**

```typescript

execute: async (params) => {

  // Start

  dataStream.write({

    type: "data-researchUpdate",

    data: {

      title: "Starting operation...",

      timestamp: Date.now(),

      type: "started",

    },

  });



  // Do work

  const result = await performOperation();



  // Complete

  dataStream.write({

    type: "data-researchUpdate",

    data: {

      title: "Operation complete",

      timestamp: Date.now(),

      type: "completed",

    },

  });



  return result;

}

```



**Benefits:**

- Better UX with real-time feedback

- User sees progress for slow operations

- Can show intermediate results



### 4. Structured Logging Pattern



**Example from semantic-search.ts:**

```typescript

const log = createModuleLogger("ai.tools.semantic-search");



log.info({ query, limit }, "semanticSearch: start");

// ... operation ...

log.info(

  { ms: Date.now() - startMs, resultCount: results.length },

  "semanticSearch: success"

);

```



**Benefits:**

- Consistent log format across tools

- Easy debugging and monitoring

- Performance tracking with timestamps

- Structured data for log analysis



### 5. Error Handling Pattern



**Graceful degradation:**

```typescript

try {

  const result = await operation();

  return { result, error: null };

} catch (error) {

  log.error(

    {

      error: {

        name: (error as Error).name,

        message: (error as Error).message,

      },

    },

    "operation: failure"

  );



  return {

    error: `Operation failed: ${(error as Error).message}`,

    result: null,

  };

}

```



**Don't throw errors** - Return them as part of result so AI can handle gracefully



### 6. Cost Management Pattern



**Every tool has a cost:**

```typescript

// tools-definitions.ts

{

  semanticSearch: {

    name: "semanticSearch",

    description: "Semantic Search",

    cost: 3,  // Credits deducted when used

  },

}

```



**Tool filtering:**

```typescript

// route.ts:381

let activeTools: ToolName[] = filterAffordableTools(

  allTools,

  userBudget

);

```



**Actual cost calculation** (route.ts:630-649):

```typescript

const actualCost = baseModelCost +

  messages

    .flatMap((message) => message.parts)

    .reduce((acc, toolResult) => {

      if (!toolResult.type.startsWith("tool-")) return acc;



      const toolDef = toolsDefinitions[

        toolResult.type.replace("tool-", "") as ToolName

      ];



      return acc + (toolDef?.cost || 0);

    }, 0);

```



### 7. Conditional Tool Registration



**Based on environment:**

```typescript

return {

  // Always available

  getWeather,



  // Conditional on API availability

  ...(env.NEXT_PUBLIC_OPENAI_AVAILABLE

    ? {

        semanticSearch: semanticSearch({ dataStream }),

        fileRetrieve: fileRetrieve({ dataStream }),

      }

    : {}),



  ...(env.NEXT_PUBLIC_TAVILY_AVAILABLE

    ? {

        webSearch: tavilyWebSearch({ dataStream }),

      }

    : {}),

};

```



**Benefits:**

- Gracefully handle missing API keys

- Deploy without all services configured

- Different tool sets for different environments



### 8. Type Safety Pattern



**Leverage TypeScript:**

```typescript

// Define input/output types

export type SemanticSearchInput = {

  query: string;

  limit?: number;

};



export type SemanticSearchOutput = {

  results: SearchResultItem[];

  totalResults: number;

};



// Use in tool definition

execute: async ({ query, limit = 5 }: SemanticSearchInput): Promise<SemanticSearchOutput> => {

  // TypeScript ensures type safety

}

```



**Infer types from tool definitions:**

```typescript

type semanticSearchTool = InferUITool<ReturnType<typeof semanticSearch>>;

```



---



## Configuration & Environment



### Required Environment Variables



**For Semantic Search Tool:**

```bash

# OpenAI API Key (required)

OPENAI_API_KEY=sk-...



# Feature flag to enable semantic search

NEXT_PUBLIC_OPENAI_AVAILABLE=true

```



**For Other Tools:**

```bash

# Web search

NEXT_PUBLIC_TAVILY_AVAILABLE=true

TAVILY_API_KEY=tvly-...



# Code execution

NEXT_PUBLIC_SANDBOX_AVAILABLE=true

E2B_API_KEY=...

```



### Database Schema



**Vector Store Configuration Table:**

```sql

CREATE TABLE vector_store_config (

  id TEXT PRIMARY KEY DEFAULT 'singleton',

  vector_store_id TEXT NOT NULL,

  created_at TIMESTAMP DEFAULT NOW(),

  updated_at TIMESTAMP DEFAULT NOW()

);

```



**Uploaded Documents Table:**

```sql

CREATE TABLE uploaded_documents (

  id TEXT PRIMARY KEY,

  filename TEXT NOT NULL,

  content_type TEXT NOT NULL,

  file_size INTEGER NOT NULL,

  blob_url TEXT NOT NULL,

  openai_file_id TEXT UNIQUE NOT NULL,

  vector_store_id TEXT NOT NULL,

  status TEXT NOT NULL, -- 'uploading' | 'processing' | 'ready' | 'failed'

  uploaded_by TEXT NOT NULL,

  created_at TIMESTAMP DEFAULT NOW(),

  updated_at TIMESTAMP DEFAULT NOW(),

  deleted_at TIMESTAMP,

  tags TEXT[]

);

```



### Tool Registry Configuration



**File:** `/home/user/agentdune-chat/lib/ai/tools/tools-definitions.ts`



Add new tool:

1. Add entry to `toolsDefinitions` object

2. Add tool name to `toolNameSchema` in `lib/ai/types.ts`

3. Add tool type to `ChatTools` in `lib/ai/types.ts`

4. Implement tool in `lib/ai/tools/your-tool.ts`

5. Register in `getTools()` in `lib/ai/tools/tools.ts`



### Anonymous User Limits



**File:** `/home/user/agentdune-chat/lib/types/anonymous.ts`



```typescript

export const ANONYMOUS_LIMITS = {

  CREDITS: 100,

  AVAILABLE_MODELS: ["gpt-4o-mini"],

  AVAILABLE_TOOLS: [

    "getWeather",

    "retrieve",

    "webSearch",

    "semanticSearch",

    "fileRetrieve",

  ] as ToolName[],

};

```



Anonymous users have:

- Limited credits (100)

- Restricted model access

- Subset of available tools

- No expensive operations (deepResearch, generateImage)



---



## Creating a New Tool - Complete Guide



### Step 1: Define Tool Metadata



**File:** `lib/ai/tools/tools-definitions.ts`



```typescript

export const toolsDefinitions: Record<ToolName, ToolDefinition> = {

  // ... existing tools

  myNewTool: {

    name: "myNewTool",

    description: "Description for the tool",

    cost: 5,

  },

};

```



### Step 2: Update Type System



**File:** `lib/ai/types.ts`



Add to toolNameSchema:

```typescript

export const toolNameSchema = z.enum([

  // ... existing tools

  "myNewTool",

]);

```



Add type definition:

```typescript

import type { myNewTool } from "@/lib/ai/tools/my-new-tool";



type myNewToolType = InferUITool<ReturnType<typeof myNewTool>>;



export type ChatTools = {

  // ... existing tools

  myNewTool: myNewToolType;

};

```



### Step 3: Implement Tool



**File:** `lib/ai/tools/my-new-tool.ts`



```typescript

import { tool } from "ai";

import { z } from "zod";

import { createModuleLogger } from "@/lib/logger";

import type { StreamWriter } from "../types";



const log = createModuleLogger("ai.tools.my-new-tool");



export type MyNewToolInput = {

  param1: string;

  param2?: number;

};



export type MyNewToolOutput = {

  result: string;

  metadata?: Record<string, any>;

};



type MyNewToolProps = {

  dataStream: StreamWriter;

};



export const myNewTool = ({ dataStream }: MyNewToolProps) =>

  tool({

    description: `

      Detailed description of what this tool does.



      Use for:

      - Use case 1

      - Use case 2



      Avoid:

      - Anti-pattern 1

      - Anti-pattern 2

    `,

    inputSchema: z.object({

      param1: z.string().describe("Description of param1"),

      param2: z.number().optional().describe("Optional param2"),

    }),

    execute: async ({ param1, param2 }: MyNewToolInput): Promise<MyNewToolOutput> => {

      const startMs = Date.now();

      log.info({ param1, param2 }, "myNewTool: start");



      // Optional: Send start update

      dataStream.write({

        type: "data-researchUpdate",

        data: {

          title: "Processing...",

          timestamp: Date.now(),

          type: "started",

        },

      });



      try {

        // Your tool logic here

        const result = await performOperation(param1, param2);



        // Optional: Send completion update

        dataStream.write({

          type: "data-researchUpdate",

          data: {

            title: "Complete",

            timestamp: Date.now(),

            type: "completed",

          },

        });



        log.info(

          { ms: Date.now() - startMs },

          "myNewTool: success"

        );



        return {

          result: result.data,

          metadata: result.metadata,

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

          "myNewTool: failure"

        );



        return {

          error: `Operation failed: ${(error as Error).message}`,

          result: "",

        };

      }

    },

  });

```



### Step 4: Register Tool



**File:** `lib/ai/tools/tools.ts`



Import:

```typescript

import { myNewTool } from "@/lib/ai/tools/my-new-tool";

```



Add to getTools():

```typescript

export function getTools({...}) {

  return {

    // ... existing tools



    // Conditional registration (optional)

    ...(env.NEXT_PUBLIC_MY_SERVICE_AVAILABLE

      ? {

          myNewTool: myNewTool({ dataStream }),

        }

      : {}),



    // Or always available:

    myNewTool: myNewTool({ dataStream }),

  };

}

```



### Step 5: Test Tool



1. **Update system prompt** (optional, `lib/ai/prompts.ts`) to guide AI when to use tool

2. **Test in development:**

   - Start dev server

   - Send message that should trigger tool

   - Check logs for tool execution

   - Verify results displayed correctly

3. **Monitor logs:**

   - Look for "myNewTool: start" and "myNewTool: success"

   - Check for any errors



---



## Summary



The AgentDune tools backend architecture demonstrates:



1. **Clean Separation of Concerns**

   - Tool definitions separate from registration

   - Registration separate from execution

   - Each tool is self-contained



2. **Type Safety Throughout**

   - Zod schemas for runtime validation

   - TypeScript types for compile-time safety

   - InferUITool for automatic type inference



3. **Flexibility & Configurability**

   - Conditional tool registration

   - Environment-based feature flags

   - Budget-aware tool filtering



4. **Excellent Developer Experience**

   - Clear patterns to follow

   - Structured logging

   - Comprehensive error handling



5. **Production-Ready Features**

   - Credit management system

   - Streaming progress updates

   - Graceful degradation

   - Performance monitoring



The semantic search tool showcases all these patterns working together to provide a robust RAG system built on OpenAI's Vector Store API.



---



## Key Files Reference



**Tool Definitions & Types:**

- `/home/user/agentdune-chat/lib/ai/tools/tools-definitions.ts` - Tool metadata registry

- `/home/user/agentdune-chat/lib/ai/tools/tools.ts` - Tool factory and registration

- `/home/user/agentdune-chat/lib/ai/types.ts` - Type system for tools



**Semantic Search Implementation:**

- `/home/user/agentdune-chat/lib/ai/tools/semantic-search.ts` - Semantic search tool

- `/home/user/agentdune-chat/lib/ai/tools/file-retrieve.ts` - File retrieval tool

- `/home/user/agentdune-chat/lib/openai/vector-store.ts` - Vector store operations

- `/home/user/agentdune-chat/lib/openai/files.ts` - File operations

- `/home/user/agentdune-chat/lib/openai/client.ts` - OpenAI client setup



**Database Layer:**

- `/home/user/agentdune-chat/lib/db/queries.ts` - Database queries (lines 726-1020)

- `/home/user/agentdune-chat/lib/db/schema.ts` - Database schema



**Chat Route:**

- `/home/user/agentdune-chat/app/(chat)/api/chat/route.ts` - Main chat endpoint



**Configuration:**

- `/home/user/agentdune-chat/lib/ai/prompts.ts` - System prompts

- `/home/user/agentdune-chat/lib/env.ts` - Environment variables

- `/home/user/agentdune-chat/lib/types/anonymous.ts` - Anonymous user limits



**Other Tool Examples:**

- `/home/user/agentdune-chat/lib/ai/tools/get-weather.ts` - Simple tool example

- `/home/user/agentdune-chat/lib/ai/tools/web-search.ts` - Complex tool with streaming

- `/home/user/agentdune-chat/lib/ai/tools/create-document.ts` - Tool with artifacts