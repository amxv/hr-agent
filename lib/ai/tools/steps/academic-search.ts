import Exa from "exa-js";
import { env } from "@/lib/env";
import type { StreamWriter } from "../../types";

export type AcademicSearchResult = {
  source: "academic";
  title: string;
  url: string;
  content: string;
};

export type AcademicSearchResponse = {
  results: AcademicSearchResult[];
  error?: string;
};

const exa = new Exa(env.EXA_API_KEY as string);

export async function academicSearchStep({
  query,
  maxResults,
  dataStream,
  stepId,
  annotate = true,
}: {
  query: string;
  maxResults: number;
  dataStream: StreamWriter;
  stepId: string;
  annotate?: boolean;
}): Promise<AcademicSearchResponse> {
  try {
    // Send running annotation
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
    const academicResults = await exa.searchAndContents(query, {
      type: "auto",
      numResults: maxResults,
      category: "research paper",
      summary: true,
    });

    const results = academicResults.results.map((r) => ({
      source: "academic" as const,
      title: r.title || "",
      url: r.url || "",
      content: r.summary || "",
    }));

    // Send completed annotation
    if (annotate) {
      dataStream.write({
        type: "data-researchUpdate",
        id: stepId,
        data: {
          title: `Searching for "${query}"`,
          type: "web",
          status: "completed",
          queries: [query],
          results,
        },
      });
    }

    return { results };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    // Send error annotation
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

    return { results: [], error: errorMessage };
  }
}
