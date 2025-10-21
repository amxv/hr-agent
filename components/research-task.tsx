import { Loader2, SearchIcon } from "lucide-react";
import { motion } from "motion/react";
import { Badge } from "@/components/ui/badge";
import { UpdateTitle } from "@/components/update-title";
import type { ResearchUpdate } from "@/lib/ai/tools/research-updates-schema";
import { WebSourceBadge } from "./source-badge";

export const ResearchTask = ({
  update,
  minimal,
  isRunning,
}: {
  update: ResearchUpdate;
  minimal: boolean;
  isRunning: boolean;
}) => {
  return (
    <div className="group">
      {!minimal && (
        <div className="flex items-center gap-2">
          <UpdateTitle isRunning={isRunning} title={update.title} />
        </div>
      )}
      <motion.div
        animate={{
          height: "auto",
          opacity: 1,
          transition: {
            height: { duration: 0.2, ease: "easeOut" },
            opacity: { duration: 0.15, delay: 0.05 },
          },
        }}
        exit={{
          height: 0,
          opacity: 0,
          transition: {
            height: { duration: 0.2, ease: "easeIn" },
            opacity: { duration: 0.1 },
          },
        }}
        initial={{ height: 0, opacity: 0 }}
      >
        <div className="space-y-2 py-2 pr-2">
          {update.type === "web" && update.queries && (
            <div className="flex flex-wrap gap-2">
              {update.queries.map((query, idx) => (
                <Badge
                  className="flex items-center gap-1 bg-muted"
                  key={`search-query-${idx}`}
                  variant="outline"
                >
                  <SearchIcon className="size-3.5" />
                  {/* // TODO: Make this size width responsive or accomodate long text in another manner */}
                  <span className="max-w-[300px] truncate">{query}</span>
                </Badge>
              ))}
            </div>
          )}
          {/* Search Results: Show only when completed and results exist */}
          {update.type === "web" &&
            update.status === "completed" &&
            update.results && (
              <div className="flex flex-wrap gap-2">
                {update.type === "web" &&
                  update.results.map((result, idx) => (
                    <WebSourceBadge key={`web-result-${idx}`} result={result} />
                  ))}
              </div>
            )}
          {/* Search Loading State */}
          {update.type === "web" && update.status === "running" && (
            <div className="py-2">
              <div className="flex items-center gap-3">
                <Loader2 className="size-4 animate-spin text-neutral-500" />
                <p className="text-xsize-neutral-500">Searching the web...</p>
              </div>
            </div>
          )}
          {/* {Thoughts} */}
          {update.type === "thoughts" && (
            <div className="space-y-2">
              <p className="font-light text-foreground text-sm">
                {update.message}
              </p>
            </div>
          )}
          {update.type === "writing" && update.message && (
            <div className="space-y-2">
              <p className="font-light text-foreground text-sm">
                {update.message}
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
