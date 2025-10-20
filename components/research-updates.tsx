import type React from "react";
import type { WebSearchUpdate } from "@/lib/ai/tools/research-updates-schema";
import { WebToolAction } from "./tool-actions";

// TODO: Make sure these components are used or remove them

// Web updates component
const _WebUpdates: React.FC<{ updates: WebSearchUpdate[] }> = ({ updates }) => (
  <>
    {updates.map((update, updateIndex) => (
      <div className="space-y-2" key={`web-update-${updateIndex}`}>
        {update.results?.map((result, resultIndex) => (
          <WebToolAction
            key={`web-${updateIndex}-${resultIndex}`}
            result={result}
          />
        ))}
      </div>
    ))}
  </>
);
