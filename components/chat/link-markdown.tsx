import Link from "next/link";
import { cn } from "@/lib/utils";

type LinkMarkdownProps = {
  href: string;
  children: React.ReactNode;
  className?: string;
};

export function LinkMarkdown({
  href,
  children,
  className,
  ...props
}: LinkMarkdownProps) {
  const isExternal = href.startsWith("http") || href.startsWith("https");

  if (isExternal) {
    return (
      <a
        className={cn("text-blue-500 hover:underline", className)}
        href={href}
        rel="noopener noreferrer"
        target="_blank"
        {...props}
      >
        {children}
      </a>
    );
  }

  return (
    <Link
      className={cn("text-blue-500 hover:underline", className)}
      // @ts-expect-error - href is a valid URL
      href={href}
      {...props}
    >
      {children}
    </Link>
  );
}
