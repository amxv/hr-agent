import FirecrawlApp, { type SearchParams } from "@mendable/firecrawl-js";
import { type TavilySearchOptions, tavily } from "@tavily/core";
import { env } from "@/lib/env";
import { createModuleLogger } from "../../../logger";
import type { StreamWriter } from "../../types";

export type SearchProvider = "tavily" | "firecrawl";

export type SearchProviderOptions =
  | ({
      provider: "tavily";
    } & Omit<TavilySearchOptions, "limit">)
  | ({
      provider: "firecrawl";
    } & SearchParams);

export type WebSearchResult = {
  source: "web";
  title: string;
  url: string;
  content: string;
};

export type WebSearchResponse = {
  results: WebSearchResult[];
  error?: string;
};

// Initialize search providers
const tvly = tavily({ apiKey: env.TAVILY_API_KEY as string });
const firecrawl = new FirecrawlApp({
  apiKey: env.FIRECRAWL_API_KEY ?? "",
});

const log = createModuleLogger("tools/steps/web-search");

export async function webSearchStep({
  query,
  maxResults,
  providerOptions,
  dataStream: _dataStream,
}: {
  query: string;
  maxResults: number;
  dataStream: StreamWriter;
  providerOptions: SearchProviderOptions;
}): Promise<WebSearchResponse> {
  try {
    let results: WebSearchResult[] = [];

    if (providerOptions.provider === "tavily") {
      const response = await tvly.search(query, {
        searchDepth: providerOptions.searchDepth || "basic",
        maxResults,
        includeAnswer: true,
        ...providerOptions,
      });

      results = response.results.map((r) => ({
        source: "web",
        title: r.title,
        url: r.url,
        content: r.content,
      }));
    } else if (providerOptions.provider === "firecrawl") {
      const response = await firecrawl.search(query, {
        timeout: providerOptions.timeout || 15_000,
        limit: maxResults,
        scrapeOptions: { formats: ["markdown"] },
        ...providerOptions,
      });

      results = response.data.map((item) => ({
        source: "web",
        title: item.title || "",
        url: item.url || "",
        content: item.markdown || "",
      }));
    }

    log.debug(
      { query, maxResults, provider: providerOptions.provider },
      "webSearchStep success"
    );
    return { results };
  } catch (error: unknown) {
    // Best-effort extraction without using `any`
    let message: string | undefined;
    let stack: string | undefined;
    let status: number | undefined;
    let data: unknown;

    if (typeof error === "object" && error !== null) {
      if (
        "message" in error &&
        typeof (error as { message: unknown }).message === "string"
      ) {
        message = (error as { message: string }).message;
      }
      if (
        "stack" in error &&
        typeof (error as { stack: unknown }).stack === "string"
      ) {
        stack = (error as { stack: string }).stack;
      }
      const maybeResp = (
        error as { response?: { status?: number; data?: unknown } }
      ).response;
      if (maybeResp) {
        status = maybeResp.status;
        data = maybeResp.data;
      }
    }

    log.error(
      {
        err: error,
        message,
        stack,
        status,
        data,
        query,
        providerOptions,
      },
      "Error in webSearchStep"
    );
    return {
      results: [],
      error: JSON.stringify(
        {
          message,
          status,
          data,
        },
        null,
        2
      ),
    };
  }
}
