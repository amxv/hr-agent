"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Tag({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex gap-1 rounded bg-muted px-1.5 py-1 text-muted-foreground text-xs",
        className
      )}
    >
      {children}
    </span>
  );
}
