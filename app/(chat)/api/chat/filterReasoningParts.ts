export function filterReasoningParts<T extends { parts: any[] }>(
  messages: T[]
): T[] {
  return messages.map((message) => ({
    ...message,
    parts: message.parts.filter((part) => {
      // Filter out reasoning parts to prevent cross-model compatibility issues
      // https://github.com/vercel/ai/discussions/5480
      return part.type !== "reasoning";
    }),
  }));
}
