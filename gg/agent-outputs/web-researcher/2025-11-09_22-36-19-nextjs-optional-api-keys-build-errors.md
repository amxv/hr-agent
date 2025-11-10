# Handling Optional API Keys in Next.js 15 Builds with Vercel AI SDK

**Research Date**: November 9, 2025
**Context**: Next.js 15 application with Vercel AI SDK and OpenAI SDK, experiencing build-time errors when OPENAI_API_KEY is optional

---

## Executive Summary

Next.js executes module-level code during the "Collecting page data" build phase, even for edge runtime API routes. This causes the OpenAI SDK to throw "No API key provided" errors during builds when modules instantiate clients at the top level, regardless of lazy initialization patterns within the module.

**Key Finding**: The solution is to use a **getter pattern** where client instantiation lives inside functions rather than at module level, combined with proper runtime configuration.

---

## Problem Analysis

### Why Next.js Executes API Route Code During Build

1. **Build-time Module Evaluation**: Next.js loads and evaluates all route modules during the "Collecting page data" phase to determine which routes are static vs dynamic
2. **Module-level Code Runs**: Any code at the module level (outside of exported functions) executes during this phase
3. **Edge Runtime Doesn't Prevent This**: Setting `export const runtime = 'edge'` or `export const dynamic = 'force-dynamic'` marks the route as dynamic but doesn't prevent module evaluation

### Source Discussion

From [Next.js Discussion #35534](https://github.com/vercel/next.js/discussions/35534):
> "For now only workaround is to remove all module level process.env access and add export const dynamic = 'force-dynamic' to your routes."

From [Next.js Discussion #50884](https://github.com/vercel/next.js/discussions/50884):
> "What you can do, as shown in #35534 (reply in thread) is to switch to a getter pattern, where the checks that used to be at top of the module, live within a function instead, so that you ought to call it to trigger the code execution, and for dynamic pages that won't happen at pre-render time."

---

## Solution Patterns

### 1. Getter Pattern for Client Instantiation (Recommended)

Instead of instantiating clients at module level, use functions that return clients:

```typescript
// ❌ BAD - Executes during build
import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Throws if undefined during build
});
```

```typescript
// ✅ GOOD - Only executes at runtime
import { OpenAI } from 'openai';

function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

export async function POST(req: Request) {
  const client = getOpenAIClient();
  if (!client) {
    return Response.json({ error: 'OpenAI not configured' }, { status: 503 });
  }
  // Use client...
}
```

### 2. Global Singleton Pattern (for Shared Instances)

For services that should persist across requests, use the global object pattern (similar to Prisma):

```typescript
// lib/openai-client.ts
import { OpenAI } from 'openai';

declare global {
  // eslint-disable-next-line no-var
  var openaiClient: OpenAI | undefined;
}

function getOpenAIClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  if (process.env.NODE_ENV === 'production') {
    return new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  } else {
    // In development, use global to prevent hot reload from creating new instances
    if (!global.openaiClient) {
      global.openaiClient = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }
    return global.openaiClient;
  }
}

export { getOpenAIClient };
```

**Source**: [Stack Overflow - Preventing Next.js from instantiating singletons multiple times](https://stackoverflow.com/questions/75272877/how-to-prevent-next-js-from-instantiating-a-singleton-class-object-multiple-time)

**Caveat**: In development with hot module replacement, this prevents new code from loading. You'll need to restart the dev server when changing the client class.

### 3. Lazy Module Import with Dynamic Import

For components or API routes that don't need SSR/build-time execution:

```typescript
// app/api/chat/route.ts
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  // Dynamic import delays module loading until runtime
  const { OpenAI } = await import('openai');

  if (!process.env.OPENAI_API_KEY) {
    return Response.json({ error: 'OpenAI not configured' }, { status: 503 });
  }

  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  // Use client...
}
```

**Note**: This adds runtime overhead for the import on every request. Best for infrequently called routes.

---

## Vercel AI SDK Specific Patterns

### Creating Providers with Optional API Keys

The Vercel AI SDK providers use environment variables by default, but you can create them conditionally:

```typescript
// lib/ai-providers.ts
import { createOpenAI } from '@ai-sdk/openai';

export function getOpenAIProvider() {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  return createOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}
```

**Source**: [Vercel AI SDK Discussion #1545](https://github.com/vercel/ai/discussions/1545)

### Conditional Tool Availability

Use the `activeTools` property to conditionally enable tools based on environment:

```typescript
// app/api/chat/route.ts
import { generateText } from 'ai';
import { weatherTool } from '@/tools/weather';
import { searchTool } from '@/tools/search';
import { openaiTool } from '@/tools/openai-tool';

const allTools = {
  weather: weatherTool,
  search: searchTool,
  openai: openaiTool,
};

export async function POST(req: Request) {
  // Determine which tools are available
  const activeToolNames: string[] = ['weather', 'search'];

  if (process.env.OPENAI_API_KEY) {
    activeToolNames.push('openai');
  }

  const result = await generateText({
    model: 'anthropic/claude-3-5-sonnet-20241022',
    tools: allTools,
    activeTools: activeToolNames, // Only these tools will be available to the model
    // ...
  });
}
```

**Source**: [AI SDK Tools Documentation](https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling#active-tools)

### Tool-Level Environment Checks

Check for required environment variables in tool execution:

```typescript
import { tool } from 'ai';
import { z } from 'zod';

export const openaiTool = tool({
  description: 'Generate embeddings using OpenAI',
  inputSchema: z.object({
    text: z.string(),
  }),
  execute: async ({ text }) => {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    const { OpenAI } = await import('openai');
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Use client...
    return { embeddings: [] };
  },
});
```

When tools throw errors, the AI SDK adds them as `tool-error` content parts, enabling automated LLM recovery in multi-step scenarios.

---

## Route Segment Configuration

### Preventing Static Generation

```typescript
// app/api/chat/route.ts

// Prevent any static optimization
export const dynamic = 'force-dynamic';

// Use edge runtime for lower latency
export const runtime = 'edge';

// Disable all fetch caching
export const fetchCache = 'force-no-store';

export async function POST(req: Request) {
  // Your API route logic
}
```

**Important**: These configurations mark routes as dynamic but **do not prevent module-level code execution during build**. You must still use getter patterns.

**Source**: [Next.js Route Segment Config Documentation](https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config)

---

## Environment Variable Best Practices

### 1. Using t3-env for Optional Keys

```typescript
// env.ts
import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  server: {
    // Optional API key - won't throw during build if missing
    OPENAI_API_KEY: z.string().optional(),

    // Required API key - will throw during build if missing
    DATABASE_URL: z.string().min(1),
  },
  client: {},
  runtimeEnv: {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    DATABASE_URL: process.env.DATABASE_URL,
  },
});
```

### 2. Runtime vs Build-time Environment Variables

```typescript
// ❌ BAD - Module-level access can execute during build
const apiKey = process.env.OPENAI_API_KEY;

if (apiKey) {
  // This might run during build
  const client = new OpenAI({ apiKey });
}
```

```typescript
// ✅ GOOD - Function-level access only runs at runtime
function getClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  return new OpenAI({ apiKey });
}
```

---

## Complete Example: API Route with Optional OpenAI

```typescript
// app/api/chat/route.ts
import { streamText, tool } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

// Getter function for OpenAI provider
function getOpenAIProvider() {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }
  return createOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

// Tool that uses OpenAI - checks availability at runtime
const embeddingTool = tool({
  description: 'Generate embeddings for semantic search',
  inputSchema: z.object({
    text: z.string(),
  }),
  execute: async ({ text }) => {
    const openai = getOpenAIProvider();
    if (!openai) {
      throw new Error('OpenAI embeddings not available');
    }

    const { embed } = await import('ai');
    const { embedding } = await embed({
      model: openai.embedding('text-embedding-3-small'),
      value: text,
    });

    return { embedding };
  },
});

// Regular tool that doesn't need OpenAI
const weatherTool = tool({
  description: 'Get weather information',
  inputSchema: z.object({
    location: z.string(),
  }),
  execute: async ({ location }) => {
    return { temperature: 72, location };
  },
});

export async function POST(req: Request) {
  const { messages } = await req.json();

  // Determine available tools at runtime
  const tools: Record<string, any> = {
    weather: weatherTool,
  };

  const activeTools = ['weather'];

  // Only add OpenAI-dependent tools if key is available
  if (process.env.OPENAI_API_KEY) {
    tools.embedding = embeddingTool;
    activeTools.push('embedding');
  }

  const result = streamText({
    model: anthropic('claude-3-5-sonnet-20241022'),
    messages,
    tools,
    activeTools,
  });

  return result.toDataStreamResponse();
}
```

---

## Next.js Configuration Options

### serverComponentsExternalPackages

For packages that have issues with bundling (doesn't solve build-time execution):

```javascript
// next.config.js
module.exports = {
  experimental: {
    serverComponentsExternalPackages: ['openai'],
  },
};
```

### Edge Runtime Limitations

Some Node.js APIs aren't available in edge runtime. If you need Node.js APIs:

```typescript
export const runtime = 'nodejs'; // default
```

---

## Testing Strategy

### 1. Verify Build Doesn't Require Optional Keys

```bash
# Remove optional key and verify build succeeds
unset OPENAI_API_KEY
npm run build
```

### 2. Verify Runtime Behavior Without Key

```typescript
// Test handler
const response = await fetch('/api/chat', {
  method: 'POST',
  body: JSON.stringify({ messages: [] }),
});

// Should return 503 or work without OpenAI features
expect([200, 503]).toContain(response.status);
```

### 3. Verify Runtime Behavior With Key

```typescript
// Set key
process.env.OPENAI_API_KEY = 'test-key';

const response = await fetch('/api/chat', {
  method: 'POST',
  body: JSON.stringify({ messages: [] }),
});

expect(response.status).toBe(200);
```

---

## Common Pitfalls

### 1. Module-Level Variable Assignment

```typescript
// ❌ Executes during build
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
```

### 2. Module-Level Conditionals

```typescript
// ❌ Still executes during build - checks condition but throws inside OpenAI constructor
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;
```

### 3. Lazy Variable with Module-Level Check

```typescript
// ❌ Variable is lazy but still references OpenAI constructor at module level
let openai: OpenAI | null = null;

if (process.env.OPENAI_API_KEY) {
  // This line itself causes module to require OpenAI initialization logic
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}
```

### 4. Top-Level Await

```typescript
// ❌ Top-level await executes during module loading
const openai = await getOpenAIClient();
```

---

## Additional Resources

### Next.js Documentation
- [Route Segment Config](https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config)
- [Edge Runtime](https://nextjs.org/docs/app/api-reference/edge)
- [Environment Variables](https://nextjs.org/docs/app/guides/environment-variables)

### Vercel AI SDK Documentation
- [Tool Calling](https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling)
- [OpenAI Provider](https://ai-sdk.dev/providers/ai-sdk-providers/openai)
- [Error Handling](https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling#handling-errors)

### Community Discussions
- [Next.js #35534 - Collecting page data environment variables](https://github.com/vercel/next.js/discussions/35534)
- [Next.js #50884 - Preventing prerendering at build time](https://github.com/vercel/next.js/discussions/50884)
- [Vercel AI SDK #1545 - Passing API keys to providers](https://github.com/vercel/ai/discussions/1545)

---

## Migration Checklist

- [ ] Convert module-level client instantiations to getter functions
- [ ] Add runtime checks for optional API keys
- [ ] Update tools to conditionally execute based on environment
- [ ] Use `activeTools` to filter available tools at runtime
- [ ] Set `export const dynamic = 'force-dynamic'` on API routes
- [ ] Test build succeeds without optional environment variables
- [ ] Test runtime behavior with and without optional keys
- [ ] Update error handling to gracefully handle missing providers
- [ ] Document which features require which API keys
- [ ] Update deployment documentation with optional vs required env vars

---

## Conclusion

The root cause of build-time "No API key provided" errors in Next.js is **module-level code execution** during the "Collecting page data" build phase. The solution requires:

1. **Getter Pattern**: Move all client instantiation into functions
2. **Runtime Checks**: Check for environment variables inside functions, not at module level
3. **Conditional Tools**: Use `activeTools` or tool-level checks to handle missing providers
4. **Global Pattern**: For singletons, use the global object pattern to persist across requests

These patterns ensure that environment variables are only accessed and validated at request time, not during the build process.
