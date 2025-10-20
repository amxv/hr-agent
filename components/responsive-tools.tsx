import { Settings2, X } from "lucide-react";
import {
  createElement,
  type Dispatch,
  type SetStateAction,
  useState,
} from "react";
import { getAppModelDefinition } from "@/lib/ai/app-models";
import type { UiToolName } from "@/lib/ai/types";
import { useSession } from "@/providers/session-provider";
import { enabledTools, toolDefinitions } from "./chat-features-definitions";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Separator } from "./ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { LoginPrompt } from "./upgrade-cta/login-prompt";

export function ResponsiveTools({
  tools,
  setTools,
  selectedModelId,
}: {
  tools: UiToolName | null;
  setTools: Dispatch<SetStateAction<UiToolName | null>>;
  selectedModelId: string;
}) {
  const { data: session } = useSession();
  const isAnonymous = !session?.user;
  const [showLoginPopover, setShowLoginPopover] = useState(false);

  const { hasReasoningModel, hasUnspecifiedFeatures } = (() => {
    try {
      const modelDef = getAppModelDefinition(selectedModelId as any);
      return {
        hasReasoningModel: modelDef.reasoning === true,
        hasUnspecifiedFeatures: !modelDef.input,
      };
    } catch {
      return {
        hasReasoningModel: false,
        hasUnspecifiedFeatures: false,
      };
    }
  })();

  const activeTool = tools;

  const setTool = (tool: UiToolName | null) => {
    if (tool === "deepResearch" && hasReasoningModel) {
      return;
    }

    if (hasUnspecifiedFeatures && tool !== null) {
      return;
    }

    if (isAnonymous && tool !== null) {
      setShowLoginPopover(true);
      return;
    }

    setTools(tool);
  };

  return (
    <div className="flex items-center @[400px]:gap-2 gap-1">
      {isAnonymous ? (
        <Popover onOpenChange={setShowLoginPopover} open={showLoginPopover}>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button
                  className="@[400px]:h-10 h-8 @[400px]:gap-2 gap-1 p-1.5"
                  variant="ghost"
                >
                  <Settings2 size={14} />
                  <span className="@[400px]:inline hidden">Tools</span>
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent>Select Tools</TooltipContent>
          </Tooltip>
          <PopoverContent align="start" className="w-80 p-0">
            <LoginPrompt
              description="Access web search, deep research, and more to get better answers."
              title="Sign in to use Tools"
            />
          </PopoverContent>
        </Popover>
      ) : (
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  className="@[400px]:h-10 h-8 @[400px]:gap-2 gap-1 p-1.5 px-2.5"
                  size="sm"
                  variant="ghost"
                >
                  <Settings2 size={14} />
                  <span className="@[400px]:inline hidden">Tools</span>
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>Select Tools</TooltipContent>
          </Tooltip>
          <DropdownMenuContent
            align="start"
            className="w-48"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {enabledTools.map((key) => {
              const tool = toolDefinitions[key];
              const isDeepResearchDisabled =
                key === "deepResearch" && hasReasoningModel;
              const isToolDisabled =
                hasUnspecifiedFeatures || isDeepResearchDisabled;
              const Icon = tool.icon;
              return (
                <DropdownMenuItem
                  className="flex items-center gap-2"
                  disabled={isToolDisabled}
                  key={key}
                  onClick={(e) => {
                    e.stopPropagation();
                    setTool(tools === key ? null : key);
                  }}
                >
                  <Icon size={14} />
                  <span>{tool.name}</span>
                  {tools === key && (
                    <span className="text-xs opacity-70">✓</span>
                  )}
                  {hasUnspecifiedFeatures && (
                    <span className="text-xs opacity-60">(not supported)</span>
                  )}
                  {!hasUnspecifiedFeatures && isDeepResearchDisabled && (
                    <span className="text-xs opacity-60">
                      (for non-reasoning models)
                    </span>
                  )}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {activeTool && (
        <>
          <Separator
            className="h-4 bg-muted-foreground/50"
            orientation="vertical"
          />
          <Button
            className="@[400px]:h-10 h-8 @[400px]:gap-2 gap-1 rounded-full text-primary hover:text-primary/80"
            onClick={() => setTool(null)}
            size="sm"
            variant="ghost"
          >
            {createElement(toolDefinitions[activeTool].icon, {
              size: 14,
            })}
            <span className="@[500px]:inline hidden">
              {toolDefinitions[activeTool].shortName}
            </span>
            <X className="opacity-70" size={12} />
          </Button>
        </>
      )}
    </div>
  );
}
