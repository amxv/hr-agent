# Message Parts Structure and Tool Results Rendering

## Overview

The codebase uses Vercel AI SDK v5.0.39 (`ai` package) with a custom messaging system built on `UIMessage` types. Message parts form the core data structure for communicating between the chat API and UI components. Each message contains an array of parts, where each part represents either text, tool calls/results, reasoning, or custom data (like search updates). Tool parts have a lifecycle with distinct states: `input-available` (when a tool is being called) and `output-available` (when the result is returned).

## Type Definitions

### ChatMessage Type (`/lib/ai/types.ts:112-117`)

```typescript
export type ChatMessage = Omit<
  UIMessage<MessageMetadata, CustomUIDataTypes, ChatTools>,
  "metadata"
> & {
  metadata: MessageMetadata;
};
```

The `ChatMessage` type is built on Vercel AI SDK's `UIMessage` generic type with three type parameters:
- **MessageMetadata**: Contains `createdAt`, `parentMessageId`, `selectedModel`, `isPartial`, `selectedTool`, and `usage`
- **CustomUIDataTypes**: Custom data types for non-tool parts (see below)
- **ChatTools**: Union of all available tool types

### CustomUIDataTypes (`/lib/ai/types.ts:95-110`)

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

These define custom data parts that stream through the message system (e.g., incremental text, research updates, suggestions).

### Available Tool Names (`/lib/ai/types.ts:24-36`)

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

Frontend-exposed tools are limited to: `webSearch`, `deepResearch`, `generateImage`, `createDocument`

## Message Parts Structure

### Part Types

Based on the rendering logic in `/components/message-parts.tsx`, message parts can have the following types:

1. **Text Parts**: `type: "text"`
   - Contains streamed text content
   - Rendered by `TextMessagePart` component (line 569-577)

2. **Reasoning Parts**: `type: "reasoning"`
   - Contains reasoning content from models with extended thinking
   - Multiple consecutive reasoning parts are grouped and rendered together (lines 531-552)
   - Rendered by `PureMessageReasoningParts` component (lines 476-517)

3. **Tool Parts**: `type: "tool-{toolName}"`
   - Examples: `tool-webSearch`, `tool-deepResearch`, `tool-generateImage`, `tool-createDocument`, `tool-updateDocument`, `tool-getWeather`, `tool-stockChart`, `tool-codeInterpreter`, `tool-requestSuggestions`, `tool-retrieve`, `tool-readDocument`
   - Each tool part has a `toolCallId` and `state` property
   - Can contain both input (arguments) and output (results)

4. **Data Parts**: `type: "data-{dataType}"`
   - Examples: `data-researchUpdate`, `data-followupSuggestions`, `data-textDelta`, `data-imageDelta`
   - Used for streaming auxiliary information between tool execution steps
   - Not directly rendered as message content

5. **File Parts**: `type: "file"`
   - User attachments
   - Include URL, filename, and media type properties

## Tool Part States and Structure

### Tool Part State Machine

Tool parts transition through two main states:

1. **`input-available`** (lines 143-158, 162-171, etc.)
   - Represents when a tool is being called with arguments
   - Part structure includes:
     - `type`: `"tool-{toolName}"`
     - `toolCallId`: Unique identifier for this tool invocation
     - `state`: `"input-available"`
     - `input`: Tool arguments/parameters object
   - UI typically shows a loading skeleton or preview of what will happen
   - Example: `/components/message-parts.tsx:162-171` shows `DocumentPreview` with `args={input}` for `createDocument`

2. **`output-available`** (lines 150-157, 175-210, etc.)
   - Represents when the tool has completed and returned a result
   - Part structure includes:
     - `type`: `"tool-{toolName}"`
     - `toolCallId`: Same as input
     - `state`: `"output-available"`
     - `input`: Original arguments (still available)
     - `output`: Result from the tool execution
   - UI displays the actual results

### Example Tool Part Lifecycle: Web Search

Web search shows research updates while executing:

1. **Input Phase** (line 454-459):
   - State is `input-available`
   - Renders `ResearchUpdates` component with empty updates array
   - Shows loading state

2. **Output Phase** (line 461-467):
   - State is `output-available`
   - Renders `ResearchUpdates` with accumulated updates
   - Search results now visible

The research updates are stored as separate `data-researchUpdate` parts that appear between the tool part and the next one, collected via `useResearchUpdates()` (lines 61-99).

### Example Tool Part: Image Generation

Image generation tool (lines 386-404):

1. **Input Phase**:
   ```typescript
   if (state === "input-available") {
     const { input } = part;
     return <GeneratedImage args={input} isLoading={true} />;
   }
   ```
   - Renders preview of what will be generated

2. **Output Phase**:
   ```typescript
   if (state === "output-available") {
     const { output, input } = part;
     return <GeneratedImage args={input} result={output} />;
   }
   ```
   - Displays the generated image URL from `output`

## Flow from Tool Execution to UI Rendering

### 1. Tool Execution Phase (`/app/(chat)/api/chat/route.ts:549-564`)

Tools are instantiated with a `dataStream` writer:

```typescript
tools: getTools({
  dataStream,
  session: { user: { id: userId || undefined }, expires: "noop" },
  contextForLLM,
  messageId,
  selectedModel: modelDefinition.apiModelId,
  attachments: userMessage.parts.filter((part) => part.type === "file"),
  lastGeneratedImage,
})
```

Each tool receives the `dataStream` to write intermediate updates (like `data-researchUpdate` parts).

### 2. Tool Result Writing

Tools return results through the `StreamWriter` interface. Example from web search tool (`/lib/ai/tools/web-search.ts:32-94`):

```typescript
if (writeTopLevelUpdates) {
  dataStream.write({
    type: "data-researchUpdate",
    data: {
      title,
      timestamp: Date.now(),
      type: "started",
    },
  });
}
```

Tool results are returned as plain objects (not written to stream by the tool):

```typescript
return { searches: searchResults };
```

### 3. Stream Creation (`/app/(chat)/api/chat/route.ts:521-604`)

The UI message stream is created with:

```typescript
const stream = createUIMessageStream<ChatMessage>({
  execute: async ({ writer: dataStream }) => {
    const result = streamText({
      // ... configuration
      tools: getTools({ dataStream, /* ... */ }),
    });

    dataStream.merge(
      result.toUIMessageStream({
        sendReasoning: true,
        messageMetadata: ({ part }) => {
          // Custom metadata handling
        },
      })
    );
    await result.consumeStream();
  },
  generateId: () => messageId,
  onFinish: async ({ messages, responseMessage }) => {
    // Save to database
  },
});
```

The `toUIMessageStream()` call (line 586) converts the LLM response into UI message parts, which creates the tool parts automatically based on the LLM's tool calls.

### 4. Stream to Database (`/app/(chat)/api/chat/route.ts:621-649`)

After streaming completes, the final message is saved to database:

```typescript
onFinish: async ({ messages, responseMessage }) => {
  // messages now contains all parts (text, tool parts, data parts)
  const actualCost = baseModelCost +
    messages
      .flatMap((message) => message.parts)
      .reduce((acc, toolResult) => {
        if (!toolResult.type.startsWith("tool-")) return acc;
        const toolDef = toolsDefinitions[
          toolResult.type.replace("tool-", "") as ToolName
        ];
        return acc + (toolDef?.cost ?? 0);
      }, 0);
}
```

Message parts are stored as JSON in database (`/lib/db/schema.ts:53`):

```typescript
parts: json("parts").notNull(),
```

### 5. UI Rendering (`/components/message-parts.tsx:519-592`)

The `PureMessageParts` component receives a message ID and:

1. Gets all part types via `useMessagePartTypesById()` hook (line 524)
2. Groups consecutive reasoning parts together (lines 531-552)
3. Renders each part:
   - Text parts via `TextMessagePart` (line 572-577)
   - Tool parts via `MessagePart` which dispatches to specific renderers (line 581-588)
   - Reasoning groups via `PureMessageReasoningParts` (line 559-566)

## Data Access Patterns

### Message Part Hooks (`/lib/stores/hooks-message-parts.ts`)

Three main hooks for accessing message parts with optimized subscriptions:

1. **`useMessagePartTypesById(messageId)`** (line 19-22):
   - Returns array of all part types for a message
   - Minimal subscription to just type array

2. **`useMessagePartByPartIdx(messageId, partIdx, type?)`** (lines 24-51):
   - Retrieves a single part by index with optional type assertion
   - Used by individual part renderers like `PureMessagePart` (line 136)

3. **`useMessagePartsByPartRange(messageId, startIdx, endIdx, type?)`** (lines 53-81):
   - Retrieves contiguous parts (used for reasoning groups)
   - Can filter by type
   - Used by `useResearchUpdates()` to collect intermediate updates

### Store Implementation (`/lib/stores/with-message-parts.ts`)

The message parts store augments the base chat store with three cached methods:

1. **`getMessagePartTypesById(messageId)`** (lines 64-74):
   ```typescript
   const message = (state._throttledMessages || state.messages).find(
     (msg) => msg.id === messageId
   );
   const { types } = extractPartTypes<UI_MESSAGE>(message);
   return types;
   ```
   - Extracts just the type from each part

2. **`getMessagePartsRangeCached(messageId, startIdx, endIdx, type?)`** (lines 75-103):
   ```typescript
   const baseSlice = message.parts.slice(start, end + 1);
   const result = type === undefined
     ? baseSlice
     : baseSlice.filter((p) => p.type === type);
   ```
   - Returns slice of parts, optionally filtered by type

3. **`getMessagePartByIdxCached(messageId, partIdx)`** (lines 104-119):
   ```typescript
   const selected = message.parts[partIdx];
   return selected;
   ```
   - Direct index access

## Structured Data Rendering Pattern

### Research Updates as Example (`/lib/ai/tools/research-updates-schema.ts`)

Research updates are a special pattern for streaming structured data during tool execution:

```typescript
export const ResearchUpdateSchema = z.discriminatedUnion("type", [
  WebSearchSchema,    // { type: "web", queries, results, status }
  StartedSchema,      // { type: "started", title, timestamp }
  CompletedSchema,    // { type: "completed", title, timestamp }
  ThoughtsSchema,     // { type: "thoughts", title, message, status }
  WritingSchema,      // { type: "writing", title, message?, status }
]);

export type ResearchUpdate = z.infer<typeof ResearchUpdateSchema>;
```

### Rendering Research Updates (`/components/research-task.tsx`)

Updates are rendered with a discriminated union pattern:

```typescript
export const ResearchTask = ({ update, minimal, isRunning }) => {
  return (
    <div className="group">
      {update.type === "web" && update.queries && (
        <div className="flex flex-wrap gap-2">
          {update.queries.map((query) => (
            <Badge key={...}>{query}</Badge>
          ))}
        </div>
      )}
      {update.type === "web" && update.status === "completed" &&
        update.results && (
        <div>
          {update.results.map((result) => (
            <WebSourceBadge key={...} result={result} />
          ))}
        </div>
      )}
      {/* ... other types ... */}
    </div>
  );
};
```

This pattern allows:
- Progressive disclosure of information
- Streaming intermediate results
- Type-safe rendering based on update type

## Message Part Writing Pattern

Tools write intermediate updates using the `dataStream` writer:

```typescript
const tavilyWebSearch = ({ dataStream, writeTopLevelUpdates }) =>
  tool({
    execute: async (input) => {
      // Write started event
      dataStream.write({
        type: "data-researchUpdate",
        data: { title: "Searching", type: "started", timestamp: Date.now() },
      });

      // Execute search
      const { searches } = await multiQueryWebSearchStep({ /* ... */ });

      // Write completed event
      dataStream.write({
        type: "data-researchUpdate",
        data: { title: "Search complete", type: "completed", timestamp: Date.now() },
      });

      // Return the tool result
      return { searches };
    },
  });
```

Key patterns:
1. Intermediate updates written to `dataStream` with `type: "data-*"`
2. Final tool result returned directly (not written to stream)
3. The AI SDK automatically wraps the returned result in a `tool-{toolName}` part with state `output-available`

## Database Persistence

### Message Storage (`/lib/db/schema.ts:44-61`)

```typescript
export const message = pgTable("Message", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  chatId: uuid("chatId").notNull(),
  parentMessageId: uuid("parentMessageId"),
  role: varchar("role").notNull(),
  parts: json("parts").notNull(),           // Full message parts array
  attachments: json("attachments").notNull(),
  createdAt: timestamp("createdAt").notNull(),
  annotations: json("annotations"),
  isPartial: boolean("isPartial").notNull().default(false),
  selectedModel: varchar("selectedModel", { length: 256 }).default(""),
  selectedTool: varchar("selectedTool", { length: 256 }).default(""),
  lastContext: json("lastContext"),
});
```

The entire `parts` array is stored as JSON, including all tool parts with their states and results.

### Clone and Transform Operations (`/lib/clone-messages.ts`)

Message cloning handles tool part transformations:

1. **`cloneMessages()`** (lines 6-42): Basic message cloning with new IDs
2. **`updateDocumentReferencesInMessageParts()`** (lines 53-132): Rewrites document IDs in tool output
   - Handles `tool-deepResearch`, `tool-updateDocument`, `tool-createDocument`
   - Only transforms parts with `state === "output-available"`
3. **`cloneAttachmentsInMessages()`** (lines 220-249): Re-uploads file attachments

This ensures that when conversations are cloned, tool results are properly updated with new resource IDs.

## Edge Cases and Special Handling

### Last Artifact Detection (`/components/message-parts.tsx:29-59`)

Special logic determines if a document tool result should show full preview or compact result:

```typescript
const isLastArtifact = (messages, currentToolCallId) => {
  let lastArtifact = null;
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message.role === "assistant") {
      for (const part of message.parts) {
        if (
          (part.type === "tool-createDocument" ||
            part.type === "tool-updateDocument" ||
            part.type === "tool-deepResearch") &&
          part.state === "output-available"
        ) {
          lastArtifact = { messageIndex: i, toolCallId: part.toolCallId };
          break;
        }
      }
    }
  }
  return lastArtifact?.toolCallId === currentToolCallId;
};
```

- Shows full `DocumentPreview` for the last artifact
- Shows compact `DocumentToolResult` for earlier artifacts

### Research Updates Collection (`/components/message-parts.tsx:61-99`)

`useResearchUpdates()` collects all `data-researchUpdate` parts between a tool part and the next tool:

```typescript
const _collectResearchUpdates = (parts, toolCallId, toolType) => {
  const startIdx = parts.findIndex(
    (p) => p.type === toolType && p.toolCallId === toolCallId
  );
  const endIdx = parts.findIndex(
    (p, i) =>
      i > startIdx &&
      (p.type === "tool-deepResearch" || p.type === "tool-webSearch")
  );
  const sliceEnd = endIdx === -1 ? parts.length : endIdx;
  return parts
    .slice(startIdx + 1, sliceEnd)
    .filter((p) => p.type === "data-researchUpdate")
    .map((u) => u.data);
};
```

This pattern allows related data parts to "belong" to the tool part that precedes them.

### Error Handling in Tools (`/components/message-parts.tsx:182-186, 236-240`)

Tool outputs are checked for errors and displayed specially:

```typescript
if (state === "output-available") {
  const { output } = part;
  if ("error" in output) {
    return (
      <div className="rounded border p-2 text-red-500" key={toolCallId}>
        Error: {String(output.error)}
      </div>
    );
  }
  // ... normal rendering
}
```

## Summary

The message parts system provides a flexible, streaming-first architecture for chat messages:

1. **Type Safety**: Built on Vercel AI SDK's `UIMessage` generics with custom type parameters
2. **Streaming Lifecycle**: Tool parts transition from `input-available` to `output-available`
3. **Structured Data**: Intermediate results flow as `data-*` parts alongside tool execution
4. **Optimized Rendering**: Hooks provide granular subscriptions to specific parts
5. **Persistent Storage**: Complete parts array stored as JSON in database
6. **Flexible Transformations**: Clone and update operations maintain referential integrity

This architecture enables real-time feedback during tool execution while maintaining a clean persistence model for the complete conversation history.
