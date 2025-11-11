"use client";
import {
  BrainIcon,
  CalendarIcon,
  CheckIcon,
  ClipboardListIcon,
  FileTextIcon,
  HeartIcon,
  Lightbulb,
  type LucideIcon,
  SearchIcon,
  UsersIcon,
} from "lucide-react";
import { memo, useEffect, useMemo, useRef, useState } from "react";
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
import { formatDuration } from "@/lib/utils/format-duration";

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

// Helper to escape regex special characters
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
      .replace(new RegExp(`^${escapeRegExp(label)}[.!?]?\\s*`, "i"), "")
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
  part: Extract<ChatMessage["parts"][number], { type: "tool-semanticSearch" }>;
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
          label={"Search failed"}
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
            <a
              className="no-underline"
              href={result.blobUrl}
              key={idx}
              rel="noopener noreferrer"
              target="_blank"
            >
              <ChainOfThoughtSearchResult className="inline-flex h-8 max-w-[300px] cursor-pointer items-center gap-1.5 whitespace-nowrap px-3 py-1 text-xs transition-colors hover:bg-secondary/80">
                <FileTextIcon className="size-3.5 shrink-0" />
                <span className="min-w-0 truncate">{result.documentName}</span>
                {result.pageNumber && (
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    (p.{result.pageNumber})
                  </span>
                )}
              </ChainOfThoughtSearchResult>
            </a>
          ))}
        </ChainOfThoughtSearchResults>
      </ChainOfThoughtStep>
    );
  }

  return null;
});

// Component to render leave balance as a CoT step
const LeaveBalanceStep = memo(function LeaveBalanceStep({
  part,
  isActive,
}: {
  part: Extract<ChatMessage["parts"][number], { type: "tool-leaveBalance" }>;
  isActive: boolean;
}) {
  const { state, input } = part;

  // Loading state
  if (state === "input-available") {
    return (
      <ChainOfThoughtStep
        icon={CalendarIcon}
        label="Checking leave balances..."
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
          icon={CalendarIcon}
          label="Failed to retrieve leave balances"
          status="complete"
        >
          <div className="text-red-500 text-sm">{output.error}</div>
        </ChainOfThoughtStep>
      );
    }

    const { balances } = output;

    // Success - show compact summary
    return (
      <ChainOfThoughtStep
        icon={CalendarIcon}
        label={`Retrieved ${balances.length} leave balance${balances.length !== 1 ? "s" : ""}`}
        status="complete"
      >
        <ChainOfThoughtSearchResults className="flex-wrap gap-2">
          {balances.map((balance, idx) => (
            <ChainOfThoughtSearchResult
              key={idx}
              className="inline-flex h-8 items-center gap-1.5 px-3 py-1 text-xs"
            >
              <span className="capitalize">{balance.leaveType}:</span>
              <span className="font-medium">{balance.currentBalance} days</span>
            </ChainOfThoughtSearchResult>
          ))}
        </ChainOfThoughtSearchResults>
      </ChainOfThoughtStep>
    );
  }

  return null;
});

// Component to render benefits info as a CoT step
const BenefitsInfoStep = memo(function BenefitsInfoStep({
  part,
  isActive,
}: {
  part: Extract<ChatMessage["parts"][number], { type: "tool-benefitsInfo" }>;
  isActive: boolean;
}) {
  const { state, input } = part;

  // Loading state
  if (state === "input-available") {
    return (
      <ChainOfThoughtStep
        icon={HeartIcon}
        label="Retrieving benefits information..."
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
          icon={HeartIcon}
          label="Failed to retrieve benefits"
          status="complete"
        >
          <div className="text-red-500 text-sm">{output.error}</div>
        </ChainOfThoughtStep>
      );
    }

    const { currentEnrollments } = output;

    // Success - show compact summary
    return (
      <ChainOfThoughtStep
        icon={HeartIcon}
        label={`Retrieved ${currentEnrollments.length} enrollment${currentEnrollments.length !== 1 ? "s" : ""}`}
        status="complete"
      >
        <ChainOfThoughtSearchResults className="flex-wrap gap-2">
          {currentEnrollments.slice(0, 5).map((enrollment, idx) => (
            <ChainOfThoughtSearchResult
              key={idx}
              className="inline-flex h-8 items-center gap-1.5 px-3 py-1 text-xs"
            >
              <span className="font-medium">{enrollment.planName}</span>
              <span className="text-muted-foreground">•</span>
              <span className="capitalize">{enrollment.planType}</span>
            </ChainOfThoughtSearchResult>
          ))}
        </ChainOfThoughtSearchResults>
      </ChainOfThoughtStep>
    );
  }

  return null;
});

// Component to render HR case as a CoT step
const HRCaseStep = memo(function HRCaseStep({
  part,
  isActive,
}: {
  part: Extract<ChatMessage["parts"][number], { type: "tool-hrCase" }>;
  isActive: boolean;
}) {
  const { state, input } = part;

  // Loading state
  if (state === "input-available") {
    return (
      <ChainOfThoughtStep
        icon={ClipboardListIcon}
        label="Submitting HR case..."
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
          icon={ClipboardListIcon}
          label="Failed to submit case"
          status="complete"
        >
          <div className="text-red-500 text-sm">{output.error}</div>
        </ChainOfThoughtStep>
      );
    }

    // Success - narrow the type to variants with 'case' property
    if ("case" in output) {
      return (
        <ChainOfThoughtStep
          icon={ClipboardListIcon}
          label={`Case ${output.case.caseId} submitted successfully`}
          status="complete"
        >
          <ChainOfThoughtSearchResults className="flex-wrap gap-2">
            <ChainOfThoughtSearchResult className="inline-flex h-8 items-center gap-1.5 px-3 py-1 text-xs">
              <span>Case #{output.case.caseId}</span>
              <span className="text-muted-foreground">•</span>
              <span className="capitalize">{output.case.status}</span>
              <span className="text-muted-foreground">•</span>
              <span className="capitalize">{output.case.priority} priority</span>
            </ChainOfThoughtSearchResult>
          </ChainOfThoughtSearchResults>
        </ChainOfThoughtStep>
      );
    }

    // List action
    return (
      <ChainOfThoughtStep
        icon={ClipboardListIcon}
        label="Cases retrieved"
        status="complete"
      />
    );
  }

  return null;
});

// Component to render team availability as a CoT step
const TeamAvailabilityStep = memo(function TeamAvailabilityStep({
  part,
  isActive,
}: {
  part: Extract<
    ChatMessage["parts"][number],
    { type: "tool-teamAvailability" }
  >;
  isActive: boolean;
}) {
  const { state, input } = part;

  // Loading state
  if (state === "input-available") {
    return (
      <ChainOfThoughtStep
        icon={UsersIcon}
        label="Checking team availability..."
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
          icon={UsersIcon}
          label="Failed to retrieve team availability"
          status="complete"
        >
          <div className="text-red-500 text-sm">{output.error}</div>
        </ChainOfThoughtStep>
      );
    }

    // Narrow to view_schedule action which has absences
    if ("absences" in output) {
      const { absences } = output;

      // Success - show compact summary
      return (
        <ChainOfThoughtStep
          icon={UsersIcon}
          label={`Retrieved ${absences.length} team ${absences.length === 1 ? "absence" : "absences"}`}
          status="complete"
        >
          <ChainOfThoughtSearchResults className="flex-wrap gap-2">
            {absences.slice(0, 5).map((absence, idx) => (
              <ChainOfThoughtSearchResult
                key={idx}
                className="inline-flex h-8 items-center gap-1.5 px-3 py-1 text-xs"
              >
                <span className="font-medium">{absence.employeeName}</span>
                <span className="text-muted-foreground">•</span>
                <span className="capitalize">{absence.leaveType}</span>
                <span className="text-muted-foreground">•</span>
                <span>{absence.totalDays}d</span>
              </ChainOfThoughtSearchResult>
            ))}
          </ChainOfThoughtSearchResults>
        </ChainOfThoughtStep>
      );
    }

    // For other actions (view_approvals, approve_request, deny_request)
    if ("pendingRequests" in output) {
      return (
        <ChainOfThoughtStep
          icon={UsersIcon}
          label={`${output.totalPending} pending ${output.totalPending === 1 ? "request" : "requests"}`}
          status="complete"
        />
      );
    }

    if ("request" in output) {
      return (
        <ChainOfThoughtStep
          icon={UsersIcon}
          label={output.message}
          status="complete"
        />
      );
    }

    return null;
  }

  return null;
});

// Component to render people search as a CoT step
const PeopleSearchStep = memo(function PeopleSearchStep({
  part,
  isActive,
}: {
  part: Extract<ChatMessage["parts"][number], { type: "tool-peopleSearch" }>;
  isActive: boolean;
}) {
  const { state, input } = part;

  // Loading state
  if (state === "input-available") {
    return (
      <ChainOfThoughtStep
        icon={UsersIcon}
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
          icon={UsersIcon}
          label="Search failed"
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
          icon={UsersIcon}
          label={`No people found for "${input.query}"`}
          status="complete"
        />
      );
    }

    // Success - show compact summary
    return (
      <ChainOfThoughtStep
        icon={UsersIcon}
        label={`Found ${totalResults} ${totalResults === 1 ? "person" : "people"}`}
        status="complete"
      >
        <ChainOfThoughtSearchResults className="flex-wrap gap-2">
          {results.slice(0, 5).map((person, idx) => (
            <ChainOfThoughtSearchResult
              key={idx}
              className="inline-flex h-8 items-center gap-1.5 px-3 py-1 text-xs"
            >
              <span className="font-medium">{person.fullName}</span>
              <span className="text-muted-foreground">•</span>
              <span>{person.jobTitle}</span>
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
      <Response className="grid gap-1">{remainingContent}</Response>
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

  // Track when thinking started
  const thinkingStartTime = useRef<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState<number | null>(null);

  // Initialize start time when component mounts or when loading begins
  useEffect(() => {
    if (isLoading && thinkingStartTime.current === null) {
      thinkingStartTime.current = Date.now();
    }
  }, [isLoading]);

  // Calculate elapsed time when thinking completes
  useEffect(() => {
    if (!isLoading && thinkingStartTime.current !== null) {
      const elapsed = Date.now() - thinkingStartTime.current;
      // Only update state if elapsed time actually changed
      setElapsedTime((prev) => {
        if (prev === elapsed) {
          return prev;
        }
        return elapsed;
      });
    }
  }, [isLoading]);

  // Memoize header text to avoid recalculating on every render
  const headerText = useMemo(() => {
    if (isLoading) {
      return "Thinking";
    }
    if (elapsedTime !== null) {
      return `Thought for ${formatDuration(elapsedTime)}`;
    }
    return "Chain of Thought";
  }, [isLoading, elapsedTime]);

  const steps = useMemo(
    () =>
      parts.map((part, index) => {
        const isLastPart = index === parts.length - 1;
        const isActive = isLoading && isLastPart;

        return {
          part,
          isActive,
          status: isActive ? ("active" as const) : ("complete" as const),
        };
      }),
    [parts, isLoading]
  );

  if (steps.length === 0) {
    return null;
  }

  return (
    <ChainOfThought
      className="mb-4"
      data-testid="message-chain-of-thought"
      defaultOpen={isLoading}
    >
      <ChainOfThoughtHeader>{headerText}</ChainOfThoughtHeader>
      <ChainOfThoughtContent>
        {steps.map((step, index) => {
          const { part, status } = step;

          // Reasoning parts
          if (part.type === "reasoning") {
            const text = part.text;
            if (!text) {
              return null;
            }

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

          // Leave Balance tool
          if (part.type === "tool-leaveBalance") {
            return (
              <LeaveBalanceStep
                isActive={step.isActive}
                key={`leave-balance-${index}`}
                part={part}
              />
            );
          }

          // Benefits Info tool
          if (part.type === "tool-benefitsInfo") {
            return (
              <BenefitsInfoStep
                isActive={step.isActive}
                key={`benefits-info-${index}`}
                part={part}
              />
            );
          }

          // HR Case tool
          if (part.type === "tool-hrCase") {
            return (
              <HRCaseStep
                isActive={step.isActive}
                key={`hr-case-${index}`}
                part={part}
              />
            );
          }

          // Team Availability tool
          if (part.type === "tool-teamAvailability") {
            return (
              <TeamAvailabilityStep
                isActive={step.isActive}
                key={`team-availability-${index}`}
                part={part}
              />
            );
          }

          // People Search tool
          if (part.type === "tool-peopleSearch") {
            return (
              <PeopleSearchStep
                isActive={step.isActive}
                key={`people-search-${index}`}
                part={part}
              />
            );
          }

          return null;
        })}
      </ChainOfThoughtContent>
    </ChainOfThought>
  );
}

export const MessageChainOfThought = memo(PureMessageChainOfThought);
