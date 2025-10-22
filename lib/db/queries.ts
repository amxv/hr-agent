import "server-only";
import { del } from "@vercel/blob";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  gte,
  ilike,
  inArray,
  isNull,
  sql,
} from "drizzle-orm";
import type { Attachment } from "@/lib/ai/types";
import type { ArtifactKind } from "../artifacts/artifact-kind";
import { db } from "./client";
import {
  chat,
  type DBMessage,
  document,
  type InsertUploadedDocument,
  message,
  type Suggestion,
  suggestion,
  type UploadedDocument,
  type User,
  uploadedDocument,
  user,
  vectorStoreConfig,
  vote,
} from "./schema";

export async function getUserByEmail(email: string): Promise<User[]> {
  try {
    return await db.select().from(user).where(eq(user.email, email));
  } catch (error) {
    console.error("Failed to get user from database");
    throw error;
  }
}

export async function saveChat({
  id,
  userId,
  title,
}: {
  id: string;
  userId: string;
  title: string;
}) {
  try {
    return await db.insert(chat).values({
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
      userId,
      title,
    });
  } catch (error) {
    console.error("Failed to save chat in database");
    throw error;
  }
}

export async function deleteChatById({ id }: { id: string }) {
  try {
    // Get all messages for this chat to clean up their attachments
    const messagesToDelete = await db
      .select()
      .from(message)
      .where(eq(message.chatId, id));

    // Clean up attachments before deleting the chat (which will cascade delete messages)
    if (messagesToDelete.length > 0) {
      await deleteAttachmentsFromMessages(messagesToDelete);
    }

    return await db.delete(chat).where(eq(chat.id, id));
  } catch (error) {
    console.error("Failed to delete chat by id from database");
    throw error;
  }
}

export async function getChatsByUserId({ id }: { id: string }) {
  try {
    return await db
      .select()
      .from(chat)
      .where(eq(chat.userId, id))
      .orderBy(desc(chat.updatedAt));
  } catch (error) {
    console.error("Failed to get chats by user from database");
    throw error;
  }
}

export async function tryGetChatById({ id }: { id: string }) {
  try {
    const [selectedChat] = await db.select().from(chat).where(eq(chat.id, id));
    return selectedChat;
  } catch (_error) {
    return null;
  }
}

export async function getChatById({ id }: { id: string }) {
  try {
    const [selectedChat] = await db.select().from(chat).where(eq(chat.id, id));
    return selectedChat;
  } catch (error) {
    console.error("Failed to get chat by id from database");
    throw error;
  }
}

export async function saveMessage({ _message }: { _message: DBMessage }) {
  try {
    const result = await db.insert(message).values(_message);

    // Update chat's updatedAt timestamp
    await updateChatUpdatedAt({ chatId: _message.chatId });

    return result;
  } catch (error) {
    console.error("Failed to save message in database", error);
    throw error;
  }
}

// TODO: This should indicate the it's only updating messages for a single chat
export async function saveMessages({ _messages }: { _messages: DBMessage[] }) {
  try {
    if (_messages.length === 0) {
      return;
    }
    const result = await db.insert(message).values(_messages);

    // Update chat's updatedAt timestamp for all affected chats
    const uniqueChatIds = [...new Set(_messages.map((msg) => msg.chatId))];
    await Promise.all(
      uniqueChatIds.map((chatId) => updateChatUpdatedAt({ chatId }))
    );

    return result;
  } catch (error) {
    console.error("Failed to save messages in database", error);
    throw error;
  }
}

export async function updateMessage({ _message }: { _message: DBMessage }) {
  try {
    return await db
      .update(message)
      .set({
        parts: _message.parts,
        annotations: _message.annotations,
        attachments: _message.attachments,
        createdAt: _message.createdAt,
        isPartial: _message.isPartial,
        parentMessageId: _message.parentMessageId,
      })
      .where(eq(message.id, _message.id));
  } catch (error) {
    console.error("Failed to update message in database", error);
    throw error;
  }
}

export async function getAllMessagesByChatId({ chatId }: { chatId: string }) {
  try {
    return await db
      .select()
      .from(message)
      .where(eq(message.chatId, chatId))
      .orderBy(asc(message.createdAt));
  } catch (error) {
    console.error("Failed to get all messages by chat ID", error);
    throw error;
  }
}

export async function voteMessage({
  chatId,
  messageId,
  type,
}: {
  chatId: string;
  messageId: string;
  type: "up" | "down";
}) {
  try {
    const [existingVote] = await db
      .select()
      .from(vote)
      .where(and(eq(vote.messageId, messageId), eq(vote.chatId, chatId)));

    if (existingVote) {
      return await db
        .update(vote)
        .set({ isUpvoted: type === "up" })
        .where(and(eq(vote.messageId, messageId), eq(vote.chatId, chatId)));
    }
    return await db.insert(vote).values({
      chatId,
      messageId,
      isUpvoted: type === "up",
    });
  } catch (error) {
    console.error("Failed to upvote message in database", error);
    throw error;
  }
}

export async function getVotesByChatId({ id }: { id: string }) {
  try {
    return await db.select().from(vote).where(eq(vote.chatId, id));
  } catch (error) {
    console.error("Failed to get votes by chat id from database", error);
    throw error;
  }
}

export async function saveDocument({
  id,
  title,
  kind,
  content,
  userId,
  messageId,
}: {
  id: string;
  title: string;
  kind: ArtifactKind;
  content: string;
  userId: string;
  messageId: string;
}) {
  try {
    return await db.insert(document).values({
      id,
      title,
      kind,
      content,
      userId,
      messageId,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error("Failed to save document in database", error);
    throw error;
  }
}

async function _getDocumentsById({ id }: { id: string }) {
  try {
    const documents = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(asc(document.createdAt));

    return documents;
  } catch (error) {
    console.error("Failed to get document by id from database", error);
    throw error;
  }
}

export async function getDocumentsById({
  id,
  userId,
}: {
  id: string;
  userId?: string;
}) {
  try {
    // First, get the document and check ownership
    const documents = await _getDocumentsById({ id });

    if (documents.length === 0) {
      return [];
    }

    const [doc] = documents;

    if (!userId || doc.userId !== userId) {
      // Need to check if chat is public
      const documentsWithVisibility = await db
        .select({
          id: document.id,
          createdAt: document.createdAt,
          title: document.title,
          content: document.content,
          kind: document.kind,
          userId: document.userId,
          messageId: document.messageId,
          chatVisibility: chat.visibility,
        })
        .from(document)
        .innerJoin(message, eq(document.messageId, message.id))
        .innerJoin(chat, eq(message.chatId, chat.id))
        .where(and(eq(document.id, id), eq(chat.visibility, "public")))
        .orderBy(asc(document.createdAt));

      return documentsWithVisibility;
    }

    return documents;
  } catch (error) {
    console.error(
      "Failed to get documents by id with visibility from database"
    );
    throw error;
  }
}

export async function getPublicDocumentsById({ id }: { id: string }) {
  try {
    const documents = await db
      .select({
        id: document.id,
        createdAt: document.createdAt,
        title: document.title,
        content: document.content,
        kind: document.kind,
        userId: document.userId,
        messageId: document.messageId,
      })
      .from(document)
      .innerJoin(message, eq(document.messageId, message.id))
      .innerJoin(chat, eq(message.chatId, chat.id))
      .where(and(eq(document.id, id), eq(chat.visibility, "public")))
      .orderBy(asc(document.createdAt));

    return documents;
  } catch (error) {
    console.error("Failed to get public documents by id from database");
    throw error;
  }
}

export async function getDocumentById({ id }: { id: string }) {
  try {
    const [selectedDocument] = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(desc(document.createdAt));

    return selectedDocument;
  } catch (error) {
    console.error("Failed to get document by id from database");
    throw error;
  }
}

export async function deleteDocumentsByIdAfterTimestamp({
  id,
  timestamp,
}: {
  id: string;
  timestamp: Date;
}) {
  try {
    await db
      .delete(suggestion)
      .where(
        and(
          eq(suggestion.documentId, id),
          gt(suggestion.documentCreatedAt, timestamp)
        )
      );

    return await db
      .delete(document)
      .where(and(eq(document.id, id), gt(document.createdAt, timestamp)));
  } catch (error) {
    console.error(
      "Failed to delete documents by id after timestamp from database"
    );
    throw error;
  }
}

export async function saveSuggestions({
  suggestions,
}: {
  suggestions: Suggestion[];
}) {
  try {
    return await db.insert(suggestion).values(suggestions);
  } catch (error) {
    console.error("Failed to save suggestions in database");
    throw error;
  }
}

export async function getSuggestionsByDocumentId({
  documentId,
}: {
  documentId: string;
}) {
  try {
    return await db
      .select()
      .from(suggestion)
      .where(and(eq(suggestion.documentId, documentId)));
  } catch (error) {
    console.error(
      "Failed to get suggestions by document version from database"
    );
    throw error;
  }
}

export async function getDocumentsByMessageIds({
  messageIds,
}: {
  messageIds: string[];
}) {
  if (messageIds.length === 0) {
    return [];
  }

  try {
    return await db
      .select()
      .from(document)
      .where(inArray(document.messageId, messageIds))
      .orderBy(asc(document.createdAt));
  } catch (error) {
    console.error("Failed to get documents by message IDs from database");
    throw error;
  }
}

export async function saveDocuments({
  documents,
}: {
  documents: Array<{
    id: string;
    title: string;
    kind: ArtifactKind;
    content: string | null;
    userId: string;
    messageId: string;
    createdAt: Date;
  }>;
}) {
  if (documents.length === 0) {
    return;
  }

  try {
    return await db.insert(document).values(documents);
  } catch (error) {
    console.error("Failed to save documents in database", error);
    throw error;
  }
}

export async function getMessageById({ id }: { id: string }) {
  try {
    return await db.select().from(message).where(eq(message.id, id));
  } catch (error) {
    console.error("Failed to get message by id from database");
    throw error;
  }
}

export async function deleteMessagesByChatIdAfterTimestamp({
  chatId,
  timestamp,
}: {
  chatId: string;
  timestamp: Date;
}) {
  try {
    const messagesToDelete = await db
      .select()
      .from(message)
      .where(
        and(eq(message.chatId, chatId), gte(message.createdAt, timestamp))
      );

    const messageIds = messagesToDelete.map((message) => message.id);

    if (messageIds.length > 0) {
      // Clean up attachments before deleting messages
      await deleteAttachmentsFromMessages(messagesToDelete);

      await db
        .delete(vote)
        .where(
          and(eq(vote.chatId, chatId), inArray(vote.messageId, messageIds))
        );

      return await db
        .delete(message)
        .where(
          and(eq(message.chatId, chatId), inArray(message.id, messageIds))
        );
    }
  } catch (error) {
    console.error(
      "Failed to delete messages by id after timestamp from database"
    );
    throw error;
  }
}

export async function deleteMessagesByChatIdAfterMessageId({
  chatId,
  messageId,
}: {
  chatId: string;
  messageId: string;
}) {
  try {
    // First, get the target message to find its position in the chat
    const [targetMessage] = await db
      .select()
      .from(message)
      .where(and(eq(message.id, messageId), eq(message.chatId, chatId)));

    if (!targetMessage) {
      throw new Error("Target message not found");
    }

    // Get all messages in the chat ordered by creation time
    const allMessages = await db
      .select()
      .from(message)
      .where(eq(message.chatId, chatId))
      .orderBy(asc(message.createdAt));

    // Find the index of the target message
    const targetIndex = allMessages.findIndex((msg) => msg.id === messageId);

    if (targetIndex === -1) {
      throw new Error("Target message not found in chat");
    }

    // Delete all messages after the target message (including the target itself)
    const messagesToDelete = allMessages.slice(targetIndex);
    const messageIdsToDelete = messagesToDelete.map((msg) => msg.id);

    if (messageIdsToDelete.length > 0) {
      // Clean up attachments before deleting messages
      await deleteAttachmentsFromMessages(messagesToDelete);

      // Delete the messages (votes will be deleted automatically via CASCADE)
      return await db
        .delete(message)
        .where(
          and(
            eq(message.chatId, chatId),
            inArray(message.id, messageIdsToDelete)
          )
        );
    }
  } catch (error) {
    console.error(
      "Failed to delete messages by chat id after message id from database"
    );
    throw error;
  }
}

export async function updateChatVisiblityById({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: "private" | "public";
}) {
  try {
    return await db.update(chat).set({ visibility }).where(eq(chat.id, chatId));
  } catch (error) {
    console.error("Failed to update chat visibility in database");
    throw error;
  }
}

export async function updateChatTitleById({
  chatId,
  title,
}: {
  chatId: string;
  title: string;
}) {
  try {
    return await db
      .update(chat)
      .set({
        title,
      })
      .where(eq(chat.id, chatId));
  } catch (error) {
    console.error("Failed to update chat title by id from database");
    throw error;
  }
}

export async function updateChatIsPinnedById({
  chatId,
  isPinned,
}: {
  chatId: string;
  isPinned: boolean;
}) {
  try {
    return await db
      .update(chat)
      .set({
        isPinned,
      })
      .where(eq(chat.id, chatId));
  } catch (error) {
    console.error("Failed to update chat isPinned by id from database");
    throw error;
  }
}

export async function updateChatUpdatedAt({ chatId }: { chatId: string }) {
  try {
    return await db
      .update(chat)
      .set({
        updatedAt: new Date(),
      })
      .where(eq(chat.id, chatId));
  } catch (error) {
    console.error("Failed to update chat updatedAt by id from database");
    throw error;
  }
}

export async function getUserById({
  userId,
}: {
  userId: string;
}): Promise<User | undefined> {
  const users = await db
    .select()
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  return users[0];
}

export async function getMessagesWithAttachments() {
  try {
    return await db.select({ attachments: message.attachments }).from(message);
  } catch (error) {
    console.error(
      "Failed to get messages with attachments from database",
      error
    );
    throw error;
  }
}

export async function getAllAttachmentUrls(): Promise<string[]> {
  try {
    const messages = await getMessagesWithAttachments();

    const attachmentUrls: string[] = [];

    for (const msg of messages) {
      if (msg.attachments && Array.isArray(msg.attachments)) {
        const attachments = msg.attachments as Attachment[];
        for (const attachment of attachments) {
          if (attachment.url) {
            attachmentUrls.push(attachment.url);
          }
        }
      }
    }

    return attachmentUrls;
  } catch (error) {
    console.error("Failed to get attachment URLs from database", error);
    throw error;
  }
}

async function deleteAttachmentsFromMessages(messages: DBMessage[]) {
  try {
    const attachmentUrls: string[] = [];

    for (const msg of messages) {
      if (msg.attachments && Array.isArray(msg.attachments)) {
        const attachments = msg.attachments as Attachment[];
        for (const attachment of attachments) {
          if (attachment.url) {
            attachmentUrls.push(attachment.url);
          }
        }
      }
    }

    if (attachmentUrls.length > 0) {
      await del(attachmentUrls);
    }
  } catch (error) {
    console.error("Failed to delete attachments from Vercel Blob:", error);
    // Don't throw here - we still want to proceed with message deletion
    // even if blob cleanup fails
  }
}

// ============================================================================
// Vector Store Configuration Queries
// ============================================================================

/**
 * Retrieves the shared vector store ID from the singleton configuration table.
 * Returns null if no vector store has been created yet.
 */
export async function getVectorStoreId(): Promise<string | null> {
  try {
    const [config] = await db
      .select()
      .from(vectorStoreConfig)
      .where(eq(vectorStoreConfig.id, "singleton"))
      .limit(1);

    return config?.vectorStoreId || null;
  } catch (error) {
    console.error("Failed to get vector store ID from database");
    throw error;
  }
}

/**
 * Creates or updates the vector store ID in the singleton configuration table.
 * This should be called once when the first vector store is created.
 */
export async function setVectorStoreId(vectorStoreId: string): Promise<void> {
  try {
    await db
      .insert(vectorStoreConfig)
      .values({
        id: "singleton",
        vectorStoreId,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: vectorStoreConfig.id,
        set: {
          vectorStoreId,
          updatedAt: new Date(),
        },
      });
  } catch (error) {
    console.error("Failed to set vector store ID in database");
    throw error;
  }
}

// ============================================================================
// Uploaded Document Queries
// ============================================================================

/**
 * Lists documents with optional filters, pagination, excluding soft-deleted documents
 */
export async function listDocuments(input: {
  searchTerm?: string;
  tags?: string[];
  status?: "uploading" | "processing" | "ready" | "failed";
  limit?: number;
  offset?: number;
}): Promise<{
  documents: UploadedDocument[];
  total: number;
  hasMore: boolean;
}> {
  try {
    const { searchTerm, tags, status, limit = 50, offset = 0 } = input;
    const whereConditions = [];

    // Exclude soft-deleted documents
    whereConditions.push(isNull(uploadedDocument.deletedAt));

    // Search term filter
    if (searchTerm) {
      whereConditions.push(ilike(uploadedDocument.filename, `%${searchTerm}%`));
    }

    // Tags filter using PostgreSQL JSON contains operator
    if (tags && tags.length > 0) {
      whereConditions.push(
        sql`${uploadedDocument.tags}::jsonb @> ${JSON.stringify(tags)}::jsonb`
      );
    }

    // Status filter
    if (status) {
      whereConditions.push(eq(uploadedDocument.status, status));
    }

    // Query documents with filters
    const documents = await db
      .select()
      .from(uploadedDocument)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(desc(uploadedDocument.uploadedAt))
      .limit(limit)
      .offset(offset);

    // Count total with same filters
    const [totalResult] = await db
      .select({ count: count() })
      .from(uploadedDocument)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

    const total = totalResult?.count || 0;

    return {
      documents,
      total,
      hasMore: offset + limit < total,
    };
  } catch (error) {
    console.error("Failed to list documents from database");
    throw error;
  }
}

/**
 * Retrieves a single uploaded document by ID, excluding soft-deleted
 */
export async function getUploadedDocumentById(
  id: string
): Promise<UploadedDocument | null> {
  try {
    const [document] = await db
      .select()
      .from(uploadedDocument)
      .where(
        and(eq(uploadedDocument.id, id), isNull(uploadedDocument.deletedAt))
      )
      .limit(1);

    return document || null;
  } catch (error) {
    console.error("Failed to get uploaded document by id from database");
    throw error;
  }
}

/**
 * Inserts a new document record after successful upload
 */
export async function saveUploadedDocument(
  input: Omit<InsertUploadedDocument, "id" | "uploadedAt" | "updatedAt">
): Promise<UploadedDocument> {
  try {
    const [doc] = await db
      .insert(uploadedDocument)
      .values({
        ...input,
        uploadedAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return doc;
  } catch (error) {
    console.error("Failed to save document in database");
    throw error;
  }
}

/**
 * Updates document processing status and optional error message
 */
export async function updateDocumentStatus(
  id: string,
  status: "uploading" | "processing" | "ready" | "failed",
  errorMessage?: string | null
): Promise<void> {
  try {
    await db
      .update(uploadedDocument)
      .set({
        status,
        errorMessage,
        updatedAt: new Date(),
      })
      .where(eq(uploadedDocument.id, id));
  } catch (error) {
    console.error("Failed to update document status in database");
    throw error;
  }
}

/**
 * Soft deletes a document by setting deletedAt timestamp
 */
export async function softDeleteDocument(id: string): Promise<void> {
  try {
    await db
      .update(uploadedDocument)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(uploadedDocument.id, id));
  } catch (error) {
    console.error("Failed to soft delete document from database");
    throw error;
  }
}

/**
 * Updates the tags array for a document
 */
export async function updateDocumentTags(
  id: string,
  tags: string[]
): Promise<void> {
  try {
    await db
      .update(uploadedDocument)
      .set({
        tags,
        updatedAt: new Date(),
      })
      .where(eq(uploadedDocument.id, id));
  } catch (error) {
    console.error("Failed to update document tags in database");
    throw error;
  }
}

/**
 * Retrieves all unique tags from non-deleted documents for auto-suggest
 */
export async function getAllTags(): Promise<string[]> {
  try {
    const documents = await db
      .select({ tags: uploadedDocument.tags })
      .from(uploadedDocument)
      .where(isNull(uploadedDocument.deletedAt));

    // Flatten arrays and deduplicate
    const allTags = documents.flatMap((d) => (d.tags || []) as string[]);
    const uniqueTags = [...new Set(allTags)];

    return uniqueTags.sort();
  } catch (error) {
    console.error("Failed to get all tags from database");
    throw error;
  }
}
