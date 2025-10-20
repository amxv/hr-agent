import type { AppModelId } from "../ai/app-models";
import type { ToolName } from "../ai/types";
import type { DBMessage } from "../db/schema";
import { env } from "../env";
import type { UIChat } from "./uiChat";

export type AnonymousSession = {
  id: string;
  remainingCredits: number;
  createdAt: Date;
};

// Anonymous chat structure matching the DB chat structure
export interface AnonymousChat extends UIChat {}

// Anonymous message structure matching the DB message structure
export interface AnonymousMessage extends DBMessage {}

const AVAILABLE_MODELS: AppModelId[] = [
  "google/gemini-2.0-flash",
  "openai/gpt-5-mini",
  "openai/gpt-5-nano",
  "openai/gpt-4o-mini",
  "cohere/command-a",
];

export const ANONYMOUS_LIMITS = {
  CREDITS: env.NEXT_PUBLIC_NODE_ENV === "production" ? 10 : 1000,
  AVAILABLE_MODELS,
  AVAILABLE_TOOLS: ["createDocument", "updateDocument"] satisfies ToolName[],
  SESSION_DURATION: 2_147_483_647, // Max session time
  // Rate limiting for anonymous users based on IP
  RATE_LIMIT: {
    REQUESTS_PER_MINUTE: env.NEXT_PUBLIC_NODE_ENV === "production" ? 5 : 60,
    REQUESTS_PER_MONTH: env.NEXT_PUBLIC_NODE_ENV === "production" ? 10 : 1000, // Same as MAX_MESSAGES
  },
} as const;
