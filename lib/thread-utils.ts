// Generic message type that works for both DB and anonymous messages
export type MessageNode = {
  id: string;
  metadata?: {
    parentMessageId: string | null;
    createdAt: Date;
  };
  [key: string]: any; // Allow other properties
};

// Get the default leaf (most recent message by timestamp)
export function getDefaultLeafMessage<T extends MessageNode>(
  allMessages: T[]
): T | null {
  if (allMessages.length === 0) {
    return null;
  }

  // Sort by createdAt descending and return the first one
  const sorted = [...allMessages].sort(
    (a, b) =>
      new Date(b.metadata?.createdAt || new Date()).getTime() -
      new Date(a.metadata?.createdAt || new Date()).getTime()
  );

  return sorted[0];
}

// Build thread from leaf message using all messages
export function buildThreadFromLeaf<T extends MessageNode>(
  allMessages: T[],
  leafMessageId: string
): T[] {
  const messageMap = new Map<string, T>();
  allMessages.forEach((msg) => messageMap.set(msg.id, msg));

  const thread: T[] = [];
  let currentMessageId: string | null = leafMessageId;
  let iteration = 0;

  while (currentMessageId) {
    iteration++;

    if (iteration > 100) {
      break;
    }

    const currentMessage = messageMap.get(currentMessageId);
    if (!currentMessage) {
      break;
    }

    thread.unshift(currentMessage);

    // Check for self-reference
    if (currentMessage.metadata?.parentMessageId === currentMessage.id) {
      console.error(
        "[buildThreadFromLeaf] SELF-REFERENCE DETECTED for message:",
        currentMessage.id
      );
      break;
    }

    currentMessageId = currentMessage.metadata?.parentMessageId || null;
  }

  return thread;
}

// Get default thread (combination of the above two)
export function getDefaultThread<T extends MessageNode>(allMessages: T[]): T[] {
  const defaultLeaf = getDefaultLeafMessage(allMessages);
  if (!defaultLeaf) {
    return [];
  }

  return buildThreadFromLeaf(allMessages, defaultLeaf.id);
}

export function findLeafDfsToRightFromMessageId<T extends MessageNode>(
  childrenMapSorted: Map<string | null, T[]>,
  messageId: string
): T | null {
  const children = childrenMapSorted.get(messageId);
  if (!children || children.length === 0) {
    return null;
  }

  const rightmostChild = children.at(-1);

  if (!rightmostChild) {
    return null;
  }

  const leaf = findLeafDfsToRightFromMessageId(
    childrenMapSorted,
    rightmostChild.id
  );
  return leaf || rightmostChild;
}
