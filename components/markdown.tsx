import type React from "react";
import { memo } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { LinkMarkdown } from "@/components/chat/link-markdown";
import { ButtonCopy } from "@/components/common/button-copy";
import {
  CodeBlock,
  CodeBlockCode,
  CodeBlockGroup,
} from "@/components/prompt-kit/code-block";
import { cn } from "@/lib/utils";

function extractLanguage(className?: string): string {
  if (!className) {
    return "plaintext";
  }
  const match = className.match(/language-(\w+)/);
  return match ? match[1] : "plaintext";
}

type MarkdownPoint = { line?: number; column?: number };
type MarkdownPosition = { start?: MarkdownPoint; end?: MarkdownPoint };
type MarkdownNode = {
  position?: MarkdownPosition;
  properties?: { className?: string };
};
type WithNode<T> = Omit<T, "ref"> & {
  node?: MarkdownNode;
  children?: React.ReactNode;
  className?: string;
};

function sameNodePosition(a?: MarkdownNode, b?: MarkdownNode) {
  const as = a?.position?.start;
  const ae = a?.position?.end;
  const bs = b?.position?.start;
  const be = b?.position?.end;
  return (
    as?.line === bs?.line &&
    as?.column === bs?.column &&
    ae?.line === be?.line &&
    ae?.column === be?.column
  );
}

type OlProps = WithNode<React.ComponentPropsWithoutRef<"ol">>;
const MemoOl = memo<OlProps>(
  ({ node, children, className, ...props }: OlProps) => (
    <ol className={cn("ml-4 list-outside list-decimal", className)} {...props}>
      {children}
    </ol>
  ),
  (p, n) => p.className === n.className && sameNodePosition(p.node, n.node)
);
MemoOl.displayName = "MarkdownOl";

type LiProps = WithNode<React.ComponentPropsWithoutRef<"li">>;
const MemoLi = memo<LiProps>(
  ({ node, children, className, ...props }: LiProps) => (
    <li className={cn("py-1", className)} {...props}>
      {children}
    </li>
  ),
  (p, n) => p.className === n.className && sameNodePosition(p.node, n.node)
);
MemoLi.displayName = "MarkdownLi";

type UlProps = WithNode<React.ComponentPropsWithoutRef<"ul">>;
const MemoUl = memo<UlProps>(
  ({ node, children, className, ...props }: UlProps) => (
    <ul className={cn("ml-4 list-outside list-disc", className)} {...props}>
      {children}
    </ul>
  ),
  (p, n) => p.className === n.className && sameNodePosition(p.node, n.node)
);
MemoUl.displayName = "MarkdownUl";

type HrProps = WithNode<React.ComponentPropsWithoutRef<"hr">>;
const MemoHr = memo<HrProps>(
  ({ node, className, ...props }: HrProps) => (
    <hr className={cn("my-6 border-border", className)} {...props} />
  ),
  (p, n) => p.className === n.className && sameNodePosition(p.node, n.node)
);
MemoHr.displayName = "MarkdownHr";

type StrongProps = WithNode<React.ComponentPropsWithoutRef<"span">>;
const MemoStrong = memo<StrongProps>(
  ({ node, children, className, ...props }: StrongProps) => (
    <span className={cn("font-semibold", className)} {...props}>
      {children}
    </span>
  ),
  (p, n) => p.className === n.className && sameNodePosition(p.node, n.node)
);
MemoStrong.displayName = "MarkdownStrong";

type AProps = WithNode<React.ComponentPropsWithoutRef<"a">>;
const MemoA = memo<AProps>(
  ({ node, children, className, href, ...props }: AProps) => (
    <LinkMarkdown className={className} href={href || "#"} {...props}>
      {children}
    </LinkMarkdown>
  ),
  (p, n) =>
    p.className === n.className &&
    p.href === n.href &&
    sameNodePosition(p.node, n.node)
);
MemoA.displayName = "MarkdownA";

type H1Props = WithNode<React.ComponentPropsWithoutRef<"h1">>;
const MemoH1 = memo<H1Props>(
  ({ node, children, className, ...props }: H1Props) => (
    <h1
      className={cn("mt-6 mb-2 font-semibold text-3xl", className)}
      {...props}
    >
      {children}
    </h1>
  ),
  (p, n) => p.className === n.className && sameNodePosition(p.node, n.node)
);
MemoH1.displayName = "MarkdownH1";

type H2Props = WithNode<React.ComponentPropsWithoutRef<"h2">>;
const MemoH2 = memo<H2Props>(
  ({ node, children, className, ...props }: H2Props) => (
    <h2
      className={cn("mt-6 mb-2 font-semibold text-2xl", className)}
      {...props}
    >
      {children}
    </h2>
  ),
  (p, n) => p.className === n.className && sameNodePosition(p.node, n.node)
);
MemoH2.displayName = "MarkdownH2";

type H3Props = WithNode<React.ComponentPropsWithoutRef<"h3">>;
const MemoH3 = memo<H3Props>(
  ({ node, children, className, ...props }: H3Props) => (
    <h3 className={cn("mt-6 mb-2 font-semibold text-xl", className)} {...props}>
      {children}
    </h3>
  ),
  (p, n) => p.className === n.className && sameNodePosition(p.node, n.node)
);
MemoH3.displayName = "MarkdownH3";

type H4Props = WithNode<React.ComponentPropsWithoutRef<"h4">>;
const MemoH4 = memo<H4Props>(
  ({ node, children, className, ...props }: H4Props) => (
    <h4 className={cn("mt-6 mb-2 font-semibold text-lg", className)} {...props}>
      {children}
    </h4>
  ),
  (p, n) => p.className === n.className && sameNodePosition(p.node, n.node)
);
MemoH4.displayName = "MarkdownH4";

type H5Props = WithNode<React.ComponentPropsWithoutRef<"h5">>;
const MemoH5 = memo<H5Props>(
  ({ node, children, className, ...props }: H5Props) => (
    <h5
      className={cn("mt-6 mb-2 font-semibold text-base", className)}
      {...props}
    >
      {children}
    </h5>
  ),
  (p, n) => p.className === n.className && sameNodePosition(p.node, n.node)
);
MemoH5.displayName = "MarkdownH5";

type H6Props = WithNode<React.ComponentPropsWithoutRef<"h6">>;
const MemoH6 = memo<H6Props>(
  ({ node, children, className, ...props }: H6Props) => (
    <h6 className={cn("mt-6 mb-2 font-semibold text-sm", className)} {...props}>
      {children}
    </h6>
  ),
  (p, n) => p.className === n.className && sameNodePosition(p.node, n.node)
);
MemoH6.displayName = "MarkdownH6";

type TableProps = WithNode<React.ComponentPropsWithoutRef<"table">>;
const MemoTable = memo<TableProps>(
  ({ node, children, className, ...props }: TableProps) => (
    <div className="my-6 overflow-x-auto rounded border border-border">
      <table className={cn("m-0 w-full border-collapse", className)} {...props}>
        {children}
      </table>
    </div>
  ),
  (p, n) => p.className === n.className && sameNodePosition(p.node, n.node)
);
MemoTable.displayName = "MarkdownTable";

type TrProps = WithNode<React.ComponentPropsWithoutRef<"tr">>;
const MemoTr = memo<TrProps>(
  ({ node, children, className, ...props }: TrProps) => (
    <tr
      className={cn(
        "border-border border-b last:border-b-0",
        "transition-colors duration-200 hover:bg-muted/50",
        className
      )}
      {...props}
    >
      {children}
    </tr>
  ),
  (p, n) => p.className === n.className && sameNodePosition(p.node, n.node)
);
MemoTr.displayName = "MarkdownTr";

type TheadProps = WithNode<React.ComponentPropsWithoutRef<"thead">>;
const MemoThead = memo<TheadProps>(
  ({ node, children, className, ...props }: TheadProps) => (
    <thead className={className} {...props}>
      {children}
    </thead>
  ),
  (p, n) => p.className === n.className && sameNodePosition(p.node, n.node)
);
MemoThead.displayName = "MarkdownThead";

type ThProps = WithNode<React.ComponentPropsWithoutRef<"th">> & {
  align?: string;
};
const MemoTh = memo<ThProps>(
  ({ node, children, className, align, ...props }: ThProps) => {
    const alignClass = align ? `text-${align}` : "text-left";
    return (
      <th
        className={cn(
          "px-4 py-3 font-semibold text-foreground text-sm",
          "bg-muted",
          "border-border border-b",
          "break-words",
          alignClass,
          className
        )}
        {...props}
      >
        <div className="font-medium">{children}</div>
      </th>
    );
  },
  (p, n) =>
    p.className === n.className &&
    p.align === n.align &&
    sameNodePosition(p.node, n.node)
);
MemoTh.displayName = "MarkdownTh";

type TdProps = WithNode<React.ComponentPropsWithoutRef<"td">> & {
  align?: string;
};
const MemoTd = memo<TdProps>(
  ({ node, children, className, align, ...props }: TdProps) => {
    const alignClass = align ? `text-${align}` : "text-left";
    return (
      <td
        className={cn(
          "px-4 py-3 text-muted-foreground text-sm",
          "border-border border-r last:border-r-0",
          "break-words",
          alignClass,
          className
        )}
        {...props}
      >
        <div className="leading-relaxed">{children}</div>
      </td>
    );
  },
  (p, n) =>
    p.className === n.className &&
    p.align === n.align &&
    sameNodePosition(p.node, n.node)
);
MemoTd.displayName = "MarkdownTd";

type TbodyProps = WithNode<React.ComponentPropsWithoutRef<"tbody">>;
const MemoTbody = memo<TbodyProps>(
  ({ node, children, className, ...props }: TbodyProps) => (
    <tbody className={className} {...props}>
      {children}
    </tbody>
  ),
  (p, n) => p.className === n.className && sameNodePosition(p.node, n.node)
);
MemoTbody.displayName = "MarkdownTbody";

type BlockquoteProps = WithNode<React.ComponentPropsWithoutRef<"blockquote">>;
const MemoBlockquote = memo<BlockquoteProps>(
  ({ node, children, className, ...props }: BlockquoteProps) => (
    <blockquote
      className={cn(
        "my-4 border-border border-l-2 pl-4",
        "text-muted-foreground",
        "[&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
        className
      )}
      {...props}
    >
      {children}
    </blockquote>
  ),
  (p, n) => p.className === n.className && sameNodePosition(p.node, n.node)
);
MemoBlockquote.displayName = "MarkdownBlockquote";

type CodeProps = WithNode<React.ComponentPropsWithoutRef<"code">>;
const MemoCode = memo<CodeProps>(
  ({ node, className, children, ...props }: CodeProps) => {
    const startLine = node?.position?.start?.line;
    const endLine = node?.position?.end?.line;
    const isInline =
      typeof startLine === "number" && typeof endLine === "number"
        ? startLine === endLine
        : true;

    if (isInline) {
      return (
        <span
          className={cn("rounded-sm bg-card px-1 font-mono text-sm", className)}
          {...props}
        >
          {children}
        </span>
      );
    }

    const language = extractLanguage(className);

    return (
      <CodeBlock className={className}>
        <CodeBlockGroup className="flex h-9 items-center justify-between px-4">
          <div className="py-1 pr-2 font-mono text-muted-foreground text-xs">
            {language}
          </div>
        </CodeBlockGroup>
        <div className="sticky top-16 lg:top-0">
          <div className="absolute right-0 bottom-0 flex h-9 items-center pr-1.5">
            <ButtonCopy code={children as string} />
          </div>
        </div>
        <CodeBlockCode code={children as string} language={language} />
      </CodeBlock>
    );
  },
  (p, n) => p.className === n.className && sameNodePosition(p.node, n.node)
);
MemoCode.displayName = "MarkdownCode";

type PreProps = WithNode<React.ComponentPropsWithoutRef<"pre">>;
const MemoPre = memo<PreProps>(
  ({ children }: PreProps) => <>{children}</>,
  (p, n) => sameNodePosition(p.node, n.node)
);
MemoPre.displayName = "MarkdownPre";

export const components: Partial<Components> = {
  ol: MemoOl,
  li: MemoLi,
  ul: MemoUl,
  hr: MemoHr,
  strong: MemoStrong,
  a: MemoA,
  h1: MemoH1,
  h2: MemoH2,
  h3: MemoH3,
  h4: MemoH4,
  h5: MemoH5,
  h6: MemoH6,
  table: MemoTable,
  tr: MemoTr,
  thead: MemoThead,
  th: MemoTh,
  td: MemoTd,
  tbody: MemoTbody,
  blockquote: MemoBlockquote,
  code: MemoCode,
  pre: MemoPre,
};

const remarkPlugins = [remarkGfm];

const NonMemoizedMarkdown = ({ children }: { children: string }) => (
  <ReactMarkdown components={components} remarkPlugins={remarkPlugins}>
    {children}
  </ReactMarkdown>
);

export const Markdown = memo(
  NonMemoizedMarkdown,
  (prevProps, nextProps) => prevProps.children === nextProps.children
);
