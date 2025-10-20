import type { UseChatHelpers } from "@ai-sdk/react";
import type { QueryClient } from "@tanstack/react-query";
import type { DataUIPart } from "ai";
import type { ComponentType, Dispatch, ReactNode, SetStateAction } from "react";
import type { ChatMessage, CustomUIDataTypes } from "@/lib/ai/types";
import type { Suggestion } from "@/lib/db/schema";
import type { useChatStoreApi } from "@/lib/stores/chat-store-context";
import type { useTRPC } from "@/trpc/react";
import type { UIArtifact } from "./artifact";

export type ArtifactActionContext<M = any> = {
  content: string;
  handleVersionChange: (type: "next" | "prev" | "toggle" | "latest") => void;
  currentVersionIndex: number;
  isCurrentVersion: boolean;
  mode: "edit" | "diff";
  metadata: M;
  setMetadata: Dispatch<SetStateAction<M>>;
  isReadonly?: boolean;
};

type ArtifactAction<M = any> = {
  icon: ReactNode;
  label?: string;
  description: string;
  onClick: (context: ArtifactActionContext<M>) => Promise<void> | void;
  isDisabled?: (context: ArtifactActionContext<M>) => boolean;
};

export type ArtifactToolbarContext = {
  sendMessage: UseChatHelpers<ChatMessage>["sendMessage"];
  storeApi: ReturnType<typeof useChatStoreApi>;
};

export type ArtifactToolbarItem = {
  description: string;
  icon: ReactNode;
  onClick: (context: ArtifactToolbarContext) => void;
};

type ArtifactContent<M = any> = {
  title: string;
  content: string;
  mode: "edit" | "diff";
  isCurrentVersion: boolean;
  currentVersionIndex: number;
  status: "streaming" | "idle";
  suggestions: Suggestion[];
  onSaveContent: (updatedContent: string, debounce: boolean) => void;
  isInline: boolean;
  getDocumentContentById: (index: number) => string;
  isLoading: boolean;
  metadata: M;
  setMetadata: Dispatch<SetStateAction<M>>;
  isReadonly?: boolean;
};

type ArtifactConfig<T extends string, M = any> = {
  kind: T;
  description: string;
  content: ComponentType<ArtifactContent<M>>;
  actions: ArtifactAction<M>[];
  toolbar: ArtifactToolbarItem[];
  initialize?: ({
    documentId,
    setMetadata,
    trpc,
    queryClient,
    isAuthenticated,
  }: {
    documentId: string;
    setMetadata: Dispatch<SetStateAction<M>>;
    trpc: ReturnType<typeof useTRPC>;
    queryClient: QueryClient;
    isAuthenticated: boolean;
  }) => void;
  onStreamPart: (args: {
    setMetadata: Dispatch<SetStateAction<M>>;
    setArtifact: Dispatch<SetStateAction<UIArtifact>>;
    streamPart: DataUIPart<CustomUIDataTypes>;
  }) => void;
};

export class Artifact<T extends string, M = any> {
  readonly kind: T;
  readonly description: string;
  readonly content: ComponentType<ArtifactContent<M>>;
  readonly actions: ArtifactAction<M>[];
  readonly toolbar: ArtifactToolbarItem[];
  readonly initialize?: ({
    documentId,
    setMetadata,
    trpc,
    queryClient,
    isAuthenticated,
  }: {
    documentId: string;
    setMetadata: Dispatch<SetStateAction<M>>;
    trpc: ReturnType<typeof import("@/trpc/react").useTRPC>;
    queryClient: QueryClient;
    isAuthenticated: boolean;
  }) => void;
  readonly onStreamPart: (args: {
    setMetadata: Dispatch<SetStateAction<M>>;
    setArtifact: Dispatch<SetStateAction<UIArtifact>>;
    streamPart: DataUIPart<CustomUIDataTypes>;
  }) => void;

  constructor(config: ArtifactConfig<T, M>) {
    this.kind = config.kind;
    this.description = config.description;
    this.content = config.content;
    this.actions = config.actions || [];
    this.toolbar = config.toolbar || [];
    this.initialize = config.initialize || (async () => ({}));
    this.onStreamPart = config.onStreamPart;
  }
}
