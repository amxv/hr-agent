import {
  Edit3,
  GlobeIcon,
  Images,
  type LucideIcon,
  Telescope,
} from "lucide-react";
import type { ToolName, UiToolName } from "@/lib/ai/types";

export type ToolDefinition = {
  name: string;
  description: string;
  icon: LucideIcon;
  key: ToolName;
  shortName: string;
};

export const toolDefinitions: Record<UiToolName, ToolDefinition> = {
  webSearch: {
    key: "webSearch",
    name: "Web Search",
    description: "Search the web for real-time information.",
    icon: GlobeIcon,
    shortName: "Search",
  },
  deepResearch: {
    key: "deepResearch",
    name: "Deep Research",
    description: "Get comprehensive analysis with citations.",
    icon: Telescope,
    shortName: "Research",
  },
  generateImage: {
    key: "generateImage",
    name: "Create an image",
    description: "Generate images from text descriptions.",
    icon: Images,
    shortName: "Image",
  },
  createDocument: {
    key: "createDocument",
    name: "Write or code",
    description: "Create documents, code, or run code in a sandbox.",
    icon: Edit3,
    shortName: "Write",
  },
};

export const enabledTools: UiToolName[] = [
  "webSearch",
  "deepResearch",
  "generateImage",
  "createDocument",
];
