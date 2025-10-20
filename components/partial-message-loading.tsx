"use client";

import {
  useMessageMetadataById,
  useMessagePartTypesById,
} from "@/lib/stores/hooks";
import { Skeleton } from "./ui/skeleton";

export function PartialMessageLoading({ messageId }: { messageId: string }) {
  const metadata = useMessageMetadataById(messageId);
  const parts = useMessagePartTypesById(messageId);
  const isLoading = metadata?.isPartial && (parts?.length ?? 0) === 0;

  if (!isLoading) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-4 w-4/5 rounded-full" />
      <Skeleton className="h-4 w-3/5 rounded-full" />
      <Skeleton className="h-4 w-2/5 rounded-full" />
    </div>
  );
}
