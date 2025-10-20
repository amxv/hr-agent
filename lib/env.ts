import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

// Centralized environment parsing and feature flags using t3-oss/t3-env

export const env = createEnv({
  server: {
    // Required core
    POSTGRES_URL: z.string().min(1),
    AI_GATEWAY_API_KEY: z.string().min(1),
    CRON_SECRET: z.string().min(1),
    AUTH_SECRET: z.string().min(1),

    // Blob: on Vercel, the SDK is auto-configured; locally we require a token
    BLOB_READ_WRITE_TOKEN: z.string().min(1),

    // OAuth providers (optional - at least one recommended)
    AUTH_GOOGLE_ID: z.string().optional(),
    AUTH_GOOGLE_SECRET: z.string().optional(),
    AUTH_GITHUB_ID: z.string().optional(),
    AUTH_GITHUB_SECRET: z.string().optional(),

    // Optional features
    REDIS_URL: z.string().optional(),
    OPENAI_API_KEY: z.string().optional(),
    TAVILY_API_KEY: z.string().optional(),
    EXA_API_KEY: z.string().optional(),
    FIRECRAWL_API_KEY: z.string().optional(),
    SANDBOX_TEMPLATE_ID: z.string().optional(),

    // Model selection control
    DISABLE_MODEL_SELECTION: z.boolean().optional().default(false),
    CHAT_MODEL: z.string().optional(),
    DEEPRESEARCH_MODEL: z.string().optional(),
    IMAGE_GEN_MODEL: z.string().optional(),

    // Misc / platform
    LOG_LEVEL: z.string().optional(),
    VERCEL_URL: z.string().optional(),
    VERCEL_PROJECT_PRODUCTION_URL: z.string().optional(),
    CONTEXT_SIZE: z.string().optional(),
  },
  client: {
    NEXT_PUBLIC_SANDBOX_AVAILABLE: z.boolean().optional(),
    NEXT_PUBLIC_TAVILY_AVAILABLE: z.boolean().optional(),
    NEXT_PUBLIC_OPENAI_AVAILABLE: z.boolean().optional(),
    NEXT_PUBLIC_EXA_AVAILABLE: z.boolean().optional(),
    NEXT_PUBLIC_FIRECRAWL_AVAILABLE: z.boolean().optional(),
    NEXT_PUBLIC_NODE_ENV: z.string().optional(),
    NEXT_PUBLIC_DISABLE_MODEL_SELECTION: z.boolean().optional(),
    NEXT_PUBLIC_CHAT_MODEL: z.string().optional(),
  },
  runtimeEnv: {
    POSTGRES_URL: process.env.POSTGRES_URL,
    AI_GATEWAY_API_KEY: process.env.AI_GATEWAY_API_KEY,
    CRON_SECRET: process.env.CRON_SECRET,
    AUTH_SECRET: process.env.AUTH_SECRET,
    AUTH_GOOGLE_ID: process.env.AUTH_GOOGLE_ID,
    AUTH_GOOGLE_SECRET: process.env.AUTH_GOOGLE_SECRET,
    AUTH_GITHUB_ID: process.env.AUTH_GITHUB_ID,
    AUTH_GITHUB_SECRET: process.env.AUTH_GITHUB_SECRET,
    BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN,
    REDIS_URL: process.env.REDIS_URL,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    TAVILY_API_KEY: process.env.TAVILY_API_KEY,
    EXA_API_KEY: process.env.EXA_API_KEY,
    FIRECRAWL_API_KEY: process.env.FIRECRAWL_API_KEY,
    SANDBOX_TEMPLATE_ID: process.env.SANDBOX_TEMPLATE_ID,
    DISABLE_MODEL_SELECTION: process.env.DISABLE_MODEL_SELECTION === "true",
    CHAT_MODEL: process.env.CHAT_MODEL,
    DEEPRESEARCH_MODEL: process.env.DEEPRESEARCH_MODEL,
    IMAGE_GEN_MODEL: process.env.IMAGE_GEN_MODEL,
    LOG_LEVEL: process.env.LOG_LEVEL,
    NEXT_PUBLIC_NODE_ENV: process.env.NODE_ENV,
    VERCEL_URL: process.env.VERCEL_URL,
    VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
    CONTEXT_SIZE: process.env.CONTEXT_SIZE,
    // Enable / disable features based on environment variables
    NEXT_PUBLIC_SANDBOX_AVAILABLE: Boolean(process.env.SANDBOX_TEMPLATE_ID),
    NEXT_PUBLIC_TAVILY_AVAILABLE: Boolean(process.env.TAVILY_API_KEY),
    NEXT_PUBLIC_OPENAI_AVAILABLE: Boolean(process.env.OPENAI_API_KEY),
    NEXT_PUBLIC_EXA_AVAILABLE: Boolean(process.env.EXA_API_KEY),
    NEXT_PUBLIC_FIRECRAWL_AVAILABLE: Boolean(process.env.FIRECRAWL_API_KEY),
    NEXT_PUBLIC_DISABLE_MODEL_SELECTION: process.env.NEXT_PUBLIC_DISABLE_MODEL_SELECTION === "true",
    NEXT_PUBLIC_CHAT_MODEL: process.env.NEXT_PUBLIC_CHAT_MODEL,
  },
});
