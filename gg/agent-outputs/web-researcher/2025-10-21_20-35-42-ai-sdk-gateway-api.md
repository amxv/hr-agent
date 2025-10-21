# AI SDK Gateway Function API Research

## Summary

The `gateway()` function from `@ai-sdk/gateway` takes **only one argument**: the model ID string in the format `"provider/model-name"`. Your code is failing because you're passing two arguments when only one is expected.

---

## Key Findings

### 1. Correct Function Signature

**Source**: [Official AI SDK Documentation - AI Gateway Provider](https://ai-sdk.dev/providers/ai-sdk-providers/ai-gateway)

The `gateway()` function signature is:
```typescript
gateway(modelId: string): LanguageModel
```

It takes a **single argument** - the model ID as a string in `creator/model-name` format.

**Official example from documentation:**
```typescript
import { generateText, gateway } from 'ai';

const { text } = await generateText({
  model: gateway('openai/gpt-5'),  // ← Only ONE argument
  prompt: 'Hello world',
});
```

**npm package example** (from https://www.npmjs.com/package/@ai-sdk/gateway):
```typescript
import { gateway } from '@ai-sdk/gateway';
import { generateText } from 'ai';

const { text } = await generateText({
  model: gateway('xai/grok-3-beta'),  // ← Single model ID string
  prompt: 'Tell me about the history of the San Francisco Mission-style burrito.',
});
```

---

### 2. Handling API Key Configuration

If you need to configure API key and other settings, you must use **`createGateway()`** instead, which is available from the `'ai'` package (version 5.0.36+) or `'@ai-sdk/gateway'`:

**Source**: [AI SDK Documentation - Provider Instance](https://ai-sdk.dev/providers/ai-sdk-providers/ai-gateway#provider-instance)

```typescript
import { createGateway } from 'ai';

const gateway = createGateway({
  apiKey: process.env.AI_GATEWAY_API_KEY ?? '',
  // Optional settings:
  baseURL: 'https://custom-url.com/v1/ai',
  headers: { 'Custom-Header': 'value' },
  fetch: customFetchImplementation,
  metadataCacheRefreshMillis: 300000,
});

// Then use it with a model ID:
const model = gateway('openai/gpt-5');
```

---

### 3. Configuration Options

When using `createGateway()`, these options are available:

| Option | Type | Description | Default |
|--------|------|-------------|---------|
| **apiKey** | `string` | API key sent via Authorization header | `AI_GATEWAY_API_KEY` env var |
| **baseURL** | `string` | Custom URL prefix for API calls | `https://ai-gateway.vercel.sh/v1/ai` |
| **headers** | `Record<string,string>` | Custom headers for requests | — |
| **fetch** | `(input, init?) => Promise<Response>` | Custom fetch implementation | Global `fetch` |
| **metadataCacheRefreshMillis** | `number` | Cache refresh frequency in ms | `300000` (5 minutes) |

---

## Solution for Your Code

**Your current failing code:**
```typescript
import { gateway } from "@ai-sdk/gateway";

const languageProvider = gateway(model.id, {
  apiKey: env.AI_GATEWAY_API_KEY,  // ← Error: 2 arguments, expected 1
});
```

**Corrected approach:**

**Option A: Simple usage (uses environment variable)**
```typescript
import { generateText } from 'ai';

const { text } = await generateText({
  model: 'openai/gpt-5',  // Plain string, gateway is default
  prompt: 'Hello world',
});
```

**Option B: Custom provider with configuration**
```typescript
import { createGateway } from 'ai';
import { generateText } from 'ai';

const gatewayProvider = createGateway({
  apiKey: env.AI_GATEWAY_API_KEY,
});

const { text } = await generateText({
  model: gatewayProvider('openai/gpt-5'),
  prompt: 'Hello world',
});
```

**Option C: Using @ai-sdk/gateway directly**
```typescript
import { createGateway } from '@ai-sdk/gateway';
import { generateText } from 'ai';

const gatewayProvider = createGateway({
  apiKey: env.AI_GATEWAY_API_KEY,
});

const { text } = await generateText({
  model: gatewayProvider('openai/gpt-5'),
  prompt: 'Hello world',
});
```

---

## Return Value

- **`gateway(modelId)` returns**: A `LanguageModel` instance that can be passed to AI SDK functions like:
  - `generateText()`
  - `streamText()`
  - `generateObject()`
  - `streamObject()`

---

## Version Information

- Latest version: **2.0.0** (as of the search date)
- Version you mentioned: **1.0.23** (older but should follow same API)
- The API has remained consistent across versions

---

## Authentication Methods

### 1. Environment Variable (Default)
The provider automatically uses `AI_GATEWAY_API_KEY` environment variable if no key is provided.

### 2. Explicit Configuration
Pass the API key directly via `createGateway()` options.

### 3. OIDC Authentication (Vercel Deployments Only)
When deployed to Vercel, OIDC tokens are automatically handled without needing an API key.

---

## Complete Working Example

```typescript
import { createGateway } from 'ai';
import { generateText, streamText } from 'ai';

// Create provider with custom config
const gatewayProvider = createGateway({
  apiKey: process.env.AI_GATEWAY_API_KEY,
  headers: {
    'X-Custom-Header': 'value'
  }
});

// Generate text
const { text } = await generateText({
  model: gatewayProvider('anthropic/claude-sonnet-4'),
  prompt: 'Write a haiku about programming',
});

// Stream text
const { textStream } = await streamText({
  model: gatewayProvider('openai/gpt-5'),
  prompt: 'Explain quantum computing',
});

for await (const chunk of textStream) {
  process.stdout.write(chunk);
}
```

---

## References

1. [Official AI SDK Gateway Documentation](https://ai-sdk.dev/providers/ai-sdk-providers/ai-gateway)
2. [npm Package: @ai-sdk/gateway](https://www.npmjs.com/package/@ai-sdk/gateway)
3. [AI Gateway Setup Guide](https://vercel.com/docs/ai-gateway/getting-started)
