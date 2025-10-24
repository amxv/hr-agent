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
    <div className="mt-4">
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
  );
}
