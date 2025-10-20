import type { UseChatHelpers } from "@ai-sdk/react";
import { useQueryClient } from "@tanstack/react-query";
import { formatDistance } from "date-fns";
import equal from "fast-deep-equal";
import { AnimatePresence, motion } from "motion/react";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { useDebounceCallback, useWindowSize } from "usehooks-ts";
import { useDocuments, useSaveDocument } from "@/hooks/chat-sync-hooks";
import { useArtifact } from "@/hooks/use-artifact";
import { useIsMobile } from "@/hooks/use-mobile";
import type { ChatMessage } from "@/lib/ai/types";
//
import type { ArtifactKind } from "@/lib/artifacts/artifact-kind";
import { codeArtifact } from "@/lib/artifacts/code/client";
import { sheetArtifact } from "@/lib/artifacts/sheet/client";
import { textArtifact } from "@/lib/artifacts/text/client";
import type { Document, Vote } from "@/lib/db/schema";
import { useChatStoreApi } from "@/lib/stores/chat-store-context";
import { useTRPC } from "@/trpc/react";
import { ArtifactActions } from "./artifact-actions";
import { ArtifactCloseButton } from "./artifact-close-button";
import { MessagesPane } from "./messages-pane";
//
import { Toolbar } from "./toolbar";
import { ScrollArea } from "./ui/scroll-area";
import { useSidebar } from "./ui/sidebar";
import { VersionFooter } from "./version-footer";

export const artifactDefinitions = [textArtifact, codeArtifact, sheetArtifact];

export type UIArtifact = {
  title: string;
  documentId: string;
  kind: ArtifactKind;
  content: string;
  messageId: string;
  isVisible: boolean;
  status: "streaming" | "idle";
  boundingBox: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
};

function PureArtifact({
  chatId,
  status,
  stop,
  votes,
  isReadonly,
  isAuthenticated,
}: {
  chatId: string;
  votes: Vote[] | undefined;
  status: UseChatHelpers<ChatMessage>["status"];
  stop: UseChatHelpers<ChatMessage>["stop"];
  isReadonly: boolean;
  isAuthenticated: boolean;
}) {
  const storeApi = useChatStoreApi();
  const { artifact, setArtifact, metadata, setMetadata } = useArtifact();
  const queryClient = useQueryClient();
  const trpc = useTRPC();

  const { data: documents, isLoading: isDocumentsFetching } = useDocuments(
    artifact.documentId || "",
    artifact.documentId === "init" || artifact.status === "streaming"
  );

  const [mode, setMode] = useState<"edit" | "diff">("edit");
  const [document, setDocument] = useState<Document | null>(null);
  const [currentVersionIndex, setCurrentVersionIndex] = useState(-1);
  const lastSavedContentRef = useRef<string>("");

  const { open: isSidebarOpen } = useSidebar();

  useEffect(() => {
    if (documents && documents.length > 0) {
      // At first we set the most recent document realted to the messageId selected
      const mostRecentDocumentIndex = documents.findLastIndex(
        (document) => document.messageId === artifact.messageId
      );

      if (mostRecentDocumentIndex !== -1) {
        const mostRecentDocument = documents[mostRecentDocumentIndex];
        setDocument(mostRecentDocument);
        setCurrentVersionIndex(mostRecentDocumentIndex);
        setArtifact((currentArtifact) => ({
          ...currentArtifact,
          content: mostRecentDocument.content ?? "",
        }));
      } else {
        // Fallback to the most recent document
        const document = documents.at(-1);
        if (document) {
          setDocument(document);
          setCurrentVersionIndex(documents.length - 1);
          setArtifact((currentArtifact) => ({
            ...currentArtifact,
            content: document.content ?? "",
          }));
        }
      }
    }
  }, [documents, setArtifact, artifact.messageId]);

  const [isContentDirty, setIsContentDirty] = useState(false);

  const saveDocumentMutation = useSaveDocument(
    artifact.documentId,
    artifact.messageId,
    {
      onSettled: () => {
        setIsContentDirty(false);
      },
    }
  );

  const handleContentChange = useCallback(
    (updatedContent: string) => {
      if (!documents) {
        return;
      }

      const lastDocument = documents.at(-1);
      if (!lastDocument) {
        return;
      }

      if (
        lastDocument?.content !== updatedContent &&
        lastSavedContentRef.current === updatedContent
      ) {
        setIsContentDirty(true);
        saveDocumentMutation.mutate({
          id: lastDocument.id,
          title: lastDocument.title,
          content: updatedContent,
          kind: lastDocument.kind,
        });
      }
    },
    [saveDocumentMutation, documents]
  );

  const debouncedHandleContentChange = useDebounceCallback(
    handleContentChange,
    2000
  );

  const saveContent = useCallback(
    (updatedContent: string, debounce: boolean) => {
      if (isReadonly) {
        return;
      }
      // Update the last saved content reference
      lastSavedContentRef.current = updatedContent;

      if (document && updatedContent !== document.content) {
        setIsContentDirty(true);

        if (debounce) {
          debouncedHandleContentChange(updatedContent);
        } else {
          handleContentChange(updatedContent);
        }
      }
    },
    [document, debouncedHandleContentChange, handleContentChange, isReadonly]
  );

  function getDocumentContentById(index: number) {
    if (!documents) {
      return "";
    }
    if (!documents[index]) {
      return "";
    }
    return documents[index].content ?? "";
  }

  const handleVersionChange = (type: "next" | "prev" | "toggle" | "latest") => {
    if (!documents) {
      return;
    }

    if (type === "latest") {
      setCurrentVersionIndex(documents.length - 1);
      setMode("edit");
    }

    if (type === "toggle") {
      setMode((mode) => (mode === "edit" ? "diff" : "edit"));
    }

    if (type === "prev") {
      if (currentVersionIndex > 0) {
        setCurrentVersionIndex((index) => index - 1);
      }
    } else if (type === "next" && currentVersionIndex < documents.length - 1) {
      setCurrentVersionIndex((index) => index + 1);
    }
  };

  const [isToolbarVisible, setIsToolbarVisible] = useState(false);

  /*
   * NOTE: if there are no documents, or if
   * the documents are being fetched, then
   * we mark it as the current version.
   */

  const isCurrentVersion =
    documents && documents.length > 0
      ? currentVersionIndex === documents.length - 1
      : true;

  const { width: windowWidth, height: windowHeight } = useWindowSize();
  const isMobile = useIsMobile();

  const artifactDefinition = artifactDefinitions.find(
    (definition) => definition.kind === artifact.kind
  );

  if (!artifactDefinition) {
    throw new Error("Artifact definition not found!");
  }

  useEffect(() => {
    if (
      artifact.documentId !== "init" &&
      artifact.status !== "streaming" &&
      artifactDefinition.initialize
    ) {
      artifactDefinition.initialize({
        documentId: artifact.documentId,
        setMetadata,
        trpc,
        queryClient,
        isAuthenticated,
      });
    }
  }, [
    artifact.documentId,
    artifactDefinition,
    setMetadata,
    trpc,
    queryClient,
    isAuthenticated,
    artifact.status,
  ]);

  return (
    <AnimatePresence>
      {artifact.isVisible && (
        <motion.div
          animate={{ opacity: 1 }}
          className="fixed top-0 left-0 z-50 flex h-dvh w-dvw flex-row bg-transparent"
          data-testid="artifact"
          exit={{ opacity: 0, transition: { delay: 0.4 } }}
          initial={{ opacity: 1 }}
        >
          {!isMobile && (
            <motion.div
              animate={{ width: windowWidth, right: 0 }}
              className="fixed h-dvh bg-background"
              exit={{
                width: isSidebarOpen ? windowWidth - 256 : windowWidth,
                right: 0,
              }}
              initial={{
                width: isSidebarOpen ? windowWidth - 256 : windowWidth,
                right: 0,
              }}
            />
          )}

          {!isMobile && (
            <motion.div
              animate={{
                opacity: 1,
                x: 0,
                scale: 1,
                transition: {
                  delay: 0.2,
                  type: "spring",
                  stiffness: 200,
                  damping: 30,
                },
              }}
              className="relative h-dvh w-[400px] shrink-0 bg-muted dark:bg-background"
              exit={{
                opacity: 0,
                x: 0,
                scale: 1,
                transition: { duration: 0 },
              }}
              initial={{ opacity: 0, x: 10, scale: 1 }}
            >
              <AnimatePresence>
                {!isCurrentVersion && (
                  <motion.div
                    animate={{ opacity: 1 }}
                    className="absolute top-0 left-0 z-50 h-dvh w-[400px] bg-zinc-900/50"
                    exit={{ opacity: 0 }}
                    initial={{ opacity: 0 }}
                  />
                )}
              </AnimatePresence>

              <div className="@container flex h-full flex-col">
                <MessagesPane
                  chatId={chatId}
                  className="size-full"
                  isReadonly={isReadonly}
                  isVisible={true}
                  status={status}
                  votes={votes}
                />
              </div>
            </motion.div>
          )}

          <motion.div
            animate={
              isMobile
                ? {
                    opacity: 1,
                    x: 0,
                    y: 0,
                    height: windowHeight,
                    width: windowWidth ? windowWidth : "calc(100dvw)",
                    borderRadius: 0,
                    transition: {
                      delay: 0,
                      type: "spring",
                      stiffness: 200,
                      damping: 30,
                      duration: 5000,
                    },
                  }
                : {
                    opacity: 1,
                    x: 400,
                    y: 0,
                    height: windowHeight,
                    width: windowWidth
                      ? windowWidth - 400
                      : "calc(100dvw-400px)",
                    borderRadius: 0,
                    transition: {
                      delay: 0,
                      type: "spring",
                      stiffness: 200,
                      damping: 30,
                      duration: 5000,
                    },
                  }
            }
            className="fixed flex h-dvh flex-col overflow-y-auto border-zinc-200 bg-background md:border-l dark:border-zinc-700"
            exit={{
              opacity: 0,
              scale: 0.5,
              transition: {
                delay: 0.1,
                type: "spring",
                stiffness: 600,
                damping: 30,
              },
            }}
            initial={
              isMobile
                ? {
                    opacity: 1,
                    x: artifact.boundingBox.left,
                    y: artifact.boundingBox.top,
                    height: artifact.boundingBox.height,
                    width: artifact.boundingBox.width,
                    borderRadius: 50,
                  }
                : {
                    opacity: 1,
                    x: artifact.boundingBox.left,
                    y: artifact.boundingBox.top,
                    height: artifact.boundingBox.height,
                    width: artifact.boundingBox.width,
                    borderRadius: 50,
                  }
            }
          >
            <div className="flex flex-row items-start justify-between bg-background/80 p-2">
              <div className="flex flex-row items-start gap-4">
                <ArtifactCloseButton />

                <div className="flex flex-col">
                  <div className="font-medium">{artifact.title}</div>

                  {isContentDirty ? (
                    <div className="text-muted-foreground text-sm">
                      Saving changes...
                    </div>
                  ) : document ? (
                    <div className="text-muted-foreground text-sm">
                      {`Updated ${formatDistance(
                        new Date(document.createdAt),
                        new Date(),
                        {
                          addSuffix: true,
                        }
                      )}`}
                    </div>
                  ) : (
                    <div className="mt-2 h-3 w-32 animate-pulse rounded-md bg-muted-foreground/20" />
                  )}
                </div>
              </div>

              <ArtifactActions
                artifact={artifact}
                currentVersionIndex={currentVersionIndex}
                handleVersionChange={handleVersionChange}
                isCurrentVersion={isCurrentVersion}
                isReadonly={isReadonly}
                metadata={metadata}
                mode={mode}
                setMetadata={setMetadata}
              />
            </div>

            <ScrollArea className="h-full max-w-full!">
              <div className="flex flex-col items-center bg-background/80">
                <artifactDefinition.content
                  content={
                    isCurrentVersion
                      ? artifact.content
                      : getDocumentContentById(currentVersionIndex)
                  }
                  currentVersionIndex={currentVersionIndex}
                  getDocumentContentById={getDocumentContentById}
                  isCurrentVersion={isCurrentVersion}
                  isInline={false}
                  isLoading={isDocumentsFetching && !artifact.content}
                  isReadonly={isReadonly}
                  metadata={metadata}
                  mode={mode}
                  onSaveContent={saveContent}
                  setMetadata={setMetadata}
                  status={artifact.status}
                  suggestions={[]}
                  title={artifact.title}
                />

                <AnimatePresence>
                  {isCurrentVersion && !isReadonly && (
                    <Toolbar
                      artifactKind={artifact.kind}
                      isToolbarVisible={isToolbarVisible}
                      setIsToolbarVisible={setIsToolbarVisible}
                      status={status}
                      stop={stop}
                      storeApi={storeApi}
                    />
                  )}
                </AnimatePresence>
              </div>
            </ScrollArea>

            <AnimatePresence>
              {!(isCurrentVersion || isReadonly) && (
                <VersionFooter
                  currentVersionIndex={currentVersionIndex}
                  documents={documents}
                  handleVersionChange={handleVersionChange}
                />
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export const Artifact = memo(PureArtifact, (prevProps, nextProps) => {
  if (prevProps.status !== nextProps.status) {
    return false;
  }
  if (prevProps.stop !== nextProps.stop) {
    return false;
  }
  if (!equal(prevProps.votes, nextProps.votes)) {
    return false;
  }
  if (prevProps.isReadonly !== nextProps.isReadonly) {
    return false;
  }
  if (prevProps.isAuthenticated !== nextProps.isAuthenticated) {
    return false;
  }

  return true;
});
