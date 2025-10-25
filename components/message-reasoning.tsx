"use client";
import {
  BrainIcon,
  CheckIcon,
  Lightbulb,
  type LucideIcon,
  SearchIcon,
} from "lucide-react";
import { memo, useMemo } from "react";
import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtHeader,
  ChainOfThoughtStep,
} from "@/components/ai-elements/chain-of-thought";
import { Response } from "@/components/ai-elements/response";

type MessageReasoningProps = {
  isLoading: boolean;
  reasoning: string[];
};

type ReasoningStep = {
  icon: LucideIcon;
  label: string;
  content: string;
  description?: string;
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

// Helper function to parse reasoning text into structured steps
function parseReasoningIntoSteps(reasoning: string[]): ReasoningStep[] {
  return reasoning.map((text, index) => {
    const trimmedText = text.trim();

    // Extract a meaningful label and remaining content
    const { label, remainingContent } = extractLabel(trimmedText);

    // Determine appropriate icon
    const icon = getIconForStep(trimmedText);

    return {
      icon,
      label,
      content: remainingContent,
    };
  });
}

// Helper function to determine step status
function getStepStatus(
  index: number,
  isLoading: boolean,
  totalSteps: number
): "complete" | "active" | "pending" {
  if (isLoading && index === totalSteps - 1) {
    return "active";
  }
  return "complete";
}

function PureMessageReasoning({ isLoading, reasoning }: MessageReasoningProps) {
  const steps = useMemo(() => parseReasoningIntoSteps(reasoning), [reasoning]);

  if (steps.length === 0) {
    return null;
  }

  return (
    <ChainOfThought
      className="mb-12"
      data-testid="message-reasoning"
      defaultOpen={isLoading}
    >
      <ChainOfThoughtHeader data-testid="message-reasoning-toggle" />
      <ChainOfThoughtContent>
        {steps.map((step, index) => (
          <ChainOfThoughtStep
            icon={step.icon}
            key={index}
            label={step.label}
            status={getStepStatus(index, isLoading, steps.length)}
          >
            <Response className="grid gap-2">{step.content}</Response>
          </ChainOfThoughtStep>
        ))}
      </ChainOfThoughtContent>
    </ChainOfThought>
  );
}

export const MessageReasoning = memo(PureMessageReasoning);
