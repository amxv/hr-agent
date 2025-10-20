import { getAllMessagesByChatId } from "@/lib/db/queries";
import { dbMessageToChatMessage } from "@/lib/message-conversion";
import { buildThreadFromLeaf } from "@/lib/thread-utils";

export async function getThreadUpToMessageId(
  chatId: string,
  messageId: string | null
) {
  if (!messageId) {
    return [];
  }

  const messages = (await getAllMessagesByChatId({ chatId })).map(
    dbMessageToChatMessage
  );

  return buildThreadFromLeaf(messages, messageId);
}
