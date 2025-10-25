import OpenAI from "openai";
import { env } from "@/lib/env";

/**
 * Direct OpenAI client for Files and Vector Store APIs
 *
 * This client is separate from the AI SDK gateway provider and uses
 * the OPENAI_API_KEY environment variable directly for accessing
 * OpenAI's file storage and vector store features.
 */
export const openaiClient = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});
