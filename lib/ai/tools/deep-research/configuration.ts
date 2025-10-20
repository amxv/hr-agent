import { z } from "zod";

// Simplified search API enum
export const SearchAPIEnum = z.enum(["firecrawl", "tavily", "none"]);
export type SearchAPI = z.infer<typeof SearchAPIEnum>;

// MCP Configuration schema
export const MCPConfigSchema = z.object({
  url: z.string().optional(),
  tools: z.array(z.string()).optional(),
  headers: z.record(z.string(), z.string()).optional(),
});

export type MCPConfig = z.infer<typeof MCPConfigSchema>;

// Simple configuration object
export const DeepResearchConfigSchema = z.object({
  // General Configuration
  max_structured_output_retries: z.number().int().min(1).max(10).default(3),
  allow_clarification: z.boolean().default(true),
  max_concurrent_research_units: z.number().int().min(1).max(20).default(2),

  // Research Configuration
  search_api: SearchAPIEnum.default("tavily"),
  search_api_max_queries: z.number().int().min(1).max(10).default(2),
  max_researcher_iterations: z.number().int().min(1).max(10).default(1),

  // Model Configuration
  summarization_model: z.string().default("openai/gpt-4o-mini"),
  summarization_model_max_tokens: z.number().int().default(4000),
  research_model: z.string().default("openai/gpt-4o-mini"),
  research_model_max_tokens: z.number().int().default(4000),
  compression_model: z.string().default("openai/gpt-4o-mini"),
  compression_model_max_tokens: z.number().int().default(4000),
  final_report_model: z.string().default("openai/gpt-4o"),
  final_report_model_max_tokens: z.number().int().default(6000),
  status_update_model: z.string().default("openai/gpt-4o-mini"),
  status_update_model_max_tokens: z.number().int().default(4000),

  // MCP server configuration
  mcp_config: MCPConfigSchema.optional(),
  mcp_prompt: z.string().optional(),
});

export type DeepResearchConfig = z.infer<typeof DeepResearchConfigSchema>;

// Simple factory function
export function createDeepResearchConfig(
  overrides: Partial<DeepResearchConfig> = {}
): DeepResearchConfig {
  return DeepResearchConfigSchema.parse(overrides);
}

// Load from environment variables
export function loadConfigFromEnv(): DeepResearchConfig {
  const envConfig: Partial<DeepResearchConfig> = {};

  // Map env vars to config fields
  const envMappings: Record<string, keyof DeepResearchConfig> = {
    SEARCH_API: "search_api",
    RESEARCH_MODEL: "research_model",
    SUMMARIZATION_MODEL: "summarization_model",
    COMPRESSION_MODEL: "compression_model",
    FINAL_REPORT_MODEL: "final_report_model",
    MAX_CONCURRENT_RESEARCH_UNITS: "max_concurrent_research_units",
    MAX_RESEARCHER_ITERATIONS: "max_researcher_iterations",
    ALLOW_CLARIFICATION: "allow_clarification",
  };

  for (const [envKey, configKey] of Object.entries(envMappings)) {
    const value = process.env[envKey];
    if (value) {
      // Parse based on type
      if (configKey === "allow_clarification") {
        (envConfig as any)[configKey] = value.toLowerCase() === "true";
      } else if (configKey.includes("max_") || configKey.includes("_tokens")) {
        const parsed = Number.parseInt(value, 10);
        if (!Number.isNaN(parsed)) {
          (envConfig as any)[configKey] = parsed;
        }
      } else {
        (envConfig as any)[configKey] = value;
      }
    }
  }

  return createDeepResearchConfig(envConfig);
}

// Export constants
export const SEARCH_API = {
  ANTHROPIC: "anthropic" as const,
  OPENAI: "openai" as const,
  TAVILY: "tavily" as const,
  NONE: "none" as const,
} as const;
