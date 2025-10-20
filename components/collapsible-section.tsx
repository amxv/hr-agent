/* eslint-disable @next/next/no-img-element */
"use client";

import { CheckCircle } from "@phosphor-icons/react/CheckCircle";
import {
  Calculator,
  Calendar,
  Check,
  ChevronDown,
  Code,
  Copy,
  FileText,
  Loader2,
  type LucideIcon,
  TrendingUp,
} from "lucide-react";
import { useTheme } from "next-themes";
import React from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  oneDark,
  oneLight,
} from "react-syntax-highlighter/dist/esm/styles/prism";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const IconMapping: Record<string, LucideIcon> = {
  stock: TrendingUp,
  default: Code,
  date: Calendar,
  calculation: Calculator,
  output: FileText,
};

type CollapsibleSectionProps = {
  code: string;
  output?: string;
  language?: string;
  title?: string;
  icon?: string;
  status?: "running" | "completed";
};

export function CollapsibleSection({
  code,
  output,
  language = "plaintext",
  title,
  icon,
  status,
}: CollapsibleSectionProps) {
  const [copied, setCopied] = React.useState(false);
  const [isExpanded, setIsExpanded] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<"code" | "output">("code");
  const { theme } = useTheme();
  const IconComponent = icon ? IconMapping[icon] : null;

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const textToCopy = activeTab === "code" ? code : output;
    await navigator.clipboard.writeText(textToCopy || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="group overflow-hidden rounded-lg border border-neutral-200 transition-all duration-200 hover:shadow-xs dark:border-neutral-800">
      <button
        className="flex w-full cursor-pointer items-center justify-between bg-white px-4 py-3 text-left transition-colors hover:bg-neutral-50 dark:bg-neutral-900 dark:hover:bg-neutral-800/50"
        onClick={() => setIsExpanded(!isExpanded)}
        type="button"
      >
        <div className="flex items-center gap-3">
          {IconComponent && (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800">
              <IconComponent className="h-4 w-4 text-primary" />
            </div>
          )}
          <h3 className="font-medium text-neutral-900 text-sm dark:text-neutral-100">
            {title}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {status && (
            <Badge
              className={cn(
                "flex w-fit items-center gap-1.5 px-1.5 py-0.5 text-xs",
                status === "running"
                  ? "bg-blue-50/50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                  : "bg-green-50/50 text-green-600 dark:bg-green-900/20 dark:text-green-400"
              )}
              variant="secondary"
            >
              {status === "running" ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <CheckCircle className="h-3 w-3" />
              )}
              {status === "running" ? "Running" : "Done"}
            </Badge>
          )}
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform duration-200",
              !isExpanded && "rotate-180"
            )}
          />
        </div>
      </button>

      {isExpanded && (
        <div>
          <div className="flex border-neutral-200 border-b dark:border-neutral-800">
            <button
              className={cn(
                "px-4 py-2 font-medium text-sm transition-colors",
                activeTab === "code"
                  ? "border-primary border-b-2 text-primary"
                  : "text-neutral-600 dark:text-neutral-400"
              )}
              onClick={() => setActiveTab("code")}
              type="button"
            >
              Code
            </button>
            {output && (
              <button
                className={cn(
                  "px-4 py-2 font-medium text-sm transition-colors",
                  activeTab === "output"
                    ? "border-primary border-b-2 text-primary"
                    : "text-neutral-600 dark:text-neutral-400"
                )}
                onClick={() => setActiveTab("output")}
                type="button"
              >
                Output
              </button>
            )}
            <div className="ml-auto flex items-center pr-2">
              <Button
                className="opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                onClick={handleCopy}
                size="sm"
                variant="ghost"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-green-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          </div>
          <div
            className={cn(
              "text-sm",
              theme === "dark" ? "bg-[rgb(40,44,52)]" : "bg-[rgb(250,250,250)]"
            )}
          >
            <SyntaxHighlighter
              codeTagProps={{
                style: {
                  fontFamily: "var(--font-geist-mono)",
                  fontSize: "0.85em",
                  whiteSpace: "pre",
                  overflowWrap: "normal",
                  wordBreak: "keep-all",
                },
              }}
              customStyle={{
                margin: 0,
                padding: "0.75rem 0 0 0",
                backgroundColor: theme === "dark" ? "#000000" : "transparent",
                borderRadius: 0,
                borderBottomLeftRadius: "0.375rem",
                borderBottomRightRadius: "0.375rem",
                fontFamily: "var(--font-geist-mono)",
              }}
              language={activeTab === "code" ? language : "plaintext"}
              lineNumberContainerStyle={{
                backgroundColor: theme === "dark" ? "#000000" : "#f5f5f5",
                float: "left",
              }}
              lineNumberStyle={{
                textAlign: "right",
                color: "#808080",
                backgroundColor: "transparent",
                fontStyle: "normal",
                marginRight: "1em",
                paddingRight: "0.5em",
                fontFamily: "var(--font-geist-mono)",
                minWidth: "2em",
              }}
              showLineNumbers={true}
              style={theme === "dark" ? oneDark : oneLight}
              wrapLongLines={false}
            >
              {activeTab === "code" ? code : output || ""}
            </SyntaxHighlighter>
          </div>
        </div>
      )}
    </div>
  );
}
