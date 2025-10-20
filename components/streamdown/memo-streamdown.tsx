"use client";
import { memo, useId } from "react";
import ReactMarkdown, { type Options } from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import "katex/dist/katex.min.css";
import hardenReactMarkdownImport from "harden-react-markdown";
import type { BundledTheme } from "shiki";
import {
  useMarkdownBlockByIndex,
  useMarkdownBlockCountForPart,
} from "@/lib/stores/hooks";
import { ShikiThemeContext } from "./index";
import { components as defaultComponents } from "./lib/components";
import { cn } from "./lib/utils";

type HardenReactMarkdownProps = Options & {
  defaultOrigin?: string;
  allowedLinkPrefixes?: string[];
  allowedImagePrefixes?: string[];
};

// Handle both ESM and CJS imports
const hardenReactMarkdown =
  (
    hardenReactMarkdownImport as unknown as {
      default?: typeof hardenReactMarkdownImport;
    }
  ).default || hardenReactMarkdownImport;

// Create a hardened version of ReactMarkdown
const HardenedMarkdown: ReturnType<typeof hardenReactMarkdown> =
  hardenReactMarkdown(ReactMarkdown);

export type StreamdownProps = HardenReactMarkdownProps & {
  parseIncompleteMarkdown?: boolean;
  className?: string;
  shikiTheme?: [BundledTheme, BundledTheme];
};

type BlockProps = HardenReactMarkdownProps & {
  messageId: string;
  partIdx: number;
  index: number;
};
const Block = memo(
  ({ messageId, partIdx, index, ...props }: BlockProps) => {
    const block = useMarkdownBlockByIndex(messageId, partIdx, index);
    if (block === null || block.trim() === "") {
      return null;
    }

    return <HardenedMarkdown {...props}>{block}</HardenedMarkdown>;
  },
  (prev, next) =>
    prev.messageId === next.messageId &&
    prev.partIdx === next.partIdx &&
    prev.index === next.index
);

Block.displayName = "Block";

export const Streamdown = memo(
  ({
    messageId,
    partIdx,
    allowedImagePrefixes,
    allowedLinkPrefixes,
    defaultOrigin,
    components,
    rehypePlugins,
    remarkPlugins,
    className,
    shikiTheme = ["github-light", "github-dark"],

    ...props
  }: StreamdownProps & { messageId: string; partIdx: number }) => {
    // Parse the children to remove incomplete markdown tokens if enabled
    const generatedId = useId();
    // TODO: have a ref with last parsed complete blocks
    const blockCount = useMarkdownBlockCountForPart(messageId, partIdx);

    return (
      <ShikiThemeContext.Provider value={shikiTheme}>
        <div className={cn("space-y-4", className)} {...props}>
          {Array.from({ length: blockCount }, (_, index) => index).map(
            (index) => (
              <Block
                allowedImagePrefixes={allowedImagePrefixes ?? ["*"]}
                allowedLinkPrefixes={allowedLinkPrefixes ?? ["*"]}
                components={{
                  ...defaultComponents,
                  ...components,
                }}
                defaultOrigin={defaultOrigin}
                index={index}
                key={`${generatedId}-block_${index}`}
                messageId={messageId}
                partIdx={partIdx}
                rehypePlugins={[rehypeKatex, ...(rehypePlugins ?? [])]}
                remarkPlugins={[
                  remarkGfm,
                  remarkMath,
                  ...(remarkPlugins ?? []),
                ]}
              />
            )
          )}
        </div>
      </ShikiThemeContext.Provider>
    );
  },
  (prevProps, nextProps) => prevProps.children === nextProps.children
);
Streamdown.displayName = "Streamdown";

export default Streamdown;
