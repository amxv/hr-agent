"use client";
import {
  BrainIcon,
  CheckIcon,
  FileTextIcon,
  Lightbulb,
  type LucideIcon,
  SearchIcon,
} from "lucide-react";
import { memo, useMemo } from "react";
import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtHeader,
  ChainOfThoughtSearchResult,
  ChainOfThoughtSearchResults,
  ChainOfThoughtStep,
} from "@/components/ai-elements/chain-of-thought";
import { Response } from "@/components/ai-elements/response";
import type { ChatMessage } from "@/lib/ai/types";
import { useMessagePartsByPartRange } from "@/lib/stores/hooks-message-parts";

type MessageChainOfThoughtProps = {
  messageId: string;
  startIdx: number;
  endIdx: number;
  isLoading: boolean;
};

type ReasoningStep = {
  icon: LucideIcon;
  label: string;
  content: string;
  status: "complete" | "active" | "pending";
};

// Helper function to determine icon based on content
function getIconForStep(content: string): LucideIcon {
  const lowerContent = content.toLowerCase();

  if (
    lowerContent.includes("search") ||
    lowerContent.includes("look") ||
    lowerContent.includes("find")
  ) {
    return SearchIcon;
  }

  if (
    lowerContent.includes("conclude") ||
    lowerContent.includes("therefore") ||
    lowerContent.includes("result") ||
    lowerContent.includes("complete")
  ) {
    return CheckIcon;
  }

  if (
    lowerContent.includes("idea") ||
    lowerContent.includes("consider") ||
    lowerContent.includes("think about")
  ) {
    return Lightbulb;
  }

  return BrainIcon;
}

// Helper function to extract a label from the first sentence or line
function extractLabel(content: string): {
  label: string;
  remainingContent: string;
} {
  // Remove markdown bold/italic formatting for label extraction
  const cleanContent = content.replace(/^\*\*(.+?)\*\*/, "$1").trim();

  // Try to get the first sentence (up to 80 chars)
  const firstSentenceMatch = cleanContent.match(/^([^.!?\n]+[.!?]?)/);
  if (firstSentenceMatch && firstSentenceMatch[1].length <= 80) {
    const label = firstSentenceMatch[1].replace(/[.!?]$/, "").trim();
    // Remove the label from content, including any markdown formatting
    let remainingContent = content
      .replace(/^\*\*[^*]+\*\*\s*/, "")
      .replace(new RegExp(`^${label}[.!?]?\\s*`, "i"), "")
      .trim();

    // If remaining content is empty or very short, just use the original content
    if (remainingContent.length < 10) {
      remainingContent = content;
    }

    return { label, remainingContent };
  }

  // Try to get the first line
  const firstLine = cleanContent.split("\n")[0];
  if (firstLine && firstLine.length <= 80) {
    const label = firstLine.trim();
    const remainingContent = content.split("\n").slice(1).join("\n").trim();
    return {
      label,
      remainingContent: remainingContent || content,
    };
  }

  // Fallback: truncate to 80 chars
  const label =
    cleanContent.slice(0, 80) + (cleanContent.length > 80 ? "..." : "");
  return { label, remainingContent: content };
}

// Component to render semantic search as a CoT step
const SemanticSearchStep = memo(function SemanticSearchStep({
  part,
  isActive,
}: {
  part: Extract<
    ChatMessage["parts"][number],
    { type: "tool-semanticSearch" }
  >;
  isActive: boolean;
}) {
  const { state, input } = part;

  // Loading state
  if (state === "input-available") {
    return (
      <ChainOfThoughtStep
        icon={SearchIcon}
        label={`Searching for "${input.query}"`}
        status={isActive ? "active" : "complete"}
      />
    );
  }

  // Results state
  if (state === "output-available") {
    const { output } = part;

    // Error state
    if ("error" in output) {
      return (
        <ChainOfThoughtStep
          icon={SearchIcon}
          label={`Search failed`}
          status="complete"
        >
          <div className="text-red-500 text-sm">{output.error}</div>
        </ChainOfThoughtStep>
      );
    }

    const { results, totalResults } = output;

    // No results
    if (totalResults === 0) {
      return (
        <ChainOfThoughtStep
          icon={SearchIcon}
          label={`No results found for "${input.query}"`}
          status="complete"
        />
      );
    }

    // Success with results
    return (
      <ChainOfThoughtStep
        icon={SearchIcon}
        label={`Found ${totalResults} result${totalResults !== 1 ? "s" : ""}`}
        status="complete"
      >
        <ChainOfThoughtSearchResults className="flex-wrap gap-2 overflow-x-auto">
          {results.map((result, idx) => (
            <ChainOfThoughtSearchResult
              className="inline-flex h-8 max-w-[300px] items-center gap-1.5 whitespace-nowrap px-3 py-1 text-xs"
              key={idx}
            >
              <FileTextIcon className="size-3.5 shrink-0" />
              <span className="min-w-0 truncate">{result.documentName}</span>
              {result.pageNumber && (
                <span className="shrink-0 text-muted-foreground text-[10px]">
                  (p.{result.pageNumber})
                </span>
              )}
            </ChainOfThoughtSearchResult>
          ))}
        </ChainOfThoughtSearchResults>
      </ChainOfThoughtStep>
    );
  }

  return null;
});

// Component to render a reasoning part as a CoT step
const ReasoningStepItem = memo(function ReasoningStepItem({
  text,
  status,
}: {
  text: string;
  status: "complete" | "active" | "pending";
}) {
  const { label, remainingContent } = extractLabel(text);
  const icon = getIconForStep(text);

  return (
    <ChainOfThoughtStep icon={icon} label={label} status={status}>
      <Response className="grid gap-2">{remainingContent}</Response>
    </ChainOfThoughtStep>
  );
});

function PureMessageChainOfThought({
  messageId,
  startIdx,
  endIdx,
  isLoading,
}: MessageChainOfThoughtProps) {
  const parts = useMessagePartsByPartRange(messageId, startIdx, endIdx);

  const steps = useMemo(() => {
    return parts.map((part, index) => {
      const isLastPart = index === parts.length - 1;
      const isActive = isLoading && isLastPart;

      return {
        part,
        isActive,
        status: isActive ? ("active" as const) : ("complete" as const),
      };
    });
  }, [parts, isLoading]);

  if (steps.length === 0) {
    return null;
  }

  return (
    <ChainOfThought
      className="mb-12"
      data-testid="message-chain-of-thought"
      defaultOpen={isLoading}
    >
      <ChainOfThoughtHeader />
      <ChainOfThoughtContent>
        {steps.map((step, index) => {
          const { part, status } = step;

          // Reasoning parts
          if (part.type === "reasoning") {
            const text = part.text;
            if (!text) return null;

            return (
              <ReasoningStepItem
                key={`reasoning-${index}`}
                status={status}
                text={text}
              />
            );
          }

          // Semantic search tool
          if (part.type === "tool-semanticSearch") {
            return (
              <SemanticSearchStep
                isActive={step.isActive}
                key={`semantic-search-${index}`}
                part={part}
              />
            );
          }

          // Future: Add other tool types here
          return null;
        })}
      </ChainOfThoughtContent>
    </ChainOfThought>
  );
}

export const MessageChainOfThought = memo(PureMessageChainOfThought);
