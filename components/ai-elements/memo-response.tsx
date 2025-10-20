"use client";

import { type ComponentProps, memo } from "react";
import { cn } from "@/lib/utils";
import { Streamdown } from "../streamdown/memo-streamdown";

type ResponseProps = ComponentProps<typeof Streamdown>;

export const Response = memo(
  ({
    className,
    ...props
  }: ResponseProps & { messageId: string; partIdx: number }) => (
    <Streamdown
      className={cn(
        "size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
        className
      )}
      {...props}
    />
  ),
  (prevProps, nextProps) => prevProps.children === nextProps.children
);

Response.displayName = "Response";
