"use client";

import { memo } from "react";
import { Response } from "./ai-elements/memo-response";

export const TextMessagePart = memo(function TextMessagePart({
  messageId,
  partIdx,
}: {
  messageId: string;
  partIdx: number;
}) {
  return <Response messageId={messageId} partIdx={partIdx} />;
});
