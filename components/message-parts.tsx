"use client";

import { memo, useMemo } from "react";
import type { ChatMessage } from "@/lib/ai/types";
import { useChatStoreApi } from "@/lib/stores/chat-store-context";
import {
  useMessagePartByPartIdx,
  useMessagePartsByPartRange,
  useMessagePartTypesById,
} from "@/lib/stores/hooks";
import { CodeInterpreterMessage } from "./code-interpreter-message";
import { DocumentToolCall, DocumentToolResult } from "./document";
import { DocumentPreview } from "./document-preview";
import { FileRetrieveResult } from "./file-retrieve-result";
import { GeneratedImage } from "./generated-image";
import { ResearchUpdates } from "./message-annotations";
import { MessageChainOfThought } from "./message-chain-of-thought";
import { MessageReasoning } from "./message-reasoning";
import { ReadDocument } from "./read-document";
import { Retrieve } from "./retrieve";
import { SemanticSearchResult } from "./semantic-search-result";
import { StockChartMessage } from "./stock-chart-message";
import { TextMessagePart } from "./text-message-part";
import { Weather } from "./weather";

type MessagePartsProps = {
  messageId: string;
  isLoading: boolean;
  isReadonly: boolean;
};

const isLastArtifact = (
  messages: ChatMessage[],
  currentToolCallId: string
): boolean => {
  let lastArtifact: { messageIndex: number; toolCallId: string } | null = null;

  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message.role === "assistant") {
      for (const part of message.parts) {
        if (
          (part.type === "tool-createDocument" ||
            part.type === "tool-updateDocument" ||
            part.type === "tool-deepResearch") &&
          part.state === "output-available"
        ) {
          lastArtifact = {
            messageIndex: i,
            toolCallId: part.toolCallId,
          };
          break;
        }
      }
      if (lastArtifact) {
        break;
      }
    }
  }

  return lastArtifact?.toolCallId === currentToolCallId;
};

function useResearchUpdates(
  messageId: string,
  partIdx: number,
  type: ChatMessage["parts"][number]["type"]
) {
  const types = useMessagePartTypesById(messageId);
  const startIdx = partIdx;
  const nextIdx = types.findIndex(
    (t, i) =>
      i > startIdx && (t === "tool-deepResearch" || t === "tool-webSearch")
  );

  // If not a research tool, constrain the range to empty to minimize work
  let sliceEnd = nextIdx === -1 ? types.length - 1 : nextIdx - 1;
  if (type !== "tool-deepResearch" && type !== "tool-webSearch") {
    sliceEnd = startIdx;
  }

  const range = useMessagePartsByPartRange(messageId, startIdx + 1, sliceEnd);

  if (type !== "tool-deepResearch" && type !== "tool-webSearch") {
    return [] as Extract<
      ChatMessage["parts"][number],
      { type: "data-researchUpdate" }
    >["data"][];
  }

  return range
    .filter((p) => p.type === "data-researchUpdate")
    .map(
      (u) =>
        (
          u as Extract<
            ChatMessage["parts"][number],
            { type: "data-researchUpdate" }
          >
        ).data
    );
}

const _collectResearchUpdates = (
  parts: ChatMessage["parts"],
  toolCallId: string,
  toolType: "tool-deepResearch" | "tool-webSearch"
) => {
  const startIdx = parts.findIndex(
    (p) => p.type === toolType && p.toolCallId === toolCallId
  );
  if (startIdx === -1) {
    return [];
  }

  const endIdx = parts.findIndex(
    (p, i) =>
      i > startIdx &&
      (p.type === "tool-deepResearch" || p.type === "tool-webSearch")
  );

  const sliceEnd = endIdx === -1 ? parts.length : endIdx;
  return parts
    .slice(startIdx + 1, sliceEnd)
    .filter((p) => p.type === "data-researchUpdate")
    .map((u) => u.data);
};

// Render a single part by index with minimal subscriptions
function PureMessagePart({
  messageId,
  partIdx,
  isReadonly,
}: {
  messageId: string;
  partIdx: number;
  isReadonly: boolean;
}) {
  const part = useMessagePartByPartIdx(messageId, partIdx);
  const { type } = part;
  const researchUpdates = useResearchUpdates(messageId, partIdx, type);
  const chatStore = useChatStoreApi();

  if (type === "tool-getWeather") {
    const { toolCallId, state } = part;
    if (state === "input-available") {
      return (
        <div className="skeleton" key={toolCallId}>
          <Weather />
        </div>
      );
    }
    if (state === "output-available") {
      const { output } = part;
      return (
        <div key={toolCallId}>
          <Weather weatherAtLocation={output} />
        </div>
      );
    }
  }

  if (type === "tool-createDocument") {
    const { toolCallId, state } = part;
    if (state === "input-available") {
      const { input } = part;
      return (
        <div key={toolCallId}>
          <DocumentPreview
            args={input}
            isReadonly={isReadonly}
            messageId={messageId}
          />
        </div>
      );
    }

    if (state === "output-available") {
      const { output, input } = part;
      const shouldShowFullPreview = isLastArtifact(
        chatStore.getState().messages,
        toolCallId
      );

      if ("error" in output) {
        return (
          <div className="rounded border p-2 text-red-500" key={toolCallId}>
            Error: {String(output.error)}
          </div>
        );
      }

      return (
        <div key={toolCallId}>
          {shouldShowFullPreview ? (
            <DocumentPreview
              args={input}
              isReadonly={isReadonly}
              messageId={messageId}
              result={output}
              type="create"
            />
          ) : (
            <DocumentToolResult
              isReadonly={isReadonly}
              messageId={messageId}
              result={output}
              type="create"
            />
          )}
        </div>
      );
    }
  }

  if (type === "tool-updateDocument") {
    const { toolCallId, state } = part;
    if (state === "input-available") {
      const { input } = part;
      return (
        <div key={toolCallId}>
          <DocumentToolCall
            // @ts-expect-error - TODO: fix this
            args={input}
            isReadonly={isReadonly}
            type="update"
          />
        </div>
      );
    }

    if (state === "output-available") {
      const { output, input } = part;
      const shouldShowFullPreview = isLastArtifact(
        chatStore.getState().messages,
        toolCallId
      );

      if ("error" in output) {
        return (
          <div className="rounded border p-2 text-red-500" key={toolCallId}>
            Error: {String(output.error)}
          </div>
        );
      }

      return (
        <div key={toolCallId}>
          {shouldShowFullPreview ? (
            <DocumentPreview
              args={input}
              isReadonly={isReadonly}
              messageId={messageId}
              result={output}
              type="update"
            />
          ) : (
            <DocumentToolResult
              isReadonly={isReadonly}
              messageId={messageId}
              result={output}
              type="update"
            />
          )}
        </div>
      );
    }
  }

  if (type === "tool-requestSuggestions") {
    const { toolCallId, state } = part;
    if (state === "input-available") {
      const { input } = part;
      return (
        <div key={toolCallId}>
          <DocumentToolCall
            // @ts-expect-error - TODO: fix this
            args={input}
            isReadonly={isReadonly}
            type="request-suggestions"
          />
        </div>
      );
    }

    if (state === "output-available") {
      const { output } = part;
      if ("error" in output) {
        return (
          <div className="rounded border p-2 text-red-500" key={toolCallId}>
            Error: {String(output.error)}
          </div>
        );
      }

      return (
        <div key={toolCallId}>
          <DocumentToolResult
            isReadonly={isReadonly}
            messageId={messageId}
            result={output}
            type="request-suggestions"
          />
        </div>
      );
    }
  }

  if (type === "tool-retrieve") {
    const { toolCallId, state } = part;
    if (state === "input-available") {
      return (
        <div key={toolCallId}>
          <Retrieve />
        </div>
      );
    }

    if (state === "output-available") {
      const { output } = part;
      return (
        <div key={toolCallId}>
          {/* @ts-expect-error - TODO: fix this */}
          <Retrieve result={output} />
        </div>
      );
    }
  }

  if (type === "tool-readDocument") {
    const { toolCallId, state } = part;
    if (state === "input-available") {
      return null;
    }
    if (state === "output-available") {
      const { output } = part;
      return (
        <div key={toolCallId}>
          {/* @ts-expect-error - TODO: fix this */}
          <ReadDocument result={output} />
        </div>
      );
    }
  }

  if (type === "tool-stockChart") {
    const { toolCallId, state } = part;
    if (state === "input-available") {
      const { input } = part;
      return (
        <div key={toolCallId}>
          {/* @ts-expect-error - TODO: fix this */}
          <StockChartMessage args={input} result={null} />
        </div>
      );
    }
    if (state === "output-available") {
      const { output, input } = part;
      return (
        <div key={toolCallId}>
          {/* @ts-expect-error - TODO: fix this */}
          <StockChartMessage args={input} result={output} />
        </div>
      );
    }
  }

  if (type === "tool-codeInterpreter") {
    const { toolCallId, state } = part;
    if (state === "input-available") {
      const { input } = part;
      return (
        <div key={toolCallId}>
          <CodeInterpreterMessage args={input} result={null} />
        </div>
      );
    }
    if (state === "output-available") {
      const { output, input } = part;
      return (
        <div key={toolCallId}>
          {/* @ts-expect-error - TODO: fix this */}
          <CodeInterpreterMessage args={input} result={output} />
        </div>
      );
    }
  }

  if (type === "tool-generateImage") {
    const { toolCallId, state } = part;
    if (state === "input-available") {
      const { input } = part;
      return (
        <div key={toolCallId}>
          <GeneratedImage args={input} isLoading={true} />
        </div>
      );
    }
    if (state === "output-available") {
      const { output, input } = part;
      return (
        <div key={toolCallId}>
          <GeneratedImage args={input} result={output} />
        </div>
      );
    }
  }

  if (type === "tool-deepResearch") {
    const { toolCallId, state } = part;

    if (state === "input-available") {
      return (
        <div className="flex w-full flex-col gap-3" key={toolCallId}>
          <ResearchUpdates updates={researchUpdates} />
        </div>
      );
    }
    if (state === "output-available") {
      const { output, input } = part;
      const shouldShowFullPreview = isLastArtifact(
        chatStore.getState().messages,
        toolCallId
      );

      if (output.format === "report") {
        return (
          <div key={toolCallId}>
            <div className="mb-2">
              <ResearchUpdates updates={researchUpdates} />
            </div>
            {shouldShowFullPreview ? (
              <DocumentPreview
                args={input}
                isReadonly={isReadonly}
                messageId={messageId}
                result={output}
                type="create"
              />
            ) : (
              <DocumentToolResult
                isReadonly={isReadonly}
                messageId={messageId}
                result={output}
                type="create"
              />
            )}
          </div>
        );
      }
    }
  }

  if (type === "tool-webSearch") {
    const { toolCallId, state } = part;

    if (state === "input-available") {
      return (
        <div className="flex flex-col gap-3" key={toolCallId}>
          <ResearchUpdates updates={researchUpdates} />
        </div>
      );
    }
    if (state === "output-available") {
      return (
        <div className="flex flex-col gap-3" key={toolCallId}>
          <ResearchUpdates updates={researchUpdates} />
        </div>
      );
    }
  }

  if (type === "tool-semanticSearch") {
    const { toolCallId, state } = part;
    if (state === "input-available") {
      const { input } = part;
      return (
        <div key={toolCallId}>
          <SemanticSearchResult input={input} state={state} />
        </div>
      );
    }
    if (state === "output-available") {
      const { input, output } = part;
      return (
        <div key={toolCallId}>
          <SemanticSearchResult input={input} output={output} state={state} />
        </div>
      );
    }
  }

  if (type === "tool-fileRetrieve") {
    const { toolCallId, state } = part;
    if (state === "input-available") {
      const { input } = part;
      return (
        <div key={toolCallId}>
          <FileRetrieveResult input={input} state={state} />
        </div>
      );
    }
    if (state === "output-available") {
      const { input, output } = part;
      return (
        <div key={toolCallId}>
          <FileRetrieveResult input={input} output={output} state={state} />
        </div>
      );
    }
  }

  return null;
}

const MessagePart = memo(PureMessagePart);

// Render contiguous reasoning parts; subscribes only to the specified range
export function PureMessageReasoningParts({
  messageId,
  startIdx,
  endIdx,
  isLoading,
}: {
  messageId: string;
  startIdx: number;
  endIdx: number;
  isLoading: boolean;
}) {
  const reasoningParts = useMessagePartsByPartRange(
    messageId,
    startIdx,
    endIdx,
    "reasoning"
  );

  // Debug logging to diagnose reasoning display issues
  console.log("[MessageReasoningParts] Debug info:", {
    messageId,
    startIdx,
    endIdx,
    isLoading,
    reasoningPartsCount: reasoningParts.length,
    reasoningParts,
    extractedText: reasoningParts.map((p) => ({
      hasText: "text" in p,
      textValue: p.text,
      textType: typeof p.text,
      textLength: p.text?.length,
      fullPart: p,
    })),
  });

  // Filter out any parts with undefined/empty text and map to text strings
  const reasoningTexts = reasoningParts
    .map((p) => p.text)
    .filter((text): text is string => Boolean(text));

  return <MessageReasoning isLoading={isLoading} reasoning={reasoningTexts} />;
}

export function PureMessageParts({
  messageId,
  isLoading,
  isReadonly,
}: MessagePartsProps) {
  const types = useMessagePartTypesById(messageId);
  const chatStore = useChatStoreApi();

  type NonReasoningPartType = Exclude<
    ChatMessage["parts"][number]["type"],
    "reasoning"
  >;

  const groups = useMemo(() => {
    // Tools that should be integrated into Chain of Thought
    const cotTools = new Set<ChatMessage["parts"][number]["type"]>([
      "tool-semanticSearch",
    ]);

    const result: Array<
      | { kind: "chain-of-thought"; startIndex: number; endIndex: number }
      | { kind: NonReasoningPartType; index: number }
    > = [];

    // Find the first and last CoT-compatible parts
    let cotStart = -1;
    let cotEnd = -1;

    for (let i = 0; i < types.length; i++) {
      if (types[i] === "reasoning" || cotTools.has(types[i])) {
        if (cotStart === -1) {
          cotStart = i;
        }
        cotEnd = i;
      }
    }

    // If we found any CoT parts, create one unified group for everything from first to last
    if (cotStart !== -1) {
      // Add any non-CoT parts before the CoT group
      for (let i = 0; i < cotStart; i++) {
        result.push({ kind: types[i] as NonReasoningPartType, index: i });
      }

      // Add the unified CoT group (includes everything from first to last CoT part)
      result.push({
        kind: "chain-of-thought",
        startIndex: cotStart,
        endIndex: cotEnd,
      });

      // Add any non-CoT parts after the CoT group
      for (let i = cotEnd + 1; i < types.length; i++) {
        result.push({ kind: types[i] as NonReasoningPartType, index: i });
      }
    } else {
      // No CoT parts, add all parts as individual items
      for (let i = 0; i < types.length; i++) {
        result.push({ kind: types[i] as NonReasoningPartType, index: i });
      }
    }

    return result;
  }, [types]);

  return (
    <>
      {groups.map((group, groupIdx) => {
        if (group.kind === "chain-of-thought") {
          const key = `message-${messageId}-cot-${groupIdx}`;
          const isLast = group.endIndex === types.length - 1;
          return (
            <MessageChainOfThought
              endIdx={group.endIndex}
              isLoading={isLoading && isLast}
              key={key}
              messageId={messageId}
              startIdx={group.startIndex}
            />
          );
        }

        if (group.kind === "text") {
          const key = `message-${messageId}-text-${group.index}`;
          return (
            <TextMessagePart
              key={key}
              messageId={messageId}
              partIdx={group.index}
            />
          );
        }

        const key = `message-${messageId}-part-${group.index}-${group.kind}`;
        return (
          <MessagePart
            isReadonly={isReadonly}
            key={key}
            messageId={messageId}
            partIdx={group.index}
          />
        );
      })}
    </>
  );
}

export const MessageParts = memo(PureMessageParts);
