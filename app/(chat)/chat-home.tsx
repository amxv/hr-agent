"use client";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { ChatSystem } from "@/components/chat-system";
import type { AppModelId } from "@/lib/ai/app-models";

export function ChatHome({ id }: { id: string }) {
  const searchParams = useSearchParams();
  const overrideModelId = useMemo(() => {
    const value = searchParams.get("modelId");
    return (value as AppModelId) || undefined;
  }, [searchParams]);
  return (
    <ChatSystem
      id={id}
      initialMessages={[]}
      isReadonly={false}
      overrideModelId={overrideModelId}
    />
  );
}
