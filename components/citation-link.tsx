"use client";

import { ExternalLink } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type Citation = {
  documentId: string;
  documentName: string;
  pageNumber: number | null;
  excerpt: string;
  blobUrl: string;
};

type CitationLinkProps = {
  citation: Citation;
  index: number;
};

export function CitationLink({ citation, index }: CitationLinkProps) {
  const { documentName, pageNumber, blobUrl, excerpt } = citation;

  // Build the URL with page fragment if page number is available
  // Note: #page=N works in Chrome, Firefox, Edge but not Safari
  const url = pageNumber ? `${blobUrl}#page=${pageNumber}` : blobUrl;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <a
            className="inline-flex items-center gap-1 rounded bg-blue-100 px-1.5 py-0.5 font-mono text-blue-700 text-xs hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-300 dark:hover:bg-blue-800"
            href={url}
            rel="noopener noreferrer"
            target="_blank"
          >
            <span>[{index}]</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </TooltipTrigger>
        <TooltipContent className="max-w-sm" side="top">
          <div className="space-y-1">
            <p className="font-medium">{documentName}</p>
            {pageNumber && (
              <p className="text-xs opacity-75">Page {pageNumber}</p>
            )}
            {excerpt && (
              <p className="mt-2 text-xs italic opacity-90">
                "
                {excerpt.length > 150
                  ? `${excerpt.substring(0, 150)}...`
                  : excerpt}
                "
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
