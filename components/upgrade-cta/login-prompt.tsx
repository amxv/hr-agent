"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type LoginPromptProps = {
  title: string;
  description: string;
  className?: string;
};

export function LoginPrompt({
  title,
  description,
  className,
}: LoginPromptProps) {
  return (
    <div className={cn("space-y-3 p-4", className)}>
      <div className="flex items-center gap-2">
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
        <h4 className="font-medium text-sm">{title}</h4>
      </div>
      <p className="ml-6 text-muted-foreground text-sm">{description}</p>
      <Link
        className="ml-6 block font-medium text-blue-500 text-sm hover:underline"
        href="/login"
      >
        Sign in
      </Link>
    </div>
  );
}
