"use client";

import { type Citation, CitationLink } from "./citation-link";

type CitationsProps = {
  citations: Citation[];
};

export type { Citation };

export function Citations({ citations }: CitationsProps) {
  if (citations.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 border-gray-200 border-t pt-3 dark:border-gray-800">
      <div className="space-y-2">
        <p className="font-medium text-gray-700 text-xs dark:text-gray-300">
          Sources
        </p>
        <div className="flex flex-wrap gap-2">
          {citations.map((citation, index) => (
            <CitationLink
              citation={citation}
              index={index + 1}
              key={`${citation.documentId}-${index}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
