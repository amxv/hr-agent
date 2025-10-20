import { HydrateClient, prefetch, trpc } from "@/trpc/server";
import { ChatPageRouter } from "../../chat-page-router";

export default async function ChatPageRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: chatId } = await params;

  // Prefetch the queries used in chat-page.tsx
  prefetch(trpc.chat.getChatById.queryOptions({ chatId }));
  prefetch(trpc.chat.getChatMessages.queryOptions({ chatId }));

  return (
    <HydrateClient>
      <ChatPageRouter />
    </HydrateClient>
  );
}
