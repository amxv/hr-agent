import { toast } from "sonner";
import { Artifact } from "@/components/create-artifact";
import { DiffView } from "@/components/diffview";
import { DocumentSkeleton } from "@/components/document-skeleton";
import {
  ClockRewind,
  CopyIcon,
  MessageIcon,
  PenIcon,
  RedoIcon,
  UndoIcon,
} from "@/components/icons";
import { Editor } from "@/components/text-editor";
import {
  DEFAULT_POLISH_TEXT_MODEL,
  DEFAULT_SUGGESTIONS_MODEL,
} from "@/lib/ai/app-models";
import type { Suggestion } from "@/lib/db/schema";

type TextArtifactMetadata = {
  suggestions: Suggestion[];
};

export const textArtifact = new Artifact<"text", TextArtifactMetadata>({
  kind: "text",
  description: "Useful for text content, like drafting essays and emails.",
  initialize: async ({
    documentId,
    setMetadata,
    trpc,
    queryClient,
    isAuthenticated,
  }) => {
    if (!isAuthenticated) {
      setMetadata({
        suggestions: [],
      });
      return;
    }

    const suggestions = await queryClient.fetchQuery(
      trpc.document.getSuggestions.queryOptions({ documentId })
    );

    setMetadata({
      suggestions,
    });
  },
  onStreamPart: ({ streamPart, setMetadata, setArtifact }) => {
    if (streamPart.type === "data-suggestion") {
      setMetadata((metadata) => ({
        suggestions: [...metadata.suggestions, streamPart.data],
      }));
    }

    if (streamPart.type === "data-textDelta") {
      setArtifact((draftArtifact) => ({
        ...draftArtifact,
        content: draftArtifact.content + streamPart.data,
        isVisible:
          draftArtifact.status === "streaming" &&
          draftArtifact.content.length > 400 &&
          draftArtifact.content.length < 450
            ? true
            : draftArtifact.isVisible,
        status: "streaming",
      }));
    }
  },
  content: ({
    mode,
    status,
    content,
    isCurrentVersion,
    currentVersionIndex,
    onSaveContent,
    getDocumentContentById,
    isLoading,
    metadata,
    isReadonly,
  }) => {
    if (isLoading) {
      return <DocumentSkeleton artifactKind="text" />;
    }

    if (mode === "diff") {
      const oldContent = getDocumentContentById(currentVersionIndex - 1);
      const newContent = getDocumentContentById(currentVersionIndex);

      return (
        <div className="m-auto flex max-w-3xl flex-row px-4 py-8 md:p-20">
          <DiffView newContent={newContent} oldContent={oldContent} />
        </div>
      );
    }

    return (
      <div className="m-auto flex max-w-3xl flex-row px-4 py-8 md:p-20">
        <Editor
          content={content}
          currentVersionIndex={currentVersionIndex}
          isCurrentVersion={isCurrentVersion}
          isReadonly={isReadonly}
          onSaveContent={onSaveContent}
          status={status}
          suggestions={metadata ? metadata.suggestions : []}
        />

        {metadata?.suggestions && metadata.suggestions.length > 0 ? (
          <div className="h-dvh w-12 shrink-0 md:hidden" />
        ) : null}
      </div>
    );
  },
  actions: [
    {
      icon: <ClockRewind size={18} />,
      description: "View changes",
      onClick: ({ handleVersionChange }) => {
        handleVersionChange("toggle");
      },
      isDisabled: ({ currentVersionIndex, setMetadata: _setMetadata }) => {
        if (currentVersionIndex === 0) {
          return true;
        }

        return false;
      },
    },
    {
      icon: <UndoIcon size={18} />,
      description: "View Previous version",
      onClick: ({ handleVersionChange }) => {
        handleVersionChange("prev");
      },
      isDisabled: ({ currentVersionIndex }) => {
        if (currentVersionIndex === 0) {
          return true;
        }

        return false;
      },
    },
    {
      icon: <RedoIcon size={18} />,
      description: "View Next version",
      onClick: ({ handleVersionChange }) => {
        handleVersionChange("next");
      },
      isDisabled: ({ isCurrentVersion }) => {
        if (isCurrentVersion) {
          return true;
        }

        return false;
      },
    },
    {
      icon: <CopyIcon size={18} />,
      description: "Copy to clipboard",
      onClick: ({ content }) => {
        navigator.clipboard.writeText(content);
        toast.success("Copied to clipboard!");
      },
    },
  ],
  toolbar: [
    {
      icon: <PenIcon />,
      description: "Add final polish",
      onClick: ({ sendMessage, storeApi }) => {
        sendMessage({
          role: "user",
          parts: [
            {
              type: "text",
              text: "Please add final polish and check for grammar, add section titles for better structure, and ensure everything reads smoothly.",
            },
          ],
          metadata: {
            selectedModel: DEFAULT_POLISH_TEXT_MODEL,
            createdAt: new Date(),
            parentMessageId: storeApi.getState().getLastMessageId(),
          },
        });
      },
    },
    {
      icon: <MessageIcon />,
      description: "Request suggestions",
      onClick: ({ sendMessage, storeApi }) => {
        sendMessage({
          role: "user",
          parts: [
            {
              type: "text",
              text: "Please add suggestions you have that could improve the writing.",
            },
          ],
          metadata: {
            selectedModel: DEFAULT_SUGGESTIONS_MODEL,
            createdAt: new Date(),
            parentMessageId: storeApi.getState().getLastMessageId(),
          },
        });
      },
    },
  ],
});
