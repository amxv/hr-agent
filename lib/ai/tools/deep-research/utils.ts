import type { ModelId } from "@ai-models/vercel-gateway";
import type { ModelMessage, ToolModelMessage } from "ai";
import { experimental_createMCPClient } from "ai";
import type { StreamWriter } from "@/lib/ai/types";
import { getAppModelDefinition } from "../../app-models";
import { firecrawlWebSearch, tavilyWebSearch } from "../web-search";
import type { DeepResearchConfig, SearchAPI } from "./configuration";

// MCP Utils

type McpClient = Awaited<ReturnType<typeof experimental_createMCPClient>>;
type McpToolSet = Awaited<ReturnType<McpClient["tools"]>>;

export async function loadMcpTools(
  config: DeepResearchConfig,
  existingToolNames: Set<string>
) {
  if (!config.mcp_config?.url) {
    return {};
  }

  let client: McpClient | null = null;
  try {
    // Create MCP client based on configuration
    // Currently supports SSE transport only
    client = await experimental_createMCPClient({
      transport: {
        type: "sse",
        url: config.mcp_config.url,
      },
    });

    // Get all available tools from the MCP server
    const tools = await client.tools();

    // Filter tools based on configuration and existing tools
    const filteredTools: McpToolSet = {};

    for (const [toolName, tool] of Object.entries(tools)) {
      // Skip if tool already exists
      if (existingToolNames.has(toolName)) {
        console.log(
          `Skipping tool ${toolName} because a tool with that name already exists`
        );
        continue;
      }

      // If specific tools are configured, only include those
      if (
        config.mcp_config.tools &&
        config.mcp_config.tools.length > 0 &&
        !config.mcp_config.tools.includes(toolName)
      ) {
        console.log(`Skipping tool ${toolName} because it's not in the config`);
        continue;
      }

      filteredTools[toolName] = tool;
    }

    return filteredTools;
  } catch (error) {
    console.error("Failed to load MCP tools:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    return {};
  } finally {
    // Clean up the client connection
    if (client) {
      await client.close();
    }
  }
}

// Tool Utils

export function getSearchTool(
  searchApi: SearchAPI,
  _config: DeepResearchConfig,
  dataStream: StreamWriter,
  _id?: string
) {
  if (searchApi === "tavily") {
    return {
      webSearch: tavilyWebSearch({ dataStream, writeTopLevelUpdates: false }),
    };
  }
  if (searchApi === "firecrawl") {
    return {
      webSearch: firecrawlWebSearch({
        dataStream,
        writeTopLevelUpdates: false,
      }),
    };
  }
  throw new Error(`Unsupported search API: ${searchApi}`);
}

export async function getAllTools(
  config: DeepResearchConfig,
  dataStream: StreamWriter,
  id?: string
) {
  if (config.search_api === "none") {
    const mcpTools = await loadMcpTools(config, new Set<string>());
    return mcpTools;
  }

  const searchTools = getSearchTool(config.search_api, config, dataStream, id);
  const existingToolNames = new Set<string>(Object.keys(searchTools));

  const mcpTools = await loadMcpTools(config, existingToolNames);

  return { ...mcpTools, ...searchTools };
}

export function getNotesFromToolCalls(messages: ModelMessage[]): string[] {
  return (
    messages
      .filter<ToolModelMessage>((message) => message.role === "tool")
      // TODO: This might need to be improved to get the output of the tool call parts
      .map((message) => JSON.stringify(message.content))
  );
}

export function getModelContextWindow(modelId: ModelId): number {
  return getAppModelDefinition(modelId).context_window;
}

// Misc Utils
export function getTodayStr(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
