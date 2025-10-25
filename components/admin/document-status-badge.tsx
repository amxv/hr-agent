import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type DocumentStatus = "uploading" | "processing" | "ready" | "failed";

type DocumentStatusBadgeProps = {
  status: DocumentStatus;
  errorMessage?: string | null;
};

export function DocumentStatusBadge({
  status,
  errorMessage,
}: DocumentStatusBadgeProps) {
  const getVariant = () => {
    switch (status) {
      case "uploading":
        return "secondary";
      case "processing":
        return "outline";
      case "ready":
        return "default";
      case "failed":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const getIcon = () => {
    if (status === "uploading" || status === "processing") {
      return <Loader2 className="mr-1 size-3 animate-spin" />;
    }
    return null;
  };

  const badge = (
    <Badge variant={getVariant()}>
      {getIcon()}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );

  if (status === "failed" && errorMessage) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{badge}</TooltipTrigger>
          <TooltipContent>
            <p className="max-w-xs">{errorMessage}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return badge;
}
