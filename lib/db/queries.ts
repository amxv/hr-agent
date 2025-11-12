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
  ne,
  or,
  sql,
} from "drizzle-orm";
import type { Attachment } from "@/lib/ai/types";
import type { ArtifactKind } from "../artifacts/artifact-kind";
import { db } from "./client";
import {
  absence,
  benefitsEnrollment,
  benefitsPlan,
  blackoutDate,
  caseUpdate,
  chat,
  type DBMessage,
  dependent,
  document,
  employee,
  enrollmentPeriod,
  hrCase,
  type InsertAbsence,
  type InsertBenefitsEnrollment,
  type InsertBenefitsPlan,
  type InsertBlackoutDate,
  type InsertCaseUpdate,
  type InsertDependent,
  type InsertEmployee,
  type InsertEnrollmentPeriod,
  type InsertHRCase,
  type InsertLeaveBalance,
  type InsertLeavePolicy,
  type InsertLeaveRequest,
  type InsertUploadedDocument,
  leaveBalance,
  leavePolicy,
  leaveRequest,
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

export const DOCUMENT_PROCESSING_TIMEOUT_MESSAGE =
  "Processing timeout - exceeded maximum polling attempts";

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

export async function getDocumentsRequiringStatusRefresh(): Promise<
  UploadedDocument[]
> {
  try {
    return await db
      .select()
      .from(uploadedDocument)
      .where(
        and(
          isNull(uploadedDocument.deletedAt),
          or(
            eq(uploadedDocument.status, "processing"),
            and(
              eq(uploadedDocument.status, "failed"),
              eq(
                uploadedDocument.errorMessage,
                DOCUMENT_PROCESSING_TIMEOUT_MESSAGE
              )
            )
          )
        )
      )
      .orderBy(desc(uploadedDocument.uploadedAt));
  } catch (error) {
    console.error(
      "Failed to get documents requiring status refresh from database"
    );
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

/**
 * Retrieves an uploaded document by OpenAI file ID.
 * Used by semantic search tool to map file citations to documents.
 *
 * @param openaiFileId - The OpenAI file ID
 * @returns The document or null if not found
 */
export async function getUploadedDocumentByOpenAIFileId(
  openaiFileId: string
): Promise<UploadedDocument | null> {
  try {
    const [document] = await db
      .select()
      .from(uploadedDocument)
      .where(
        and(
          eq(uploadedDocument.openaiFileId, openaiFileId),
          isNull(uploadedDocument.deletedAt)
        )
      )
      .limit(1);

    return document || null;
  } catch (error) {
    console.error("Failed to get uploaded document by OpenAI file ID");
    throw error;
  }
}

// ============================================================================
// HR Data Management - Employee Queries
// ============================================================================

/**
 * Lists employees with optional search and filters
 */
export async function listEmployees(params?: {
  searchField?: "fullName" | "email" | "employeeId" | "department";
  searchValue?: string;
  employmentStatus?: string;
  department?: string;
  limit?: number;
  offset?: number;
}): Promise<{
  employees: Array<{
    id: string;
    employeeId: string;
    fullName: string;
    email: string;
    jobTitle: string;
    department: string;
    employmentStatus: string;
    location: string;
    workMode: string;
    manager: { id: string; fullName: string; jobTitle: string } | null;
  }>;
  total: number;
}> {
  const limit = params?.limit ?? 50;
  const offset = params?.offset ?? 0;
  const whereConditions = [];

  // Apply search filter
  if (params?.searchValue && params.searchField) {
    if (params.searchField === "fullName") {
      whereConditions.push(ilike(employee.fullName, `%${params.searchValue}%`));
    } else if (params.searchField === "email") {
      whereConditions.push(ilike(employee.email, `%${params.searchValue}%`));
    } else if (params.searchField === "employeeId") {
      whereConditions.push(
        ilike(employee.employeeId, `%${params.searchValue}%`)
      );
    } else if (params.searchField === "department") {
      whereConditions.push(
        ilike(employee.department, `%${params.searchValue}%`)
      );
    }
  }

  // Apply employment status filter
  if (params?.employmentStatus) {
    whereConditions.push(
      sql`${employee.employmentStatus} = ${params.employmentStatus}`
    );
  } else {
    // Exclude terminated employees by default
    whereConditions.push(sql`${employee.employmentStatus} != 'terminated'`);
  }

  // Apply department filter
  if (params?.department) {
    whereConditions.push(eq(employee.department, params.department));
  }

  // Query employees
  const employees = await db
    .select({
      id: employee.id,
      employeeId: employee.employeeId,
      fullName: employee.fullName,
      email: employee.email,
      jobTitle: employee.jobTitle,
      department: employee.department,
      employmentStatus: employee.employmentStatus,
      location: employee.location,
      workMode: employee.workMode,
      managerId: employee.managerId,
      managerFullName: sql<string | null>`manager.full_name`,
      managerJobTitle: sql<string | null>`manager.job_title`,
    })
    .from(employee)
    .leftJoin(
      sql`${employee} AS manager`,
      sql`manager.id = ${employee.managerId}`
    )
    .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
    .limit(limit)
    .offset(offset);

  // Query total count
  const [totalResult] = await db
    .select({ count: count() })
    .from(employee)
    .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

  return {
    employees: employees.map((e) => ({
      id: e.id,
      employeeId: e.employeeId,
      fullName: e.fullName,
      email: e.email,
      jobTitle: e.jobTitle,
      department: e.department,
      employmentStatus: e.employmentStatus,
      location: e.location,
      workMode: e.workMode,
      manager:
        e.managerId && e.managerFullName && e.managerJobTitle
          ? {
              id: e.managerId,
              fullName: e.managerFullName,
              jobTitle: e.managerJobTitle,
            }
          : null,
    })),
    total: totalResult?.count ?? 0,
  };
}

/**
 * Gets single employee by ID with manager and direct reports details
 */
export async function getEmployeeById(id: string) {
  const [emp] = await db
    .select()
    .from(employee)
    .where(eq(employee.id, id))
    .limit(1);

  if (!emp) {
    return null;
  }

  // Get manager details if exists
  let manager = null;
  if (emp.managerId) {
    const [mgr] = await db
      .select({
        id: employee.id,
        fullName: employee.fullName,
        jobTitle: employee.jobTitle,
      })
      .from(employee)
      .where(eq(employee.id, emp.managerId))
      .limit(1);
    manager = mgr || null;
  }

  // Get direct reports if exists
  let directReportsData: Array<{
    id: string;
    fullName: string;
    jobTitle: string;
  }> = [];
  if (emp.directReports && Array.isArray(emp.directReports)) {
    const reportIds = emp.directReports as string[];
    if (reportIds.length > 0) {
      directReportsData = await db
        .select({
          id: employee.id,
          fullName: employee.fullName,
          jobTitle: employee.jobTitle,
        })
        .from(employee)
        .where(inArray(employee.id, reportIds));
    }
  }

  return {
    ...emp,
    manager,
    directReportsData,
  };
}

/**
 * Gets employee by employeeId (business identifier like "EMP001")
 */
export async function getEmployeeByEmployeeId(employeeId: string) {
  const [emp] = await db
    .select()
    .from(employee)
    .where(eq(employee.employeeId, employeeId))
    .limit(1);

  if (!emp) {
    return null;
  }

  return getEmployeeById(emp.id);
}

/**
 * Creates new employee record
 */
export async function createEmployee(data: InsertEmployee) {
  // Validate email uniqueness
  const [existingEmailEmployee] = await db
    .select({ id: employee.id })
    .from(employee)
    .where(eq(employee.email, data.email))
    .limit(1);

  if (existingEmailEmployee) {
    throw new Error(
      `An employee with email address "${data.email}" already exists. Please use a different email address.`
    );
  }

  // Validate employeeId uniqueness
  const [existingEmployeeId] = await db
    .select({ id: employee.id })
    .from(employee)
    .where(eq(employee.employeeId, data.employeeId))
    .limit(1);

  if (existingEmployeeId) {
    throw new Error(
      `An employee with ID "${data.employeeId}" already exists. Please use a different employee ID.`
    );
  }

  const [newEmployee] = await db.insert(employee).values(data).returning();
  return newEmployee;
}

/**
 * Updates employee record
 */
export async function updateEmployee(
  id: string,
  data: Partial<InsertEmployee>,
  updatedBy: string
) {
  // Validate email uniqueness (if email is being updated)
  if (data.email) {
    const [existingEmailEmployee] = await db
      .select({ id: employee.id })
      .from(employee)
      .where(and(eq(employee.email, data.email), ne(employee.id, id)))
      .limit(1);

    if (existingEmailEmployee) {
      throw new Error(
        `An employee with email address "${data.email}" already exists. Please use a different email address.`
      );
    }
  }

  // Validate employeeId uniqueness (if employeeId is being updated)
  if (data.employeeId) {
    const [existingEmployeeId] = await db
      .select({ id: employee.id })
      .from(employee)
      .where(and(eq(employee.employeeId, data.employeeId), ne(employee.id, id)))
      .limit(1);

    if (existingEmployeeId) {
      throw new Error(
        `An employee with ID "${data.employeeId}" already exists. Please use a different employee ID.`
      );
    }
  }

  const [updated] = await db
    .update(employee)
    .set({
      ...data,
      updatedBy,
      updatedAt: new Date(),
    })
    .where(eq(employee.id, id))
    .returning();
  return updated;
}

/**
 * Soft deletes employee by setting employmentStatus to "terminated"
 */
export async function softDeleteEmployee(
  id: string,
  updatedBy: string
): Promise<void> {
  await db
    .update(employee)
    .set({
      employmentStatus: "terminated",
      updatedBy,
      updatedAt: new Date(),
    })
    .where(eq(employee.id, id));
}

// ============================================================================
// HR Data Management - Leave Balance Queries
// ============================================================================

/**
 * Lists leave balances with optional filters
 */
export async function listLeaveBalances(params?: {
  employeeId?: string;
  leaveType?: string;
  department?: string;
  limit?: number;
  offset?: number;
}) {
  const limit = params?.limit ?? 50;
  const offset = params?.offset ?? 0;
  const whereConditions = [];

  if (params?.employeeId) {
    whereConditions.push(eq(leaveBalance.employeeId, params.employeeId));
  }

  if (params?.leaveType) {
    whereConditions.push(sql`${leaveBalance.leaveType} = ${params.leaveType}`);
  }

  // Join with employee for department filter
  const balances = await db
    .select({
      leaveBalance,
      employee: {
        id: employee.id,
        fullName: employee.fullName,
        department: employee.department,
      },
    })
    .from(leaveBalance)
    .innerJoin(employee, eq(leaveBalance.employeeId, employee.id))
    .where(
      and(
        whereConditions.length > 0 ? and(...whereConditions) : undefined,
        params?.department
          ? eq(employee.department, params.department)
          : undefined
      )
    )
    .limit(limit)
    .offset(offset);

  const [totalResult] = await db
    .select({ count: count() })
    .from(leaveBalance)
    .innerJoin(employee, eq(leaveBalance.employeeId, employee.id))
    .where(
      and(
        whereConditions.length > 0 ? and(...whereConditions) : undefined,
        params?.department
          ? eq(employee.department, params.department)
          : undefined
      )
    );

  return {
    balances,
    total: totalResult?.count ?? 0,
  };
}

/**
 * Gets all leave balances for a specific employee
 */
export async function getLeaveBalancesByEmployeeId(employeeId: string) {
  return db
    .select()
    .from(leaveBalance)
    .where(eq(leaveBalance.employeeId, employeeId));
}

/**
 * Updates a specific leave balance for an employee
 */
export async function updateLeaveBalance(
  employeeId: string,
  leaveType: string,
  data: Partial<InsertLeaveBalance>,
  updatedBy: string
) {
  const [updated] = await db
    .update(leaveBalance)
    .set({
      ...data,
      updatedBy,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(leaveBalance.employeeId, employeeId),
        sql`${leaveBalance.leaveType} = ${leaveType}`
      )
    )
    .returning();
  return updated;
}

/**
 * Lists blackout dates with optional filters
 */
export async function listBlackoutDates(params?: {
  department?: string;
  startDate?: Date;
}) {
  const whereConditions = [];

  if (params?.department) {
    whereConditions.push(
      or(
        eq(blackoutDate.department, params.department),
        isNull(blackoutDate.department)
      )
    );
  }

  if (params?.startDate) {
    whereConditions.push(
      gte(blackoutDate.endDate, params.startDate.toISOString())
    );
  }

  return db
    .select()
    .from(blackoutDate)
    .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
    .orderBy(asc(blackoutDate.startDate));
}

/**
 * Creates new blackout date
 */
export async function createBlackoutDate(data: InsertBlackoutDate) {
  const [created] = await db.insert(blackoutDate).values(data).returning();
  return created;
}

/**
 * Deletes blackout date
 */
export async function deleteBlackoutDate(id: string): Promise<void> {
  await db.delete(blackoutDate).where(eq(blackoutDate.id, id));
}

/**
 * Gets leave policy for department or global
 */
export async function getLeavePolicy(department?: string) {
  const [policy] = await db
    .select()
    .from(leavePolicy)
    .where(
      department
        ? eq(leavePolicy.department, department)
        : isNull(leavePolicy.department)
    )
    .limit(1);
  return policy || null;
}

// ============================================================================
// HR Data Management - Benefits Queries
// ============================================================================

/**
 * Lists benefits plans with optional filters
 */
export async function listBenefitsPlans(params?: {
  category?: string;
  limit?: number;
  offset?: number;
}) {
  const limit = params?.limit ?? 50;
  const offset = params?.offset ?? 0;
  const whereConditions = [];

  if (params?.category) {
    whereConditions.push(sql`${benefitsPlan.category} = ${params.category}`);
  }

  const plans = await db
    .select()
    .from(benefitsPlan)
    .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
    .limit(limit)
    .offset(offset);

  const [totalResult] = await db
    .select({ count: count() })
    .from(benefitsPlan)
    .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

  // Calculate enrollment count for each plan
  const plansWithEnrollmentCount = await Promise.all(
    plans.map(async (plan) => {
      // Count enrollments where this plan is selected for any benefit type
      const [enrollmentCountResult] = await db
        .select({ count: count() })
        .from(benefitsEnrollment)
        .where(
          or(
            eq(benefitsEnrollment.medicalPlanId, plan.id),
            eq(benefitsEnrollment.dentalPlanId, plan.id),
            eq(benefitsEnrollment.visionPlanId, plan.id),
            eq(benefitsEnrollment.retirementPlanId, plan.id)
          )
        );

      return {
        ...plan,
        enrollmentCount: enrollmentCountResult?.count ?? 0,
      };
    })
  );

  return {
    plans: plansWithEnrollmentCount,
    total: totalResult?.count ?? 0,
  };
}

/**
 * Gets single benefits plan by ID
 */
export async function getBenefitsPlanById(id: string) {
  const [plan] = await db
    .select()
    .from(benefitsPlan)
    .where(eq(benefitsPlan.id, id))
    .limit(1);
  return plan || null;
}

/**
 * Creates new benefits plan
 */
export async function createBenefitsPlan(data: InsertBenefitsPlan) {
  // Validate planId uniqueness
  const [existingPlanId] = await db
    .select({ id: benefitsPlan.id })
    .from(benefitsPlan)
    .where(eq(benefitsPlan.planId, data.planId))
    .limit(1);

  if (existingPlanId) {
    throw new Error(
      `A benefits plan with ID "${data.planId}" already exists. Please use a different plan ID.`
    );
  }

  const [created] = await db.insert(benefitsPlan).values(data).returning();
  return created;
}

/**
 * Updates benefits plan
 */
export async function updateBenefitsPlan(
  id: string,
  data: Partial<InsertBenefitsPlan>,
  updatedBy: string
) {
  // Validate planId uniqueness (if planId is being updated)
  if (data.planId) {
    const [existingPlanId] = await db
      .select({ id: benefitsPlan.id })
      .from(benefitsPlan)
      .where(and(eq(benefitsPlan.planId, data.planId), ne(benefitsPlan.id, id)))
      .limit(1);

    if (existingPlanId) {
      throw new Error(
        `A benefits plan with ID "${data.planId}" already exists. Please use a different plan ID.`
      );
    }
  }

  const [updated] = await db
    .update(benefitsPlan)
    .set({
      ...data,
      updatedBy,
      updatedAt: new Date(),
    })
    .where(eq(benefitsPlan.id, id))
    .returning();
  return updated;
}

/**
 * Deletes benefits plan
 */
export async function deleteBenefitsPlan(id: string): Promise<void> {
  await db.delete(benefitsPlan).where(eq(benefitsPlan.id, id));
}

/**
 * Lists benefits enrollments with optional filters
 */
export async function listEnrollments(params?: {
  employeeId?: string;
  limit?: number;
  offset?: number;
}) {
  const limit = params?.limit ?? 50;
  const offset = params?.offset ?? 0;
  const whereConditions = [];

  if (params?.employeeId) {
    whereConditions.push(eq(benefitsEnrollment.employeeId, params.employeeId));
  }

  // Query enrollments with all plan details
  const enrollmentsRaw = await db
    .select({
      enrollment: benefitsEnrollment,
      employee: {
        id: employee.id,
        fullName: employee.fullName,
        email: employee.email,
        department: employee.department,
      },
      medicalPlan: benefitsPlan,
      dentalPlan: sql`NULL`.as("dental_plan"),
      visionPlan: sql`NULL`.as("vision_plan"),
    })
    .from(benefitsEnrollment)
    .innerJoin(employee, eq(benefitsEnrollment.employeeId, employee.id))
    .leftJoin(
      benefitsPlan,
      eq(benefitsEnrollment.medicalPlanId, benefitsPlan.id)
    )
    .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
    .limit(limit)
    .offset(offset);

  // Fetch additional plan details and dependents for each enrollment
  const enrollments = await Promise.all(
    enrollmentsRaw.map(async (row) => {
      const [dentalPlan, visionPlan] = await Promise.all([
        row.enrollment.dentalPlanId
          ? db
              .select()
              .from(benefitsPlan)
              .where(eq(benefitsPlan.id, row.enrollment.dentalPlanId))
              .limit(1)
              .then((plans) => plans[0] || null)
          : null,
        row.enrollment.visionPlanId
          ? db
              .select()
              .from(benefitsPlan)
              .where(eq(benefitsPlan.id, row.enrollment.visionPlanId))
              .limit(1)
              .then((plans) => plans[0] || null)
          : null,
      ]);

      const dependents = await db
        .select()
        .from(dependent)
        .where(eq(dependent.employeeId, row.employee.id));

      return {
        enrollment: row.enrollment,
        employee: row.employee,
        medicalPlan: row.medicalPlan,
        dentalPlan,
        visionPlan,
        dependents,
      };
    })
  );

  const [totalResult] = await db
    .select({ count: count() })
    .from(benefitsEnrollment)
    .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

  return {
    enrollments,
    total: totalResult?.count ?? 0,
  };
}

/**
 * Gets enrollment for specific employee with all plan details
 */
export async function getEnrollmentByEmployeeId(employeeId: string) {
  const [enrollment] = await db
    .select()
    .from(benefitsEnrollment)
    .where(eq(benefitsEnrollment.employeeId, employeeId))
    .limit(1);

  return enrollment || null;
}

/**
 * Creates or updates enrollment (upsert on employeeId)
 */
export async function upsertEnrollment(
  data: InsertBenefitsEnrollment,
  updatedBy: string
) {
  const [result] = await db
    .insert(benefitsEnrollment)
    .values({
      ...data,
      updatedBy,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: benefitsEnrollment.employeeId,
      set: {
        ...data,
        updatedBy,
        updatedAt: new Date(),
      },
    })
    .returning();
  return result;
}

/**
 * Lists all dependents for an employee
 */
export async function listDependents(employeeId: string) {
  return db
    .select()
    .from(dependent)
    .where(eq(dependent.employeeId, employeeId));
}

/**
 * Creates new dependent record
 */
export async function createDependent(data: InsertDependent) {
  const [created] = await db.insert(dependent).values(data).returning();
  return created;
}

/**
 * Updates dependent record
 */
export async function updateDependent(
  id: string,
  data: Partial<InsertDependent>,
  updatedBy: string
) {
  const [updated] = await db
    .update(dependent)
    .set({
      ...data,
      updatedBy,
      updatedAt: new Date(),
    })
    .where(eq(dependent.id, id))
    .returning();
  return updated;
}

/**
 * Deletes dependent
 */
export async function deleteDependent(id: string): Promise<void> {
  await db.delete(dependent).where(eq(dependent.id, id));
}

/**
 * Gets current or next enrollment period
 */
export async function getCurrentEnrollmentPeriod() {
  const today = new Date().toISOString();
  const [period] = await db
    .select()
    .from(enrollmentPeriod)
    .where(sql`${enrollmentPeriod.openEnrollmentEnd} >= ${today}`)
    .orderBy(asc(enrollmentPeriod.openEnrollmentStart))
    .limit(1);
  return period || null;
}

// ============================================================================
// HR Data Management - HR Cases Queries
// ============================================================================

/**
 * Lists HR cases with optional filters
 */
export async function listHRCases(params?: {
  status?: string;
  category?: string;
  assignedTeam?: string;
  submittedBy?: string;
  limit?: number;
  offset?: number;
}) {
  const limit = params?.limit ?? 50;
  const offset = params?.offset ?? 0;
  const whereConditions = [];

  if (params?.status) {
    whereConditions.push(sql`${hrCase.status} = ${params.status}`);
  }

  if (params?.category) {
    whereConditions.push(sql`${hrCase.category} = ${params.category}`);
  }

  if (params?.assignedTeam) {
    whereConditions.push(eq(hrCase.assignedTeam, params.assignedTeam));
  }

  if (params?.submittedBy) {
    whereConditions.push(eq(hrCase.submittedBy, params.submittedBy));
  }

  const cases = await db
    .select()
    .from(hrCase)
    .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
    .orderBy(desc(hrCase.createdAt))
    .limit(limit)
    .offset(offset);

  const [totalResult] = await db
    .select({ count: count() })
    .from(hrCase)
    .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

  return {
    cases,
    total: totalResult?.count ?? 0,
  };
}

/**
 * Gets single HR case with full update timeline
 */
export async function getHRCaseById(id: string) {
  const [caseRecord] = await db
    .select()
    .from(hrCase)
    .where(eq(hrCase.id, id))
    .limit(1);

  if (!caseRecord) {
    return null;
  }

  // Get updates
  const updates = await db
    .select()
    .from(caseUpdate)
    .where(eq(caseUpdate.caseId, id))
    .orderBy(asc(caseUpdate.timestamp));

  return {
    ...caseRecord,
    updates,
  };
}

/**
 * Gets HR case by caseId (business identifier like "HR-2025-001234")
 */
export async function getHRCaseByCaseId(caseId: string) {
  const [caseRecord] = await db
    .select()
    .from(hrCase)
    .where(eq(hrCase.caseId, caseId))
    .limit(1);

  if (!caseRecord) {
    return null;
  }

  return getHRCaseById(caseRecord.id);
}

/**
 * Creates new HR case
 */
export async function createHRCase(
  data: Omit<InsertHRCase, "caseId" | "firstResponseDue" | "resolutionDue">,
  createdBy: string
) {
  const { generateCaseId, calculateSLA } = await import("@/lib/hr/helpers");

  // Generate case ID
  const caseId = await generateCaseId();

  // Calculate SLA
  const createdAt = new Date();
  const sla = calculateSLA(createdAt, data.category);

  // Create case
  const [newCase] = await db
    .insert(hrCase)
    .values({
      ...data,
      caseId,
      firstResponseDue: sla.firstResponseDue,
      resolutionDue: sla.resolutionDue,
      slaHoursRemaining: sla.slaHoursRemaining.toFixed(2),
      createdBy,
      updatedBy: createdBy,
      createdAt,
      updatedAt: createdAt,
    })
    .returning();

  // Create initial system update
  await db.insert(caseUpdate).values({
    caseId: newCase.id,
    author: "System",
    type: "system",
    message: `Case created and assigned to ${data.assignedTeam} team`,
    visibility: "public",
    timestamp: createdAt,
  });

  return newCase;
}

/**
 * Updates HR case
 */
export async function updateHRCase(
  id: string,
  data: Partial<InsertHRCase>,
  updatedBy: string
) {
  // Get current case to check for status changes
  const [current] = await db
    .select()
    .from(hrCase)
    .where(eq(hrCase.id, id))
    .limit(1);

  if (!current) {
    throw new Error("Case not found");
  }

  // Check if status changed
  if (data.status && data.status !== current.status) {
    // Create status change update
    await db.insert(caseUpdate).values({
      caseId: id,
      author: "System",
      type: "status_change",
      message: `Status changed from ${current.status} to ${data.status}`,
      visibility: "public",
      timestamp: new Date(),
    });
  }

  // Update case
  const [updated] = await db
    .update(hrCase)
    .set({
      ...data,
      updatedBy,
      updatedAt: new Date(),
    })
    .where(eq(hrCase.id, id))
    .returning();

  // Recalculate SLA status
  const { updateSLAStatus } = await import("@/lib/hr/helpers");
  await updateSLAStatus(id);

  return updated;
}

/**
 * Deletes HR case
 */
export async function deleteHRCase(id: string): Promise<void> {
  await db.delete(hrCase).where(eq(hrCase.id, id));
}

/**
 * Adds update to case timeline
 */
export async function addCaseUpdate(
  caseId: string,
  update: InsertCaseUpdate,
  createdBy: string
) {
  const [newUpdate] = await db
    .insert(caseUpdate)
    .values({
      ...update,
      caseId,
      createdBy,
      timestamp: new Date(),
    })
    .returning();

  // If this is an hr_response and firstResponseMet is false, update the case
  if (update.type === "hr_response") {
    const [caseRecord] = await db
      .select()
      .from(hrCase)
      .where(eq(hrCase.id, caseId))
      .limit(1);

    if (caseRecord && !caseRecord.firstResponseMet) {
      await db
        .update(hrCase)
        .set({
          firstResponseMet: true,
          updatedAt: new Date(),
        })
        .where(eq(hrCase.id, caseId));
    }
  }

  return newUpdate;
}

// ============================================================================
// HR Data Management - Team Availability Queries
// ============================================================================

/**
 * Lists absences with optional filters
 */
export async function listAbsences(params?: {
  employeeId?: string;
  department?: string;
  startDate?: Date;
  endDate?: Date;
  absenceType?: string;
  limit?: number;
  offset?: number;
}) {
  const limit = params?.limit ?? 50;
  const offset = params?.offset ?? 0;
  const whereConditions = [];

  if (params?.employeeId) {
    whereConditions.push(eq(absence.employeeId, params.employeeId));
  }

  if (params?.startDate) {
    whereConditions.push(gte(absence.endDate, params.startDate.toISOString()));
  }

  if (params?.endDate) {
    whereConditions.push(
      sql`${absence.startDate} <= ${params.endDate.toISOString()}`
    );
  }

  if (params?.absenceType) {
    whereConditions.push(sql`${absence.absenceType} = ${params.absenceType}`);
  }

  const absences = await db
    .select({
      absence,
      employee: {
        id: employee.id,
        fullName: employee.fullName,
        jobTitle: employee.jobTitle,
        department: employee.department,
      },
    })
    .from(absence)
    .innerJoin(employee, eq(absence.employeeId, employee.id))
    .where(
      and(
        whereConditions.length > 0 ? and(...whereConditions) : undefined,
        params?.department
          ? eq(employee.department, params.department)
          : undefined
      )
    )
    .orderBy(desc(absence.startDate))
    .limit(limit)
    .offset(offset);

  const [totalResult] = await db
    .select({ count: count() })
    .from(absence)
    .innerJoin(employee, eq(absence.employeeId, employee.id))
    .where(
      and(
        whereConditions.length > 0 ? and(...whereConditions) : undefined,
        params?.department
          ? eq(employee.department, params.department)
          : undefined
      )
    );

  return {
    absences,
    total: totalResult?.count ?? 0,
  };
}

/**
 * Gets single absence with employee details
 */
export async function getAbsenceById(id: string) {
  const [record] = await db
    .select({
      absence,
      employee: {
        id: employee.id,
        fullName: employee.fullName,
        jobTitle: employee.jobTitle,
      },
    })
    .from(absence)
    .innerJoin(employee, eq(absence.employeeId, employee.id))
    .where(eq(absence.id, id))
    .limit(1);

  return record || null;
}

/**
 * Creates new absence record
 */
export async function createAbsence(data: InsertAbsence) {
  const { calculateBusinessDays } = await import("@/lib/hr/helpers");

  // Calculate total days
  const totalDays = calculateBusinessDays(
    new Date(data.startDate),
    new Date(data.endDate)
  );

  const [created] = await db
    .insert(absence)
    .values({
      ...data,
      totalDays: totalDays.toString(),
    })
    .returning();
  return created;
}

/**
 * Updates absence record
 */
export async function updateAbsence(id: string, data: Partial<InsertAbsence>) {
  // Recalculate totalDays if dates changed
  if (data.startDate || data.endDate) {
    const [current] = await db
      .select()
      .from(absence)
      .where(eq(absence.id, id))
      .limit(1);

    if (current) {
      const { calculateBusinessDays } = await import("@/lib/hr/helpers");
      const startDate = data.startDate
        ? new Date(data.startDate)
        : new Date(current.startDate);
      const endDate = data.endDate
        ? new Date(data.endDate)
        : new Date(current.endDate);

      const totalDays = calculateBusinessDays(startDate, endDate);
      data.totalDays = totalDays.toString();
    }
  }

  const [updated] = await db
    .update(absence)
    .set(data)
    .where(eq(absence.id, id))
    .returning();
  return updated;
}

/**
 * Deletes absence
 */
export async function deleteAbsence(id: string): Promise<void> {
  await db.delete(absence).where(eq(absence.id, id));
}

/**
 * Lists leave requests with optional filters
 */
export async function listLeaveRequests(params?: {
  employeeId?: string;
  status?: string;
  department?: string;
  limit?: number;
  offset?: number;
}) {
  const limit = params?.limit ?? 50;
  const offset = params?.offset ?? 0;
  const whereConditions = [];

  if (params?.employeeId) {
    whereConditions.push(eq(leaveRequest.employeeId, params.employeeId));
  }

  if (params?.status) {
    whereConditions.push(sql`${leaveRequest.status} = ${params.status}`);
  }

  const requests = await db
    .select({
      request: leaveRequest,
      employee: {
        id: employee.id,
        fullName: employee.fullName,
        department: employee.department,
      },
    })
    .from(leaveRequest)
    .innerJoin(employee, eq(leaveRequest.employeeId, employee.id))
    .where(
      and(
        whereConditions.length > 0 ? and(...whereConditions) : undefined,
        params?.department
          ? eq(employee.department, params.department)
          : undefined
      )
    )
    .orderBy(desc(leaveRequest.submittedDate))
    .limit(limit)
    .offset(offset);

  const [totalResult] = await db
    .select({ count: count() })
    .from(leaveRequest)
    .innerJoin(employee, eq(leaveRequest.employeeId, employee.id))
    .where(
      and(
        whereConditions.length > 0 ? and(...whereConditions) : undefined,
        params?.department
          ? eq(employee.department, params.department)
          : undefined
      )
    );

  return {
    requests,
    total: totalResult?.count ?? 0,
  };
}

/**
 * Gets single leave request with details
 */
export async function getLeaveRequestById(id: string) {
  const [record] = await db
    .select()
    .from(leaveRequest)
    .where(eq(leaveRequest.id, id))
    .limit(1);

  return record || null;
}

/**
 * Creates new leave request
 */
export async function createLeaveRequest(
  data: Omit<
    InsertLeaveRequest,
    "requestId" | "totalDaysRequested" | "createdBy"
  >,
  createdBy: string
) {
  const {
    generateRequestId,
    calculateBusinessDays,
    detectConflicts,
    calculateCoveragePercent,
  } = await import("@/lib/hr/helpers");

  // Generate request ID
  const requestId = await generateRequestId();

  // Calculate total days
  const totalDays = calculateBusinessDays(
    new Date(data.requestedStartDate),
    new Date(data.requestedEndDate)
  );

  // Get employee department for coverage calculation
  const [requestingEmployee] = await db
    .select({ department: employee.department })
    .from(employee)
    .where(eq(employee.id, data.employeeId))
    .limit(1);

  // Detect conflicts
  const existingAbsences = await db
    .select({
      employeeId: absence.employeeId,
      startDate: absence.startDate,
      endDate: absence.endDate,
    })
    .from(absence);

  const conflicts = detectConflicts(
    data.employeeId,
    new Date(data.requestedStartDate),
    new Date(data.requestedEndDate),
    existingAbsences.map((a) => ({
      employeeId: a.employeeId,
      startDate: new Date(a.startDate),
      endDate: new Date(a.endDate),
    }))
  );

  // Calculate coverage impact
  let coveragePercent: number | null = null;
  if (requestingEmployee) {
    const teamMembers = await db
      .select()
      .from(employee)
      .where(eq(employee.department, requestingEmployee.department));

    coveragePercent = calculateCoveragePercent(
      teamMembers.length,
      existingAbsences.map((a) => ({
        startDate: new Date(a.startDate),
        endDate: new Date(a.endDate),
      })),
      new Date(data.requestedStartDate)
    );
  }

  const [created] = await db
    .insert(leaveRequest)
    .values({
      ...data,
      requestId,
      totalDaysRequested: totalDays.toString(),
      hasConflict: conflicts.hasConflict,
      conflictsWith: conflicts.conflictsWith,
      conflictReason: conflicts.reason || null,
      coveragePercent,
      status: data.status || "pending",
      createdBy,
    })
    .returning();
  return created;
}

/**
 * Approves leave request and creates corresponding absence
 */
export async function approveLeaveRequest(id: string, reviewedBy: string) {
  const [request] = await db
    .select()
    .from(leaveRequest)
    .where(eq(leaveRequest.id, id))
    .limit(1);

  if (!request) {
    throw new Error("Leave request not found");
  }

  // Update request status
  const [updatedRequest] = await db
    .update(leaveRequest)
    .set({
      status: "approved",
      reviewedBy,
      reviewedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(leaveRequest.id, id))
    .returning();

  // Create corresponding absence
  const [newAbsence] = await db
    .insert(absence)
    .values({
      employeeId: request.employeeId,
      absenceType: request.requestType,
      startDate: request.requestedStartDate,
      endDate: request.requestedEndDate,
      totalDays: request.totalDaysRequested,
      approvalDate: new Date().toISOString(),
      approvedBy: reviewedBy, // Use the actual reviewer who approved
      createdBy: reviewedBy,
      createdAt: new Date(),
    })
    .returning();

  return {
    request: updatedRequest,
    absence: newAbsence,
  };
}

/**
 * Denies leave request
 */
export async function denyLeaveRequest(
  id: string,
  reviewedBy: string,
  reason?: string
) {
  const updateData: Partial<InsertLeaveRequest> = {
    status: "denied",
    reviewedBy,
    reviewedAt: new Date(),
    updatedAt: new Date(),
  };

  if (reason) {
    updateData.notes = reason;
  }

  const [updated] = await db
    .update(leaveRequest)
    .set(updateData)
    .where(eq(leaveRequest.id, id))
    .returning();
  return updated;
}
