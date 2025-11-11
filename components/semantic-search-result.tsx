"use client";

import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type {
  SemanticSearchInput,
  SemanticSearchOutput,
} from "@/lib/ai/tools/semantic-search";

type SemanticSearchResultProps = {
  state: "input-available" | "output-available";
  input: SemanticSearchInput;
  output?: SemanticSearchOutput | { error: string };
};

export function SemanticSearchResult({
  state,
  input,
  output,
}: SemanticSearchResultProps) {
  // Input Available State - Loading
  if (state === "input-available") {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-blue-900 text-sm dark:border-blue-800 dark:bg-blue-950 dark:text-blue-100">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>
          Searching for: <span className="font-medium">{input.query}</span>
          {input.limit && input.limit !== 5 && (
            <span className="ml-2 text-xs opacity-75">
              (limit: {input.limit})
            </span>
          )}
        </span>
      </div>
    );
  }

  // Output Available State
  if (state === "output-available" && output) {
    // Error State
    if ("error" in output) {
      return (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-900 text-sm dark:border-red-800 dark:bg-red-950 dark:text-red-100">
          <p className="font-medium">Error searching documents</p>
          <p className="mt-1 text-xs opacity-90">{output.error}</p>
          <p className="mt-2 text-xs opacity-75">
            Try rephrasing your query or check if documents are available.
          </p>
        </div>
      );
    }

    // Success State
    const { results, totalResults } = output;

    if (totalResults === 0) {
      return (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-gray-700 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
          <p className="font-medium">No results found</p>
          <p className="mt-1 text-xs opacity-75">
            No relevant documents found for your query.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-gray-700 text-sm dark:text-gray-300">
          <span className="font-medium">
            Found {totalResults} result{totalResults !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="space-y-2">
          {results.map((result, index) => (
            <Card
              className="overflow-hidden p-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-900"
              key={`${result.documentId}-${index}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900 text-sm dark:text-gray-100">
                      {result.documentName}
                    </p>
                    {result.pageNumber && (
                      <Badge className="text-xs" variant="outline">
                        p. {result.pageNumber}
                      </Badge>
                    )}
                  </div>

                  {result.chunkContent && (
                    <p className="line-clamp-3 break-words text-gray-600 text-xs dark:text-gray-400">
                      {result.chunkContent}
                    </p>
                  )}
                </div>

                <Badge className="shrink-0 text-xs" variant="secondary">
                  #{index + 1}
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return null;
}
