import Exa from "exa-js";
import { env } from "@/lib/env";
import type { StreamWriter } from "../../types";

export type XSearchResult = {
  source: "x";
  title: string;
  url: string;
  content: string;
  tweetId: string;
  author?: string;
  text?: string;
};

export type XSearchResponse = {
  results: XSearchResult[];
  error?: string;
};

// Initialize Exa client
const exa = new Exa(env.EXA_API_KEY as string);

// Extract tweet ID from URL
const extractTweetId = (url: string): string | null => {
  const match = url.match(/(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/);
  return match ? match[1] : null;
};

export async function xSearchStep({
  query,
  type,
  maxResults = 5,
  dataStream,
  stepId,
  annotate = true,
}: {
  query: string;
  type: "neural" | "keyword";
  maxResults?: number;
  dataStream: StreamWriter;
  stepId: string;
  annotate?: boolean;
}): Promise<XSearchResponse> {
  try {
    // Send running status
    if (annotate) {
      dataStream.write({
        type: "data-researchUpdate",
        id: stepId,
        data: {
          title: `Searching for "${query}"`,
          type: "web",
          status: "running",
          queries: [query],
        },
      });
    }

    const xResults = await exa.searchAndContents(query, {
      type,
      useAutoprompt: true,
      numResults: maxResults,
      text: true,
      highlights: true,
      includeDomains: ["twitter.com", "x.com"],
    });

    // Process tweets to include tweet IDs
    const processedTweets = xResults.results
      .map((result) => {
        const tweetId = extractTweetId(result.url);
        if (!tweetId) {
          return null;
        }

        return {
          source: "x" as const,
          title: result.title || result.author || "Tweet",
          url: result.url,
          content: result.text || "",
          tweetId,
        };
      })
      .filter((tweet): tweet is XSearchResult => tweet !== null);

    // Send completed status
    if (annotate) {
      dataStream.write({
        type: "data-researchUpdate",
        id: stepId,
        data: {
          title: `Searching for "${query}"`,
          type: "web",
          status: "completed",
          queries: [query],
          results: processedTweets,
        },
      });
    }

    return { results: processedTweets };
  } catch (error: any) {
    const errorMessage = error?.message || "Unknown error occurred";

    // Send error status
    if (annotate) {
      dataStream.write({
        type: "data-researchUpdate",
        id: stepId,
        data: {
          title: `Searching for "${query}"`,
          type: "web",
          status: "completed",
          queries: [query],
        },
      });
    }

    return {
      results: [],
      error: errorMessage,
    };
  }
}
