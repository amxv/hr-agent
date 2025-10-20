import { CircleCheck, Dot, FileText, Pencil, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import type React from "react";
import type { ReactNode } from "react";
import type { ResearchUpdate } from "@/lib/ai/tools/research-updates-schema";
import { cn } from "@/lib/utils";
import { ResearchTask } from "./research-task";

export const ResearchTasks = ({ updates }: { updates: ResearchUpdate[] }) => (
  <div className="relative">
    {updates.map((update, index) => (
      <StepWrapper
        isLast={index === updates.length - 1}
        key={`${update.type}-${index}`}
        update={update}
      >
        <ResearchTask
          isRunning={
            (update.type === "web" && update.status === "running") ||
            (index === updates.length - 1 && update.type !== "completed")
          }
          minimal={false}
          update={update}
        />
      </StepWrapper>
    ))}
  </div>
);

export type StepWrapperProps = {
  update: ResearchUpdate;
  children: ReactNode;
  isLast: boolean;
};

export const StepWrapper = ({ update, children, isLast }: StepWrapperProps) => (
  <div className="flex w-full flex-row items-stretch justify-start gap-2">
    <div className="flex min-h-full shrink-0 flex-col items-center justify-start px-2">
      <div className="h-1 shrink-0 bg-border/50" />
      <div className="z-10 bg-background py-0.5">
        <StepTypeIcon update={update} />
      </div>
      <motion.div
        animate={{ height: "100%" }}
        className={cn(
          "min-h-full w-px flex-1 border-border border-l border-dashed",
          isLast && "hidden"
        )}
        initial={{ height: 0 }}
        transition={{ duration: 0.5 }}
      />
    </div>
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="flex w-full flex-1 flex-col gap-4 overflow-hidden pt-1 pr-2 pb-2"
      initial={{ opacity: 0, y: 5 }}
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.div>
  </div>
);

const icons: Record<ResearchUpdate["type"], React.ElementType> = {
  web: FileText,
  started: Dot,
  completed: CircleCheck,
  thoughts: Sparkles,
  writing: Pencil,
} as const;

export const StepTypeIcon = ({ update }: { update: ResearchUpdate }) => {
  const Icon = icons[update.type];
  return <Icon className="h-4 w-4 text-muted-foreground" />;
};
