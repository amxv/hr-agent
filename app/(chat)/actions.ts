"use server";

import { generateText } from "ai";
import { DEFAULT_TITLE_MODEL } from "@/lib/ai/app-models";
import { getLanguageModel } from "@/lib/ai/providers";
import type { ChatMessage } from "@/lib/ai/types";

export async function generateTitleFromUserMessage({
  message,
}: {
  message: ChatMessage;
}) {
  const { text: title } = await generateText({
    model: getLanguageModel(DEFAULT_TITLE_MODEL),
    system: `\n
    - you will generate a short title based on the first message a user begins a conversation with
    - ensure it is not more than 80 characters long
    - the title should be a summary of the user's message
    - do not use quotes or colons`,
    prompt: JSON.stringify(message),
    experimental_telemetry: { isEnabled: true },
  });

  return title;
}
