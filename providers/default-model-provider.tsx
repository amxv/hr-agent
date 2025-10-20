"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";
import type { AppModelId } from "@/lib/ai/app-models";
import { env } from "@/lib/env";

type DefaultModelContextType = {
  defaultModel: AppModelId;
  changeModel: (modelId: AppModelId) => Promise<void>;
};

const DefaultModelContext = createContext<DefaultModelContextType | undefined>(
  undefined
);

type DefaultModelClientProviderProps = {
  children: ReactNode;
  defaultModel: AppModelId;
};

export function DefaultModelProvider({
  children,
  defaultModel: initialModel,
}: DefaultModelClientProviderProps) {
  // Use fixed model from env if DISABLE_MODEL_SELECTION is enabled
  const fixedModel =
    env.NEXT_PUBLIC_DISABLE_MODEL_SELECTION && env.NEXT_PUBLIC_CHAT_MODEL
      ? (env.NEXT_PUBLIC_CHAT_MODEL as AppModelId)
      : initialModel;

  const [currentModel, setCurrentModel] = useState<AppModelId>(fixedModel);

  const changeModel = useCallback(
    async (modelId: AppModelId) => {
      // If model selection is disabled, don't allow changes
      if (env.NEXT_PUBLIC_DISABLE_MODEL_SELECTION) {
        return;
      }

      // Update local state immediately
      setCurrentModel(modelId);

      try {
        // Update cookies for persistence
        await fetch("/api/chat-model", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ model: modelId }),
        });
      } catch (error) {
        console.error("Failed to save chat model:", error);
        toast.error("Failed to save model preference");
        // Revert on error
        setCurrentModel(initialModel);
      }
    },
    [initialModel]
  );

  const value = useMemo(
    () => ({
      defaultModel: currentModel,
      changeModel,
    }),
    [currentModel, changeModel]
  );

  return (
    <DefaultModelContext.Provider value={value}>
      {children}
    </DefaultModelContext.Provider>
  );
}

export function useDefaultModel() {
  const context = useContext(DefaultModelContext);
  if (context === undefined) {
    throw new Error(
      "useDefaultModel must be used within a DefaultModelProvider"
    );
  }
  return context.defaultModel;
}

export function useModelChange() {
  const context = useContext(DefaultModelContext);
  if (context === undefined) {
    throw new Error(
      "useModelChange must be used within a DefaultModelProvider"
    );
  }
  return context.changeModel;
}
