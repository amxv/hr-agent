# OpenAI Client Configuration and Usage Analysis

## Overview
The codebase uses a multi-layered approach to OpenAI integration:
1. **Vercel AI SDK** (`ai` package v5.0.39) for chat completions via a gateway provider
2. **Direct OpenAI SDK** (v5.8.2) for image generation with image editing capabilities
3. **Vercel AI SDK OpenAI Provider** (`@ai-sdk/openai` v2.0.12) for model selection and feature-specific options

All API keys and configuration are managed through environment variables with centralized validation using `@t3-oss/env-nextjs`.

---

## Environment Configuration

### File: `/Users/ashray/code/amxv/rag/lib/env.ts` (Lines 1-88)

The environment variables are centralized and validated using the t3-oss environment parsing library:

**Server-side variables (required):**
- `AI_GATEWAY_API_KEY` (line 10, 55) - **Required**. API key for Vercel AI Gateway
- `OPENAI_API_KEY` (line 25, 64) - **Optional**. Used for direct OpenAI API calls (image generation)

**Client-side feature flags:**
- `NEXT_PUBLIC_OPENAI_AVAILABLE` (line 46, 81) - Boolean flag indicating if OpenAI image generation is available
- Derived from `Boolean(process.env.OPENAI_API_KEY)` at line 81

**Model configuration variables:**
- `DISABLE_MODEL_SELECTION` (line 32, 69) - Optional flag to force a specific model
- `CHAT_MODEL` (line 33, 70) - Optional model override
- `IMAGE_GEN_MODEL` (line 35, 72) - Optional image generation model override

---

## Language Model Client Initialization

### File: `/Users/ashray/code/amxv/rag/lib/ai/providers.ts` (Lines 1-120)

#### Gateway Provider Setup (Lines 19-21)

```typescript
const gatewayProvider = createGateway({
  apiKey: env.AI_GATEWAY_API_KEY,
});
```

**Implementation Details:**
- Uses Vercel's `@ai-sdk/gateway` package
- API key sourced from environment variable `AI_GATEWAY_API_KEY`
- Gateway provider acts as a unified interface for multiple LLM providers (OpenAI, Anthropic, Google, XAI)
- Single point of initialization for all chat/text generation API calls

#### Language Model Retrieval Function (Lines 23-37)

```typescript
export const getLanguageModel = (modelId: ModelId) => {
  const model = getAppModelDefinition(modelId);
  const languageProvider = gatewayProvider(model.id);

  // Wrap with reasoning middleware if the model supports reasoning
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

**Key Details:**
- Takes a `modelId` parameter (from the models package)
- Retrieves model definition using `getAppModelDefinition()` (line 24)
- Creates language provider by calling `gatewayProvider(model.id)` (line 25)
- **Conditionally wraps reasoning models** for XAI models with `extractReasoningMiddleware` (lines 28-33)
- Wrapping only occurs if:
  - Model has `reasoning: true` (line 28)
  - Model is owned by "xai" provider (line 28)
- Returns wrapped or unwrapped provider depending on reasoning support

#### Provider Options Configuration (Lines 56-119)

```typescript
export const getModelProviderOptions = (
  providerModelId: AppModelId
):
  | { openai: OpenAIResponsesProviderOptions; }
  | { anthropic: AnthropicProviderOptions; }
  | { xai: Record<string, never>; }
  | { google: GoogleGenerativeAIProviderOptions; }
  | Record<string, never> => {
  const model = getAppModelDefinition(providerModelId);

  if (model.owned_by === "openai") {
    if (model.reasoning) {
      return {
        openai: {
          reasoningSummary: "auto",
          ...(model.id === "openai/gpt-5" ||
          model.id === "openai/gpt-5-mini" ||
          model.id === "openai/gpt-5-nano"
            ? { reasoningEffort: "low" }
            : {}),
        } satisfies OpenAIResponsesProviderOptions,
      };
    }
    return { openai: {} };
  }
  // ... [Anthropic, XAI, Google configurations]
  return {};
};
```

**OpenAI-specific configuration (Lines 73-86):**
- For reasoning models (o1, o3 families):
  - Sets `reasoningSummary: "auto"` for all reasoning models
  - Sets `reasoningEffort: "low"` for GPT-5, GPT-5-mini, GPT-5-nano models (lines 78-82)
- For non-reasoning models: Returns empty object `{ openai: {} }`

**Type Safety:**
- Returns union type with provider-specific options
- Imports `OpenAIResponsesProviderOptions` from `@ai-sdk/openai` (line 4)

---

## Image Generation Client

### File: `/Users/ashray/code/amxv/rag/lib/ai/tools/generate-image.ts` (Lines 1-194)

#### Direct OpenAI Client Instantiation (Lines 2, 15-17)

```typescript
import OpenAI, { toFile } from "openai";
// ...
const openaiClient = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});
```

**Implementation Details:**
- Direct instantiation of OpenAI class (line 15)
- API key from environment variable `env.OPENAI_API_KEY` (line 16)
- Uses named import `toFile` from openai package for file conversion (line 2)
- Client is a module-level singleton (initialized once on module load)

#### Model Configuration (Lines 21-23)

```typescript
const imageModel = (env.IMAGE_GEN_MODEL ||
  DEFAULT_IMAGE_MODEL) as typeof DEFAULT_IMAGE_MODEL;
```

- Fallback chain: `env.IMAGE_GEN_MODEL` → `DEFAULT_IMAGE_MODEL` ("openai/gpt-image-1")
- Defined in `/Users/ashray/code/amxv/rag/lib/ai/app-models.ts` line 139

#### Image Generation Modes (Lines 25-194)

The tool supports two distinct modes:

**1. Edit Mode (Lines 66-133)** - Used when reference images are provided:

```typescript
if (isEdit) {
  // Convert parts and lastGeneratedImage to the format expected by OpenAI
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

  // Add user file parts
  const partImages = await Promise.all(
    imageParts.map(async (part) => {
      const response = await fetch(part.url);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      return await toFile(buffer, part.filename || "image.png", {
        type: part.mediaType || "image/png",
      });
    })
  );

  inputImages.push(...partImages);

  const rsp = await openaiClient.images.edit({
    model: "gpt-image-1",
    image: inputImages, // Pass all images to OpenAI
    prompt,
  });

  // Convert base64 to buffer and upload to blob storage
  const buffer = Buffer.from(rsp.data?.[0]?.b64_json || "", "base64");
  // ...
}
```

**Key Points:**
- Fetches images from URLs (lines 81, 93)
- Converts to `File` objects using `toFile()` utility (lines 84, 98)
- Calls `openaiClient.images.edit()` API (line 106)
- Uses hardcoded model "gpt-image-1" (line 107)
- Receives base64-encoded response (line 113)
- Uploads result to blob storage (line 117)

**2. Generation Mode (Lines 135-173)** - Standard image generation:

```typescript
const res = await experimental_generateImage({
  model: getImageModel(imageModel),
  prompt,
  n: 1,
  providerOptions: {
    telemetry: { isEnabled: true },
  },
});

// Convert base64 to buffer and upload to blob storage
const buffer = Buffer.from(res.images[0].base64, "base64");
const timestamp = Date.now();
const filename = `generated-image-${timestamp}.png`;

const result = await uploadFile(filename, buffer);
```

**Key Points:**
- Uses Vercel AI SDK's `experimental_generateImage()` (line 136)
- Gets model via `getImageModel()` which delegates to OpenAI provider (line 137)
- Requests 1 image: `n: 1` (line 139)
- Enables telemetry (line 141)
- Base64 response converted to buffer (line 154)
- Uploaded to Vercel Blob storage (line 158)

#### Error Handling (Lines 174-192)

```typescript
catch (error) {
  const err = error as unknown;
  log.error(
    {
      mode: isEdit ? "edit" : "generate",
      ms: Date.now() - startMs,
      error:
        err && typeof err === "object"
          ? {
              name: (err as Error).name,
              message: (err as Error).message,
              stack: (err as Error).stack,
            }
          : { message: String(err) },
    },
    "generateImage: failure"
  );
  throw error;
}
```

**Pattern:**
- Catches all errors (line 174)
- Type-safe error extraction (lines 175-187)
- Logs comprehensive error information including:
  - Mode (edit/generate)
  - Execution time
  - Error name, message, and stack
- Re-throws error for upstream handling (line 191)

---

## Chat API Call Patterns

### File: `/Users/ashray/code/amxv/rag/app/(chat)/api/chat/route.ts` (Lines 1-782)

#### Main Chat Endpoint (Lines 161-782)

**Language Model Selection:**

```typescript
const selectedModelId = userMessage.metadata?.selectedModel as AppModelId;

// Override with env model if DISABLE_MODEL_SELECTION is enabled
if (env.DISABLE_MODEL_SELECTION && env.CHAT_MODEL) {
  selectedModelId = env.CHAT_MODEL as AppModelId;
  log.info(
    { forcedModel: selectedModelId },
    "Model selection disabled - using configured CHAT_MODEL"
  );
}
```

- Model ID extracted from user message metadata (line 180)
- Environment variables can override model selection (lines 183-189)
- Type-safe with `AppModelId` type from app-models

**Stream Text Configuration (Lines 523-576):**

```typescript
const result = streamText({
  model: getLanguageModel(modelDefinition.apiModelId),
  system: systemPrompt(),
  messages: contextForLLM,
  stopWhen: [
    stepCountIs(5),
    ({ steps }) => {
      return steps.some((step) => {
        const toolResults = step.content;
        // Don't stop if the tool result is a clarifying question
        return toolResults.some(
          (toolResult) =>
            toolResult.type === "tool-result" &&
            toolResult.toolName === "deepResearch" &&
            (toolResult.output as any).format === "report"
        );
      });
    },
  ],

  activeTools,
  experimental_transform: markdownJoinerTransform(),
  experimental_telemetry: {
    isEnabled: true,
    functionId: "chat-response",
  },
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
  }),
  onError: (error) => {
    log.error({ error }, "streamText error");
  },
  abortSignal: abortController.signal,
  ...(modelDefinition.fixedTemperature
    ? {
        temperature: modelDefinition.fixedTemperature,
      }
    : {}),

  providerOptions: getModelProviderOptions(selectedModelId),
});
```

**Key Configuration:**
- **Model:** From `getLanguageModel()` using model definition's API model ID (line 524)
- **System prompt:** From `systemPrompt()` function (line 525)
- **Messages:** Pre-converted to model format via `convertToModelMessages()` (line 526)
- **Stop conditions:** Multi-stage stopping logic (lines 527-541):
  - After 5 conversation steps (line 528)
  - Custom logic to not stop on deepResearch report results (lines 529-540)
- **Tools:** Dynamically filtered based on user credits/budget (line 543)
- **Telemetry:** Enabled with function ID "chat-response" (lines 545-548)
- **Error handler:** Logs all streamText errors (lines 565-567)
- **Abort signal:** For timeout-based cleanup (line 568)
- **Temperature:** Conditionally set from model definition (lines 569-573)
- **Provider options:** OpenAI-specific options via `getModelProviderOptions()` (line 575)

#### Error Handling in Chat Endpoint (Lines 565-704)

**Stream-level error handling:**
```typescript
onError: (error) => {
  log.error({ error }, "streamText error");
},
```

**Request-level error handling (Lines 764-781):**
```typescript
catch (error) {
  clearTimeout(timeoutId);
  log.error({ error }, "RESPONSE > POST /api/chat error");
  if (reservation) {
    await reservation.cleanup();
  }
  if (anonymousSession) {
    anonymousSession.remainingCredits += baseModelCost;
    setAnonymousSession(anonymousSession);
  }
  throw error;
}
```

**Pattern:**
- Clears timeout on error
- Logs error at module level
- Cleans up credit reservations
- Refunds anonymous user credits
- Re-throws for Next.js error boundary

---

## Deep Research Tool Usage

### File: `/Users/ashray/code/amxv/rag/lib/ai/tools/deep-research/deep-researcher.ts`

The deep research tool demonstrates complex AI SDK usage patterns:

#### generateText Usage (Line 309)

```typescript
const result = await generateText({
  model: getLanguageModel(this.config.research_model as ModelId),
  messages: truncatedResearcherMessages,
  tools,
  maxOutputTokens: this.config.research_model_max_tokens,
  experimental_telemetry: {
    isEnabled: true,
    functionId: "researcher",
    metadata: {
      agentId: this.agentId,
      messageId: this.messageId,
      langfuseTraceId: state.requestId,
      langfuseUpdateParent: false,
    },
  },
});
```

**Key differences from streamText:**
- Non-streaming text generation
- Used for intermediate research steps
- Full telemetry metadata including:
  - `agentId`: Unique agent instance identifier
  - `langfuseTraceId`: For distributed tracing
  - `langfuseUpdateParent: false`: Prevent tracing parent update

#### generateObject Usage (Line 85)

```typescript
const result = await generateObject({
  model,
  schema: z.object({
    title: z.string().describe(...),
    message: z.string().describe(...),
  }),
  messages: [{ role: "user", content: prompt }],
  maxOutputTokens: 200,
  experimental_telemetry: {
    isEnabled: true,
    functionId: "statusUpdate",
    metadata: {
      messageId,
      langfuseTraceId: requestId,
      langfuseUpdateParent: false,
    },
  },
});
```

**Structured output generation:**
- Uses Zod schemas for validation
- Returns `result.object` with parsed structure
- Used for status updates and research questions
- Field descriptions provide LLM guidance

---

## Model Configuration and Defaults

### File: `/Users/ashray/code/amxv/rag/lib/ai/app-models.ts` (Lines 1-150)

#### OpenAI Models with Reasoning

```typescript
export const DEFAULT_CHAT_MODEL: ModelId = "openai/gpt-5-nano";
export const DEFAULT_PDF_MODEL: ModelId = "openai/gpt-5-mini";
export const DEFAULT_TITLE_MODEL: ModelId = "openai/gpt-5-nano";
export const DEFAULT_ARTIFACT_MODEL: ModelId = "openai/gpt-5-nano";
export const DEFAULT_FOLLOWUP_SUGGESTIONS_MODEL: ModelId =
  "google/gemini-2.5-flash-lite";
export const DEFAULT_ARTIFACT_SUGGESTION_MODEL: ModelId = "openai/gpt-5-mini";
export const DEFAULT_IMAGE_MODEL: ImageModelId = "openai/gpt-image-1";
export const DEFAULT_CHAT_IMAGE_COMPATIBLE_MODEL: ModelId =
  "openai/gpt-4o-mini";
export const DEFAULT_SUGGESTIONS_MODEL: ModelId = "openai/gpt-5-mini";
export const DEFAULT_POLISH_TEXT_MODEL: ModelId = "openai/gpt-5-mini";
export const DEFAULT_FORMAT_AND_CLEAN_SHEET_MODEL: ModelId =
  "openai/gpt-5-mini";
export const DEFAULT_ANALYZE_AND_VISUALIZE_SHEET_MODEL: ModelId =
  "openai/gpt-5-mini";
export const DEFAULT_CODE_EDITS_MODEL: ModelId = "openai/gpt-5-mini";
```

#### Model Variants with Reasoning Support (Lines 31-63)

```typescript
export const allAppModels = allModelsData
  .flatMap((model) => {
    if (model.reasoning === true) {
      const reasoningId: AppModelId = `${model.id}-reasoning`;

      return [
        {
          ...model,
          id: reasoningId,
          apiModelId: model.id,
          disabled: DISABLED_MODELS[model.id],
        },
        {
          ...model,
          reasoning: false,
          apiModelId: model.id,
          disabled: DISABLED_MODELS[model.id],
        },
      ];
    }

    return [
      {
        ...model,
        apiModelId: model.id,
        disabled: DISABLED_MODELS[model.id],
      },
    ];
  })
  .filter((model) => model.type === "language" && !model.disabled);
```

**Reasoning Model Handling:**
- Models with `reasoning: true` are split into two variants:
  - Reasoning variant: ID with "-reasoning" suffix (e.g., "openai/o1-reasoning")
  - Non-reasoning variant: Original ID with `reasoning: false`
- Both variants have `apiModelId` set to the base model ID for API calls
- Enables clients to choose reasoning vs. non-reasoning variants

---

## Error Handling Architecture

### File: `/Users/ashray/code/amxv/rag/lib/ai/errors.ts` (Lines 1-137)

#### ChatSDKError Class (Lines 37-75)

```typescript
export class ChatSDKError extends Error {
  public type: ErrorType;
  public surface: Surface;
  public statusCode: number;

  constructor(errorCode: ErrorCode, cause?: string) {
    super();

    const [type, surface] = errorCode.split(":");

    this.type = type as ErrorType;
    this.cause = cause;
    this.surface = surface as Surface;
    this.message = getMessageByErrorCode(errorCode);
    this.statusCode = getStatusCodeByType(this.type);
  }

  public toResponse() {
    const code: ErrorCode = `${this.type}:${this.surface}`;
    const visibility = visibilityBySurface[this.surface];

    const { message, cause, statusCode } = this;

    if (visibility === "log") {
      console.error({
        code,
        message,
        cause,
      });

      return Response.json(
        { code: "", message: "Something went wrong. Please try again later." },
        { status: statusCode }
      );
    }

    return Response.json({ code, message, cause }, { status: statusCode });
  }
}
```

**Error Types** (Lines 1-8):
- `bad_request`, `unauthorized`, `input_too_long`, `forbidden`, `not_found`, `rate_limit`, `offline`

**Surfaces** (Lines 10-19):
- `chat`, `auth`, `api`, `stream`, `database`, `history`, `vote`, `document`, `suggestions`

**Visibility** (Line 23):
- `response`: Send to client
- `log`: Log only, generic message to client
- `none`: No logging

**Usage in chat route** (from `/Users/ashray/code/amxv/rag/app/(chat)/api/chat/route.ts` line 438):
```typescript
const error = new ChatSDKError(
  "input_too_long:chat",
  `Message too long: ${totalTokens} tokens (max: ${MAX_INPUT_TOKENS})`
);
return error.toResponse();
```

---

## API Call Flow Diagram

```
User Request (chat/route.ts)
    ↓
Environment Validation (env.ts)
    ├─ AI_GATEWAY_API_KEY ✓
    └─ OPENAI_API_KEY ✓ (optional, for images)
    ↓
Model Selection (app-models.ts)
    ├─ Get model definition
    └─ Handle reasoning variants
    ↓
Language Model Initialization (providers.ts)
    ├─ Gateway Provider (chatCompletion, tools)
    ├─ Reasoning Middleware (for XAI models)
    └─ Provider Options (OpenAI: reasoning config)
    ↓
AI SDK Function (streamText/generateText/generateObject)
    ├─ Messages
    ├─ Tools
    ├─ Telemetry
    ├─ Error Handling
    └─ Response Streaming
    ↓
Image Generation Tool (optional)
    ├─ Direct OpenAI Client (OPENAI_API_KEY)
    ├─ Edit or Generate mode
    └─ Blob Storage Upload
    ↓
Response Stream (event-stream format)
```

---

## Key Patterns and Best Practices

### 1. **Unified Model Management**
- Single `getLanguageModel()` function for all language model access
- Automatic reasoning middleware application for supported models
- Consistent provider option configuration via `getModelProviderOptions()`

### 2. **API Key Management**
- **Gateway API**: Centralized `AI_GATEWAY_API_KEY` for all model providers
- **Direct OpenAI**: Separate `OPENAI_API_KEY` for image generation
- Both optional with feature flag support
- Validated on startup via `@t3-oss/env-nextjs`

### 3. **Telemetry Integration**
- All AI calls include `experimental_telemetry` configuration
- Traces linked to request context via:
  - `functionId`: Operation identifier
  - `messageId`: Chat message correlation
  - `langfuseTraceId`: Distributed tracing ID
  - `agentId`: Multi-agent operation tracking

### 4. **Error Handling Layers**
- **Stream-level**: `onError` callback in streamText
- **Request-level**: try-catch with cleanup
- **Type-safe**: Custom `ChatSDKError` with visibility control
- **Resource cleanup**: Credit reservation finalization on errors

### 5. **Temperature and Model-Specific Options**
- Conditional temperature configuration from model definition (chat route line 569-573)
- Reasoning effort configuration for o-series models
- Provider-specific options passed to underlying AI SDK

### 6. **Timeout Management**
- 290-second timeout for credit cleanup (chat route line 480)
- Abort signal for graceful cancellation
- Cleanup scheduled with Next.js `after()` hook

---

## Dependencies and Versions

| Package | Version | Purpose |
|---------|---------|---------|
| `ai` | 5.0.39 | Vercel AI SDK for chat/text generation |
| `@ai-sdk/openai` | 2.0.12 | OpenAI provider for AI SDK |
| `@ai-sdk/gateway` | 1.0.23 | Multi-provider gateway |
| `openai` | 5.8.2 | Direct OpenAI API client |
| `@t3-oss/env-nextjs` | 0.13.8 | Environment validation |

---

## Configuration Summary

### Required for Chat Operations
```bash
AI_GATEWAY_API_KEY=sk-...
```

### Optional for Image Generation
```bash
OPENAI_API_KEY=sk-...
```

### Optional for Model Override
```bash
DISABLE_MODEL_SELECTION=false
CHAT_MODEL=openai/gpt-5-mini
IMAGE_GEN_MODEL=openai/gpt-image-1
```

### Feature Flags
- Image generation available: `env.OPENAI_API_KEY` is set
- Model selection disabled: `env.DISABLE_MODEL_SELECTION` is true
