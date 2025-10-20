import type React from "react";
import { cn } from "@/lib/utils";

export function Favicon({
  url,
  className,
  ...props
}: {
  url: string;
  className?: string;
} & React.ImgHTMLAttributes<HTMLImageElement>) {
  return (
    // biome-ignore lint/performance/noImgElement: Next/Image isn't ideal for tiny favicons here
    <img
      className={cn("h-4 w-4", className)}
      src={url}
      {...props}
      alt={`Favicon for ${url}`}
      onError={(e) => {
        const target = e.target as HTMLImageElement;
        target.style.display = "none";
        target.nextElementSibling?.classList.remove("hidden");
      }}
    />
  );
}
