import { TextShimmerLoader } from "@/components/prompt-kit/loader";
import { cn } from "@/lib/utils";

export const UpdateTitle = ({
  title,
  isRunning,
  className,
}: {
  title: string;
  isRunning: boolean;
  className?: string;
}) => {
  if (isRunning) {
    return (
      <TextShimmerLoader
        className={cn("font-medium text-sm", className)}
        text={title}
      />
    );
  }

  return <h3 className={cn("font-medium text-sm", className)}>{title}</h3>;
};
