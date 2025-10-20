"use client";

import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { cn } from "@/lib/utils";

type CodeBlockProps = {
  className?: string;
  children: React.ReactNode;
};

type CodeBlockGroupProps = {
  className?: string;
  children: React.ReactNode;
};

type CodeBlockCodeProps = {
  code: string;
  language: string;
};

export function CodeBlock({ className, children }: CodeBlockProps) {
  return (
    <div
      className={cn("relative overflow-hidden rounded-lg border", className)}
    >
      {children}
    </div>
  );
}

export function CodeBlockGroup({ className, children }: CodeBlockGroupProps) {
  return <div className={cn("border-b bg-muted", className)}>{children}</div>;
}

export function CodeBlockCode({ code, language }: CodeBlockCodeProps) {
  return (
    <div className="overflow-x-auto">
      <SyntaxHighlighter
        codeTagProps={{
          style: {
            fontFamily:
              'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
          },
        }}
        customStyle={{
          margin: 0,
          padding: "1rem",
          backgroundColor: "transparent",
          fontSize: "0.875rem",
        }}
        language={language}
        style={oneDark}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}
