# Chat Infrastructure Research: Vercel AI SDK Integration & Model Selection

## Executive Summary

The chat infrastructure in this codebase uses the **Vercel AI SDK** for streaming LLM responses combined with a custom **Vercel Gateway** for unified access to multiple AI providers (OpenAI, Anthropic, Google, xAI, and many others). The system implements a sophisticated model selection system that allows users to switch between different AI providers through a dropdown UI, with model selection persisted in browser cookies and sent in message metadata to the backend API.

---

## 1. Vercel AI SDK Integration

### 1.1 Core SDK Dependencies

The application uses the Vercel AI SDK v5 with the following key imports:

**File**: `/Users/ashray/code/amxv/rag/app/(chat)/api/chat/route.ts:1-12`

```typescript
import {
  convertToModelMessages,
  createUIMessageStream,
  JsonToSseTransformStream,
  type ModelMessage,
  stepCountIs,
  streamObject,
  streamText,
} from "ai";
```

The application leverages these specific AI SDK utilities:
- **`streamText()`**: Main function for streaming text responses with tool support (line 514)
- **`createUIMessageStream()`**: Creates a structured message stream for client updates (line 512)
- **`JsonToSseTransformStream()`**: Transforms stream into Server-Sent Events format (line 4)
- **`convertToModelMessages()`**: Converts ChatMessage format to AI SDK ModelMessage format (line 2)
- **`streamObject()`**: Used for generating structured follow-up suggestions (line 7, line 120)

### 1.2 Streaming Implementation Architecture

**Entry Point**: `POST /api/chat` → `/Users/ashray/code/amxv/rag/app/(chat)/api/chat/route.ts:161`

The chat API endpoint handles streaming responses through a multi-stage pipeline:

1. **Request Intake** (lines 161-187):
   - Receives JSON with `id` (chatId), `message` (ChatMessage), and optional `prevMessages`
   - **Critical**: `selectedModel` is extracted from message metadata (line 180):
     ```typescript
     const selectedModelId = userMessage.metadata?.selectedModel as AppModelId;
     ```

2. **Stream Context Initialization** (lines 79-106):
   - Redis-backed resumable streams for connection recovery
   - Uses `createResumableStreamContext()` with optional Redis publisher/subscriber
   - TTL: 10 minutes for stream recovery

3. **UI Message Stream Creation** (lines 512-610):
   ```typescript
   const stream = createUIMessageStream<ChatMessage>({
     execute: async ({ writer: dataStream }) => {
       const result = streamText({
         model: getLanguageModel(modelDefinition.apiModelId),
         system: systemPrompt(),
         messages: contextForLLM,
         activeTools,
         tools: getTools({...}),
         experimental_transform: markdownJoinerTransform(),
         experimental_telemetry: { isEnabled: true, functionId: "chat-response" },
       });

       dataStream.merge(
         result.toUIMessageStream({
           sendReasoning: true,
           messageMetadata: ({ part }) => {
             // ... metadata handling
           },
         })
       );
     },
   });
   ```

4. **Response Format** (lines 735-754):
   - Returns SSE stream with JSON events
   - Uses `JsonToSseTransformStream()` for formatting
   - Headers set for streaming: `Content-Type: text/event-stream`

### 1.3 Streaming Features

**Follow-up Suggestions** (lines 116-159):
- After main response completes, generates suggested follow-up questions
- Uses `streamObject()` with Zod schema for structured output
- Model: `DEFAULT_FOLLOWUP_SUGGESTIONS_MODEL` (Google Gemini 2.5 Flash Lite)

**Reasoning Support** (line 578):
- `sendReasoning: true` enables extended thinking tokens in responses
- Works with models supporting reasoning (OpenAI o3-mini, Claude Opus, Gemini 2.0)

---

## 2. Multiple AI Provider Architecture

### 2.1 Provider Integration via Vercel Gateway

**Core File**: `/Users/ashray/code/amxv/rag/lib/ai/providers.ts`

The system uses **Vercel Gateway** as a unified API layer:

```typescript
import { gateway } from "@ai-sdk/gateway";

export const getLanguageModel = (modelId: ModelId) => {
  const model = getAppModelDefinition(modelId);
  const languageProvider = gateway(model.id, {
    apiKey: env.AI_GATEWAY_API_KEY,
  });

  // ... reasoning middleware wrapping
  return languageProvider;
};
```

**Key Points**:
- **Single API Key**: `AI_GATEWAY_API_KEY` environment variable (line 22)
- **Provider-Agnostic**: Gateway abstracts provider differences
- **Model ID Format**: `provider/model-name` (e.g., `openai/gpt-5-nano`, `anthropic/claude-3.5-sonnet`)

### 2.2 Supported Providers & Models

**File**: `/Users/ashray/code/amxv/rag/lib/ai/app-models.ts:1-64`

**Model Data Source**: `@ai-models/vercel-gateway` package

Supported Providers (ordered by preference in line 68):
1. **OpenAI** - gpt-5-nano, gpt-5-mini, gpt-5, o3-mini, GPT-4o, etc.
2. **Google** - Gemini 2.5 Flash, Gemini 2.0 Flash Lite, etc.
3. **Anthropic** - Claude 3.5 Sonnet, Claude Opus 4, Claude Haiku, etc.
4. **xAI** - Grok models with reasoning support
5. **Other Providers** - Meta, Mistral, Alibaba, Amazon, Cohere, DeepSeek, Perplexity, Inception, Moonshot, Morph, ZAI

```typescript
export const chatModels = allAppModels
  .filter((model) => model.output.text === true)
  .sort((a, b) => {
    const PROVIDER_ORDER = ["openai", "google", "anthropic", "xai"];
    // Sorting logic to display providers in preferred order
  });
```

### 2.3 Provider-Specific Options

**File**: `/Users/ashray/code/amxv/rag/lib/ai/providers.ts:54-117`

Different providers support different features via `getModelProviderOptions()`:

```typescript
export const getModelProviderOptions = (
  providerModelId: AppModelId
): OpenAIResponsesProviderOptions | AnthropicProviderOptions | ... => {
  const model = getAppModelDefinition(providerModelId);

  if (model.owned_by === "openai") {
    if (model.reasoning) {
      return {
        openai: {
          reasoningSummary: "auto",
          reasoningEffort: "low", // For GPT-5 models
        },
      };
    }
    return { openai: {} };
  }

  if (model.owned_by === "anthropic") {
    if (model.reasoning) {
      return {
        anthropic: {
          thinking: {
            type: "enabled",
            budgetTokens: 4096,
          },
        },
      };
    }
    return { anthropic: {} };
  }

  if (model.owned_by === "google") {
    if (model.reasoning) {
      return {
        google: {
          thinkingConfig: { thinkingBudget: 10_000 },
        },
      };
    }
    return { google: {} };
  }
  // ... xAI and others
};
```

**Provider Options Passed to streamText()** (line 566):
```typescript
providerOptions: getModelProviderOptions(selectedModelId),
```

---

## 3. Complete Data Flow: Frontend to Backend

### 3.1 User Model Selection Flow

#### Step 1: UI Component Initialization
**File**: `/Users/ashray/code/amxv/rag/components/model-selector.tsx`

The model selector reads from the `DefaultModelProvider` context (line 28):
```typescript
export function PureModelSelector({
  selectedModelId,
  onModelChangeAction,
}: {...}) {
  const { data: session } = useSession();
  const isAnonymous = !session?.user;

  const models = useMemo(() =>
    chatModels.map((m) => {
      const def = getAppModelDefinition(m.id);
      const disabled = isAnonymous &&
        !ANONYMOUS_LIMITS.AVAILABLE_MODELS.includes(m.id);
      return { id: m.id, definition: def, disabled };
    }),
    [isAnonymous]
  );

  return (
    <ModelSelectorBase
      models={models}
      onModelChange={onModelChangeAction}
      selectedModelId={selectedModelId}
    />
  );
}
```

#### Step 2: Model Change Handler
**File**: `/Users/ashray/code/amxv/rag/providers/default-model-provider.tsx:34-56`

When user selects a model, `changeModel` is called:

```typescript
const changeModel = useCallback(
  async (modelId: AppModelId) => {
    // 1. Update local state immediately (optimistic update)
    setCurrentModel(modelId);

    // 2. Persist to cookie via API
    try {
      await fetch("/api/chat-model", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: modelId }),
      });
    } catch (error) {
      console.error("Failed to save chat model:", error);
      toast.error("Failed to save model preference");
      // Revert on error
      setCurrentModel(initialModel);
    }
  },
  [initialModel]
);
```

#### Step 3: Cookie Persistence
**File**: `/Users/ashray/code/amxv/rag/app/api/chat-model/route.ts`

The cookie API endpoint persists model selection:

```typescript
export async function POST(request: NextRequest) {
  try {
    const { model } = await request.json();

    if (!model || typeof model !== "string") {
      return NextResponse.json(
        { error: "Invalid model parameter" },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    cookieStore.set("chat-model", model, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365, // 1 year
      sameSite: "lax",
      secure: env.NEXT_PUBLIC_NODE_ENV === "production",
    });

    return NextResponse.json({ success: true });
  } catch (_error) {
    return NextResponse.json(
      { error: "Failed to set cookie" },
      { status: 500 }
    );
  }
}
```

#### Step 4: Chat Input Provider Updates Selection
**File**: `/Users/ashray/code/amxv/rag/providers/chat-input-provider.tsx:112-134`

```typescript
const handleModelChange = useCallback(
  async (modelId: AppModelId) => {
    const modelDef = getAppModelDefinition(modelId);
    const hasReasoning = modelDef.reasoning === true;
    const hasUnspecifiedFeatures = !modelDef.input;

    // Auto-disable incompatible tools
    if (hasUnspecifiedFeatures && selectedTool !== null) {
      setSelectedTool(null); // Clear tools if model doesn't support them
    } else if (hasReasoning && selectedTool === "deepResearch") {
      setSelectedTool(null); // Disable deep research for reasoning models
    }

    // Update local state
    setSelectedModelId(modelId);

    // Update global default model (handles cookie persistence)
    await changeModel(modelId);
  },
  [selectedTool, changeModel]
);
```

### 3.2 Message Submission Flow

#### Step 1: Build ChatMessage with Model Metadata
**File**: `/Users/ashray/code/amxv/rag/components/multimodal-input.tsx:248-269`

When user sends a message, `coreSubmitLogic` creates the ChatMessage:

```typescript
const message: ChatMessage = {
  id: generateUUID(),
  parts: [
    ...attachments.map((attachment) => ({
      type: "file" as const,
      url: attachment.url,
      name: attachment.name,
      mediaType: attachment.contentType,
    })),
    {
      type: "text",
      text: input,
    },
  ],
  metadata: {
    createdAt: new Date(),
    parentMessageId: effectiveParentMessageId,
    selectedModel: selectedModelId,  // <-- MODEL ID INCLUDED HERE
    selectedTool: selectedTool || undefined,
  },
  role: "user",
};

// Send to API
sendMessage(message);
```

#### Step 2: Send to Backend API
The message flows through the chat store to `/api/chat` endpoint.

**Message Structure Sent**:
```json
{
  "id": "chat-uuid",
  "message": {
    "id": "msg-uuid",
    "role": "user",
    "parts": [
      { "type": "text", "text": "user input" }
    ],
    "metadata": {
      "selectedModel": "openai/gpt-5-nano",
      "selectedTool": "webSearch",
      "parentMessageId": "parent-msg-uuid",
      "createdAt": "2025-10-21T..."
    }
  },
  "prevMessages": [...]
}
```

#### Step 3: Backend Processes Model Selection
**File**: `/Users/ashray/code/amxv/rag/app/(chat)/api/chat/route.ts:179-283`

```typescript
export async function POST(request: NextRequest) {
  // Parse request
  const { id: chatId, message: userMessage, prevMessages } = await request.json();

  // CRITICAL: Extract selectedModel from message metadata
  const selectedModelId = userMessage.metadata?.selectedModel as AppModelId;

  if (!selectedModelId) {
    return new Response("No selectedModel in user message metadata", {
      status: 400,
    });
  }

  // Get model definition
  let modelDefinition: AppModelDefinition;
  try {
    modelDefinition = getAppModelDefinition(selectedModelId);
  } catch (_error) {
    return new Response("Model not found", { status: 404 });
  }

  // Validate anonymous user model access
  if (isAnonymous &&
      !ANONYMOUS_LIMITS.AVAILABLE_MODELS.includes(selectedModelId)) {
    return new Response(
      JSON.stringify({
        error: "Model not available for anonymous users",
        availableModels: ANONYMOUS_LIMITS.AVAILABLE_MODELS,
      }),
      { status: 403 }
    );
  }
```

#### Step 4: Stream Response with Selected Model
**File**: `/Users/ashray/code/amxv/rag/app/(chat)/api/chat/route.ts:514-567`

```typescript
const result = streamText({
  model: getLanguageModel(modelDefinition.apiModelId), // <-- Use selected model
  system: systemPrompt(),
  messages: contextForLLM,
  stopWhen: [...],
  activeTools,
  experimental_transform: markdownJoinerTransform(),
  experimental_telemetry: { isEnabled: true },
  tools: getTools({...}),
  abortSignal: abortController.signal,
  ...(modelDefinition.fixedTemperature
    ? { temperature: modelDefinition.fixedTemperature }
    : {}),
  providerOptions: getModelProviderOptions(selectedModelId), // Provider-specific options
});
```

---

## 4. State Management Architecture

### 4.1 Model Selection State Management

**Provider Hierarchy**:

```
DefaultModelProvider
├── defaultModel: AppModelId (from cookie)
├── changeModel: (modelId: AppModelId) => Promise<void>
└── Persists to `/api/chat-model` endpoint
    └── Stores in "chat-model" cookie

ChatInputProvider
├── selectedModelId: AppModelId (initialized from DefaultModelProvider)
├── handleModelChange: (modelId: AppModelId) => Promise<void>
└── Auto-disables incompatible tools based on model capabilities
```

**File**: `/Users/ashray/code/amxv/rag/providers/default-model-provider.tsx:28-91`

```typescript
export function DefaultModelProvider({
  children,
  defaultModel: initialModel,
}: DefaultModelClientProviderProps) {
  const [currentModel, setCurrentModel] = useState<AppModelId>(initialModel);

  const changeModel = useCallback(
    async (modelId: AppModelId) => {
      setCurrentModel(modelId);
      try {
        await fetch("/api/chat-model", {
          method: "POST",
          body: JSON.stringify({ model: modelId }),
        });
      } catch (error) {
        console.error("Failed to save chat model:", error);
        setCurrentModel(initialModel); // Revert on error
      }
    },
    [initialModel]
  );

  return (
    <DefaultModelContext.Provider value={{ defaultModel: currentModel, changeModel }}>
      {children}
    </DefaultModelContext.Provider>
  );
}

export function useDefaultModel() {
  // Get current selected model
}

export function useModelChange() {
  // Get change handler
}
```

### 4.2 Chat Store Architecture

**File**: `/Users/ashray/code/amxv/rag/lib/stores/chat-store-context.tsx`

```typescript
export function ChatStoreProvider({
  children,
  initialMessages,
}: {
  children: React.ReactNode;
  initialMessages: ChatMessage[];
}) {
  const storeRef = useRef<ChatStoreApi | null>(null);
  const chatStateRef = useRef<ZustandChatState<ChatMessage> | null>(null);

  if (storeRef.current === null) {
    storeRef.current = createChatStore<ChatMessage>(initialMessages);
  }

  return (
    <ChatStoreContext.Provider value={storeRef.current}>
      <ChatStateContext.Provider value={chatStateRef.current}>
        {children}
      </ChatStateContext.Provider>
    </ChatStoreContext.Provider>
  );
}
```

The store manages:
- Message history
- Current chat helpers (from Vercel AI SDK useChat hook)
- Message throttling
- UI state

---

## 5. Configuration & Environment Variables

### 5.1 Environment Configuration

**File**: `/Users/ashray/code/amxv/rag/lib/env.ts`

**Required Variables**:
```typescript
export const env = createEnv({
  server: {
    AI_GATEWAY_API_KEY: z.string().min(1),  // <-- CRITICAL: Vercel Gateway API key
    POSTGRES_URL: z.string().min(1),
    AUTH_SECRET: z.string().min(1),
    CRON_SECRET: z.string().min(1),
    BLOB_READ_WRITE_TOKEN: z.string().min(1),
    REDIS_URL: z.string().optional(),        // For resumable streams
  },
  client: {
    NEXT_PUBLIC_TAVILY_AVAILABLE: z.boolean().optional(),
    NEXT_PUBLIC_OPENAI_AVAILABLE: z.boolean().optional(),
    // Feature flags for tool availability
  },
});
```

**Key Points**:
- `AI_GATEWAY_API_KEY`: Single authentication for all provider access
- `REDIS_URL`: Optional but enables stream resumption on connection loss
- Feature flags control tool availability per environment

### 5.2 Default Models Configuration

**File**: `/Users/ashray/code/amxv/rag/lib/ai/app-models.ts:132-150`

```typescript
export const DEFAULT_CHAT_MODEL: ModelId = "openai/gpt-5-nano";
export const DEFAULT_PDF_MODEL: ModelId = "openai/gpt-5-mini";
export const DEFAULT_TITLE_MODEL: ModelId = "openai/gpt-5-nano";
export const DEFAULT_ARTIFACT_MODEL: ModelId = "openai/gpt-5-nano";
export const DEFAULT_FOLLOWUP_SUGGESTIONS_MODEL: ModelId =
  "google/gemini-2.5-flash-lite";
export const DEFAULT_IMAGE_MODEL: ImageModelId = "openai/gpt-image-1";
export const DEFAULT_CHAT_IMAGE_COMPATIBLE_MODEL: ModelId =
  "openai/gpt-4o-mini";
```

Each operation has a dedicated default model optimized for that task.

---

## 6. Model Capability Detection & Tool Auto-Selection

### 6.1 Model Features

**File**: `/Users/ashray/code/amxv/rag/lib/ai/app-models.ts:12-20`

```typescript
export type AppModelDefinition = Omit<ModelDefinition, "id"> & {
  id: AppModelId;
  apiModelId: ModelId;  // Actual model sent to API (without -reasoning suffix)
  reasoning?: boolean;   // Extended thinking capability
  input?: {
    image?: boolean;
    pdf?: boolean;
    audio?: boolean;
  };
  output?: {
    image?: boolean;
    audio?: boolean;
    text?: boolean;
  };
};
```

### 6.2 Tool Availability Logic

**File**: `/Users/ashray/code/amxv/rag/app/(chat)/api/chat/route.ts:372-420`

```typescript
// Determine which tools are available based on model capabilities
let activeTools: ToolName[] = filterAffordableTools(
  isAnonymous ? ANONYMOUS_LIMITS.AVAILABLE_TOOLS : allTools,
  budget // Credits remaining
);

// Disable all tools if model has unspecified features
if (modelDefinition?.input) {
  // Let's not allow deepResearch if model supports reasoning
  if (modelDefinition.reasoning &&
      activeTools.some((tool: ToolName) => tool === "deepResearch")) {
    activeTools = activeTools.filter(
      (tool: ToolName) => tool !== "deepResearch"
    );
  }
} else {
  activeTools = []; // No tools for models without specified features
}

// Handle explicitly requested tools
if (explicitlyRequestedTools && explicitlyRequestedTools.length > 0) {
  if (!activeTools.some((tool) =>
      explicitlyRequestedTools.includes(tool))) {
    return new Response(
      `Insufficient budget for requested tool: ${explicitlyRequestedTools}.`,
      { status: 402 }
    );
  }
  activeTools = explicitlyRequestedTools;
}
```

### 6.3 Auto-Model Switching in UI

**File**: `/Users/ashray/code/amxv/rag/components/multimodal-input.tsx:104-120`

When user attaches files, model automatically switches to compatible one:

```typescript
// Helper function to auto-switch to PDF-compatible model
const switchToPdfCompatibleModel = useCallback(() => {
  const defaultPdfModelDef = getAppModelDefinition(DEFAULT_PDF_MODEL);
  toast.success(`Switched to ${defaultPdfModelDef.name} (supports PDF)`);
  handleModelChange(DEFAULT_PDF_MODEL);
  return defaultPdfModelDef;
}, [handleModelChange]);

// Auto-switch logic when files are added
if (pdfFiles.length > 0 && !currentModelDef.input?.pdf) {
  currentModelDef = switchToPdfCompatibleModel();
}
if (processedImages.length > 0 && !currentModelDef.input?.image) {
  currentModelDef = switchToImageCompatibleModel();
}
```

---

## 7. Credit System & Anonymous User Limits

### 7.1 Credit Reservation

**File**: `/Users/ashray/code/amxv/rag/app/(chat)/api/chat/route.ts:349-370`

```typescript
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
  // Decrement anonymous user credits
  anonymousSession.remainingCredits -= baseModelCost;
  await setAnonymousSession(anonymousSession);
}
```

### 7.2 Anonymous User Restrictions

**File**: `/Users/ashray/code/amxv/rag/app/(chat)/api/chat/route.ts:255-272`

```typescript
// Validate model for anonymous users
if (!ANONYMOUS_LIMITS.AVAILABLE_MODELS.includes(selectedModelId as any)) {
  return new Response(
    JSON.stringify({
      error: "Model not available for anonymous users",
      availableModels: ANONYMOUS_LIMITS.AVAILABLE_MODELS,
    }),
    { status: 403 }
  );
}

// Check message limits
if (anonymousSession.remainingCredits <= 0) {
  return new Response(
    JSON.stringify({
      error: `You've used all ${ANONYMOUS_LIMITS.CREDITS} free messages...`,
      type: "ANONYMOUS_LIMIT_EXCEEDED",
    }),
    { status: 402 }
  );
}
```

---

## 8. Advanced Features: Reasoning & Extended Thinking

### 8.1 Reasoning Model Variants

**File**: `/Users/ashray/code/amxv/rag/lib/ai/app-models.ts:31-63`

For models supporting reasoning, two variants are created:

```typescript
export const allAppModels = allModelsData
  .flatMap((model) => {
    // If model supports reasoning, return TWO variants
    if (model.reasoning === true) {
      const reasoningId: AppModelId = `${model.id}-reasoning`;

      return [
        {
          ...model,
          id: reasoningId,          // e.g., "openai/gpt-5-reasoning"
          apiModelId: model.id,     // Still "openai/gpt-5"
          reasoning: true,
        },
        {
          ...model,
          reasoning: false,         // Non-reasoning variant
          apiModelId: model.id,
        },
      ];
    }

    return [{ ...model, apiModelId: model.id }];
  })
  .filter((model) => model.type === "language" && !model.disabled);
```

### 8.2 Reasoning Middleware

**File**: `/Users/ashray/code/amxv/rag/lib/ai/providers.ts:19-35`

```typescript
export const getLanguageModel = (modelId: ModelId) => {
  const model = getAppModelDefinition(modelId);
  const languageProvider = gateway(model.id, {
    apiKey: env.AI_GATEWAY_API_KEY,
  });

  // Wrap with reasoning middleware for xAI models
  if (model.reasoning && model.owned_by === "xai") {
    console.log("Wrapping reasoning middleware for", model.id);
    return wrapLanguageModel({
      model: languageProvider,
      middleware: extractReasoningMiddleware({ tagName: "think" }),
    });
  }

  return languageProvider;
};
```

### 8.3 Provider-Specific Reasoning Configuration

**File**: `/Users/ashray/code/amxv/rag/lib/ai/providers.ts:54-117`

```typescript
if (model.owned_by === "openai") {
  if (model.reasoning) {
    return {
      openai: {
        reasoningSummary: "auto",
        reasoningEffort: "low", // For GPT-5 models only
      },
    };
  }
}

if (model.owned_by === "anthropic") {
  if (model.reasoning) {
    return {
      anthropic: {
        thinking: { type: "enabled", budgetTokens: 4096 },
      },
    };
  }
}

if (model.owned_by === "google") {
  if (model.reasoning) {
    return {
      google: {
        thinkingConfig: { thinkingBudget: 10_000 },
      },
    };
  }
}
```

---

## 9. Error Handling & Recovery

### 9.1 Resumable Streams (Redis-Backed)

**File**: `/Users/ashray/code/amxv/rag/app/(chat)/api/chat/route.ts:66-114`

```typescript
let redisPublisher: any = null;
let redisSubscriber: any = null;

if (env.REDIS_URL) {
  (async () => {
    const redis = await import("redis");
    redisPublisher = redis.createClient({ url: env.REDIS_URL });
    redisSubscriber = redis.createClient({ url: env.REDIS_URL });
    await Promise.all([
      redisPublisher.connect(),
      redisSubscriber.connect(),
    ]);
  })();
}

let globalStreamContext: ResumableStreamContext | null = null;

export function getStreamContext() {
  if (!globalStreamContext) {
    try {
      globalStreamContext = createResumableStreamContext({
        waitUntil: after,
        keyPrefix: "sparka-ai:resumable-stream",
        ...(redisPublisher && redisSubscriber
          ? { publisher: redisPublisher, subscriber: redisSubscriber }
          : {}),
      });
    } catch (error: any) {
      if (error.message.includes("REDIS_URL")) {
        console.log(
          " > Resumable streams are disabled due to missing REDIS_URL"
        );
      }
    }
  }
  return globalStreamContext;
}
```

### 9.2 Stream Recovery Endpoint

**File**: `/Users/ashray/code/amxv/rag/app/(chat)/api/chat/[id]/stream/route.ts`

```typescript
export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: chatId } = await params;
  const streamContext = getStreamContext();

  // Get recent stream IDs from Redis
  const keyPattern = isAuthenticated
    ? `sparka-ai:stream:${chatId}:*`
    : `sparka-ai:anonymous-stream:${chatId}:*`;

  const keys = await redisPublisher.keys(keyPattern);
  const recentStreamId = keys.at(-1);

  // Resume stream or return last message if stream is gone
  const stream = await streamContext.resumableStream(
    recentStreamId,
    () => emptyDataStream.pipeThrough(new JsonToSseTransformStream())
  );

  if (!stream) {
    // Fallback: Return last message if stream was already completed
    const messages = await getAllMessagesByChatId({ chatId });
    const mostRecentMessage = messages.at(-1);
    // Return the message if less than 15 seconds old
  }

  return new Response(stream, { status: 200 });
}
```

### 9.3 Credit Cleanup on Error

**File**: `/Users/ashray/code/amxv/rag/app/(chat)/api/chat/route.ts:683-696`

```typescript
onError: (error) => {
  // Clear timeout on error
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
},
```

---

## 10. Message Type System

### 10.1 ChatMessage Structure

**File**: `/Users/ashray/code/amxv/rag/lib/ai/types.ts:52-127`

```typescript
export type MessageMetadata = {
  createdAt: Date;
  parentMessageId: string | null;
  selectedModel: AppModelId;  // <-- KEY: Model used for this message
  isPartial?: boolean;
  selectedTool?: UiToolName;
  usage?: LanguageModelUsage;
};

export type ChatMessage = Omit<
  UIMessage<MessageMetadata, CustomUIDataTypes, ChatTools>,
  "metadata"
> & {
  metadata: MessageMetadata;
};

export type CustomUIDataTypes = {
  textDelta: string;
  imageDelta: string;
  sheetDelta: string;
  codeDelta: string;
  suggestion: Suggestion;
  appendMessage: string;
  followupSuggestions: FollowupSuggestions;
  // ... other custom data types
};

export type ChatTools = {
  getWeather: weatherTool;
  createDocument: createDocumentTool;
  updateDocument: updateDocumentTool;
  webSearch: webSearchTool;
  deepResearch: deepResearchTool;
  generateImage: generateImageTool;
  codeInterpreter: codeInterpreterTool;
  // ... other tools
};
```

### 10.2 Available Tools

**File**: `/Users/ashray/code/amxv/rag/lib/ai/types.ts:24-36`

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

// Frontend-visible tools (subset)
export const frontendToolsSchema = z.enum([
  "webSearch",
  "deepResearch",
  "generateImage",
  "createDocument",
]);
```

---

## 11. Component Architecture

### 11.1 Chat System Provider Hierarchy

**File**: `/Users/ashray/code/amxv/rag/components/chat-system.tsx`

```typescript
export const ChatSystem = memo(function ChatSystem({
  id,
  initialMessages,
  isReadonly,
  initialTool = null,
  overrideModelId,
}: {
  id: string;
  initialMessages: ChatMessage[];
  isReadonly: boolean;
  initialTool?: UiToolName | null;
  overrideModelId?: AppModelId;
}) {
  return (
    <ArtifactProvider>
      <DataStreamProvider>
        <ChatStoreProvider initialMessages={initialMessages}>
          <MessageTreeProvider>
            <ChatInputProvider
              initialTool={initialTool ?? null}
              localStorageEnabled={true}
              overrideModelId={overrideModelId}
            >
              <ChatSync id={id} initialMessages={initialMessages} />
              <Chat
                id={id}
                initialMessages={initialMessages}
                isReadonly={isReadonly}
                key={id}
              />
              <DataStreamHandler id={id} />
            </ChatInputProvider>
          </MessageTreeProvider>
        </ChatStoreProvider>
      </DataStreamProvider>
    </ArtifactProvider>
  );
});
```

**Provider Stack**:
1. **ArtifactProvider** - Manages artifact UI visibility/state
2. **DataStreamProvider** - Handles streaming data from API
3. **ChatStoreProvider** - Central message store (Zustand)
4. **MessageTreeProvider** - Thread/message tree navigation
5. **ChatInputProvider** - Model selection and input state
6. **ChatSync** - Syncs with tRPC backend
7. **Chat** - Main chat UI components
8. **DataStreamHandler** - Processes incoming data stream events

### 11.2 Model Selector Component

**File**: `/Users/ashray/code/amxv/rag/components/model-selector-base.tsx:361-536`

Key features:
- Search/filter by model name, provider, capabilities
- Feature filtering (reasoning, function calling, image input, PDF input)
- Disabled state for anonymous users on unavailable models
- Optimistic UI updates using `useOptimistic`
- Memoization for performance

```typescript
export function PureModelSelectorBase<TModelId extends string>({
  models,
  selectedModelId,
  onModelChange,
  enableFilters = true,
}: {
  models: ModelSelectorBaseItem<TModelId>[];
  selectedModelId?: TModelId;
  onModelChange?: (modelId: TModelId) => void;
  enableFilters?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [featureFilters, setFeatureFilters] = useState(initialFilters);
  const [optimisticModelId, setOptimisticModelId] =
    useOptimistic(selectedModelId);

  const selectModel = useCallback(
    (id: TModelId) => {
      startTransition(() => {
        setOptimisticModelId(id);
        onModelChange?.(id);
        setOpen(false);
      });
    },
    [onModelChange]
  );

  return (
    <Popover onOpenChange={setOpen} open={open}>
      {/* Trigger button with selected model display */}
      {/* Content with model list and filters */}
    </Popover>
  );
}
```

---

## 12. Key Architectural Patterns

### 12.1 Pattern: Model-First Architecture

The system is built around a model-first design where:
- Every message carries its `selectedModel` in metadata
- Model capabilities determine available tools
- Backend validates model selection before processing
- UI prevents selection of incompatible tools

### 12.2 Pattern: Optimistic Updates with Rollback

```typescript
// UI updates immediately
setCurrentModel(modelId);

// API call in background
try {
  await fetch("/api/chat-model", { ... });
} catch {
  // Rollback on failure
  setCurrentModel(initialModel);
}
```

### 12.3 Pattern: Provider-Agnostic via Gateway

- Single `AI_GATEWAY_API_KEY` handles all providers
- Model IDs follow `provider/model-name` format
- Provider-specific options applied at request time
- Easy to add new providers without code changes

### 12.4 Pattern: Automatic Model Switching

When user attachments conflict with model capabilities:
```
User attaches PDF
→ Current model doesn't support PDF
→ Switch to DEFAULT_PDF_MODEL automatically
→ Show toast notification
```

---

## 13. Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     USER INTERFACE LAYER                      │
├─────────────────────────────────────────────────────────────┤
│
│  ┌─────────────────────────────────────────────┐
│  │    ModelSelector Component                   │
│  │  (displays all available models with         │
│  │   filters: reasoning, tools, input/output)  │
│  └────────────────────┬────────────────────────┘
│                       │ user selects model
│                       ▼
│  ┌─────────────────────────────────────────────┐
│  │  DefaultModelProvider.changeModel()         │
│  │  1. Update local state (optimistic)         │
│  │  2. POST /api/chat-model { model: id }      │
│  │  3. Persists to "chat-model" cookie (1 yr) │
│  └────────────────────┬────────────────────────┘
│                       │
│                       ▼
│  ┌─────────────────────────────────────────────┐
│  │  ChatInputProvider.handleModelChange()      │
│  │  1. Update selectedModelId state            │
│  │  2. Auto-disable incompatible tools         │
│  │  3. Update global default model             │
│  └────────────────────┬────────────────────────┘
│                       │
│                       ▼
│  ┌─────────────────────────────────────────────┐
│  │  MultimodalInput (message composition)      │
│  │  1. Collect user text + attachments        │
│  │  2. selectedModelId from ChatInputProvider │
│  │  3. selectedTool from ChatInputProvider    │
│  │  4. Build ChatMessage with metadata        │
│  └────────────────────┬────────────────────────┘
│
├─────────────────────────────────────────────────────────────┤
│                     API REQUEST LAYER                         │
├─────────────────────────────────────────────────────────────┤
│
│  POST /api/chat
│  {
│    "id": "chat-123",
│    "message": {
│      "id": "msg-456",
│      "role": "user",
│      "parts": [{ "type": "text", "text": "..." }],
│      "metadata": {
│        "selectedModel": "openai/gpt-5-nano",  ◄── KEY
│        "selectedTool": "webSearch",
│        "parentMessageId": "...",
│        "createdAt": "2025-10-21T..."
│      }
│    },
│    "prevMessages": [...]
│  }
│
│                       ▼
│
├─────────────────────────────────────────────────────────────┤
│                   BACKEND API LAYER                           │
├─────────────────────────────────────────────────────────────┤
│
│  POST /api/chat (route.ts:161)
│  1. Extract selectedModelId from metadata (line 180)
│  2. Validate model exists (line 279)
│  3. Check permissions (anonymous user restrictions)
│  4. Get AppModelDefinition (line 279)
│  5. Reserve credits (line 352-365)
│  6. Determine available tools based on model (line 372)
│  7. Build context: last 5 messages, filter reasoning
│  8. Call streamText() with getLanguageModel(modelId)
│  9. Apply provider-specific options (line 566)
│  10. Stream response back to client
│
│                       ▼
│
│  getLanguageModel(modelDefinition.apiModelId)
│  1. Uses Vercel Gateway with AI_GATEWAY_API_KEY
│  2. Wraps with reasoning middleware if needed
│  3. Returns provider-specific model instance
│
│                       ▼
│
│  streamText({
│    model: <Vercel AI SDK Language Model>,
│    system: systemPrompt(),
│    messages: contextForLLM,
│    tools: activeTools,
│    providerOptions: getModelProviderOptions(selectedModelId),
│    ...
│  })
│
│  ┌─────────────────────────────────────────┐
│  │  Provider-Specific API Calls             │
│  │                                          │
│  │  If OpenAI:                             │
│  │  → POST https://api.openai.com/v1/chat │
│  │    Headers: Authorization: Bearer $KEY  │
│  │                                          │
│  │  If Anthropic:                          │
│  │  → POST https://api.anthropic.com/...   │
│  │                                          │
│  │  If Google:                             │
│  │  → POST https://generativelanguage... │
│  │                                          │
│  │  (Actual provider details hidden by     │
│  │   Vercel Gateway)                       │
│  └─────────────────────────────────────────┘
│
│                       ▼
│
│  StreamText Result → UIMessageStream
│  1. Convert to SSE format
│  2. Stream tokens to client
│  3. After main response: generate follow-ups
│  4. On completion: finalize credits
│  5. On error: cleanup, refund credits
│
├─────────────────────────────────────────────────────────────┤
│                  RESPONSE STREAMING LAYER                     │
├─────────────────────────────────────────────────────────────┤
│
│  Response Headers:
│  Content-Type: text/event-stream
│  Cache-Control: no-cache
│  Connection: keep-alive
│
│  Response Body (Server-Sent Events):
│  data: {"type":"text-delta","textDelta":"Hello"}
│  data: {"type":"text-delta","textDelta":" world"}
│  data: {"type":"finish","usage":{...}}
│  data: {"type":"data-followupSuggestions","data":{...}}
│
│                       ▼
│
│  Client receives via: useChat() hook
│  1. Messages update in real-time
│  2. Metadata includes selectedModel
│  3. Store persists to database
│  4. UI re-renders with new content
│
└─────────────────────────────────────────────────────────────┘
```

---

## 14. Testing & Type Safety

### 14.1 Type Definitions

All model interactions are strongly typed:

```typescript
// Model IDs include provider prefix
type ModelId = `openai/gpt-5` | `anthropic/claude-3.5-sonnet` | ...;

// App model IDs can have -reasoning suffix
type AppModelId = ModelId | `${ModelId}-reasoning`;

// Messages carry model metadata
type MessageMetadata = {
  selectedModel: AppModelId;
  // ...
};

// Provider options are discriminated unions
type ProviderOptions =
  | { openai: OpenAIResponsesProviderOptions }
  | { anthropic: AnthropicProviderOptions }
  | { google: GoogleGenerativeAIProviderOptions }
  | { xai: Record<string, never> };
```

### 14.2 Validation

- Model IDs validated against `allAppModels` list
- Anonymous users restricted to `ANONYMOUS_LIMITS.AVAILABLE_MODELS`
- Tokens validated against `MAX_INPUT_TOKENS` limit (50k)
- Model capabilities checked before tool execution

---

## 15. Summary: Key Takeaways

1. **Vercel AI SDK Integration**: Uses `streamText()` and `createUIMessageStream()` for streaming chat responses with tool calling support

2. **Multiple Provider Support**:
   - 16+ AI providers (OpenAI, Anthropic, Google, xAI, etc.)
   - Single `AI_GATEWAY_API_KEY` via Vercel Gateway
   - Provider-specific options applied at request time

3. **Model Selection Architecture**:
   - UI dropdown in `ModelSelector` component
   - Selection persisted to "chat-model" cookie
   - Model ID passed in message metadata to API
   - Backend validates model before use

4. **Streaming with Recovery**:
   - Redis-backed resumable streams
   - Automatic recovery on connection loss
   - 10-minute TTL for stream recovery data

5. **Intelligent Tool Management**:
   - Tools automatically filtered by model capabilities
   - Deep research disabled for reasoning models
   - Anonymous users restricted to subset of models/tools

6. **Credit System**:
   - Per-model costs tracked
   - Credits reserved before streaming
   - Automatic refund on error
   - Anonymous users have fixed quota

7. **Reasoning Models**:
   - Provider-specific thinking budgets
   - Models create two variants: reasoning + non-reasoning
   - Reasoning middleware for xAI models

8. **State Management**:
   - `DefaultModelProvider` for global model state
   - `ChatInputProvider` for input state + model selection
   - `ChatStoreProvider` for message history
   - All integrated with Vercel AI SDK's `useChat()` hook

9. **Type Safety**:
   - Strong TypeScript types for all message/model interactions
   - Discriminated unions for provider options
   - Zod schemas for runtime validation

10. **Auto-Switching Logic**:
    - Automatically switches to PDF model when PDF attached
    - Automatically switches to image model when images attached
    - Auto-disables incompatible tools when switching models
