"use client";

import { memo, useMemo } from "react";
import {
  ModelSelectorBase,
  type ModelSelectorBaseItem,
} from "@/components/model-selector-base";
import { LoginCtaBanner } from "@/components/upgrade-cta/login-cta-banner";
import type { AppModelDefinition } from "@/lib/ai/app-models";
import {
  type AppModelId,
  chatModels,
  getAppModelDefinition,
} from "@/lib/ai/app-models";
import { ANONYMOUS_LIMITS } from "@/lib/types/anonymous";
import { cn } from "@/lib/utils";
import { useSession } from "@/providers/session-provider";

export function PureModelSelector({
  selectedModelId,
  className,
  onModelChangeAction,
}: {
  selectedModelId: AppModelId;
  onModelChangeAction?: (modelId: AppModelId) => void;
  className?: string;
}) {
  const { data: session } = useSession();
  const isAnonymous = !session?.user;

  const models: ModelSelectorBaseItem<AppModelId, AppModelDefinition>[] =
    useMemo(
      () =>
        chatModels.map((m) => {
          const def = getAppModelDefinition(m.id);
          const disabled =
            isAnonymous && !ANONYMOUS_LIMITS.AVAILABLE_MODELS.includes(m.id);
          return { id: m.id, definition: def, disabled };
        }),
      [isAnonymous]
    );

  const hasDisabledModels = useMemo(
    () => models.some((m) => m.disabled),
    [models]
  );

  return (
    <ModelSelectorBase
      className={cn("w-fit md:px-2", className)}
      enableFilters
      models={models}
      onModelChange={onModelChangeAction}
      selectedModelId={selectedModelId}
      topContent={
        hasDisabledModels ? (
          <div className="p-3">
            <LoginCtaBanner
              compact
              message="Sign in to unlock all models."
              variant="default"
            />
          </div>
        ) : null
      }
    />
  );
}

export const ModelSelector = memo(
  PureModelSelector,
  (prevProps, nextProps) =>
    prevProps.selectedModelId === nextProps.selectedModelId &&
    prevProps.className === nextProps.className &&
    prevProps.onModelChangeAction === nextProps.onModelChangeAction
);
