"use client";
import { useEffect, useRef } from "react";
import { useSaveDocument } from "@/hooks/chat-sync-hooks";
import { useArtifact } from "@/hooks/use-artifact";
import type { Suggestion } from "@/lib/db/schema";
import { useChatInput } from "@/providers/chat-input-provider";
import { useSession } from "@/providers/session-provider";
import { artifactDefinitions } from "./artifact";
import { useDataStream } from "./data-stream-provider";

export type DataStreamDelta = {
  type:
    | "text-delta"
    | "code-delta"
    | "sheet-delta"
    | "image-delta"
    | "title"
    | "id"
    | "message-id"
    | "suggestion"
    | "clear"
    | "finish"
    | "kind";
  content: string | Suggestion;
};

export function DataStreamHandler({ id: _id }: { id: string }) {
  const { dataStream } = useDataStream();
  const { artifact, setArtifact, setMetadata } = useArtifact();
  const lastProcessedIndex = useRef(-1);
  const { data: session } = useSession();
  const { setSelectedTool } = useChatInput();
  const saveDocumentMutation = useSaveDocument(
    artifact.documentId,
    artifact.messageId
  );
  const isAuthenticated = !!session;

  useEffect(() => {
    if (!dataStream?.length) {
      return;
    }

    const newDeltas = dataStream.slice(lastProcessedIndex.current + 1);
    lastProcessedIndex.current = dataStream.length - 1;

    newDeltas.forEach((delta) => {
      // Clear deepResearch tool when a research process completes
      if (delta.type === "data-researchUpdate") {
        const update: any = (delta as any).data;
        if (update?.type === "completed") {
          setSelectedTool((current) =>
            current === "deepResearch" ? null : current
          );
        }
      }

      const artifactDefinition = artifactDefinitions.find(
        (artifactDefinition) => artifactDefinition.kind === artifact.kind
      );

      if (artifactDefinition?.onStreamPart) {
        artifactDefinition.onStreamPart({
          streamPart: delta,
          setArtifact,
          setMetadata,
        });
      }

      setArtifact((draftArtifact) => {
        switch (delta.type) {
          case "data-id":
            return {
              ...draftArtifact,
              documentId: delta.data,
              status: "streaming",
            };

          case "data-messageId":
            return {
              ...draftArtifact,
              messageId: delta.data,
              status: "streaming",
            };

          case "data-title":
            return {
              ...draftArtifact,
              title: delta.data,
              status: "streaming",
            };

          case "data-kind":
            return {
              ...draftArtifact,
              kind: delta.data,
              status: "streaming",
            };

          case "data-clear":
            return {
              ...draftArtifact,
              content: "",
              status: "streaming",
            };

          case "data-finish":
            return {
              ...draftArtifact,
              status: "idle",
            };

          default:
            return draftArtifact;
        }
      });

      // Artifacts need to be saved locally for anonymous users
      if (delta.type === "data-finish" && !isAuthenticated) {
        saveDocumentMutation.mutate({
          id: artifact.documentId,
          title: artifact.title,
          content: artifact.content,
          kind: artifact.kind,
        });
      }
    });
  }, [
    dataStream,
    setArtifact,
    setMetadata,
    artifact,
    saveDocumentMutation,
    isAuthenticated,
    setSelectedTool,
  ]);

  return null;
}
