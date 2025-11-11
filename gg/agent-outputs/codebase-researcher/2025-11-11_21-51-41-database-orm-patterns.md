# Database Technology and ORM Patterns Research

**Research Date:** 2025-11-11
**Codebase:** AgentDune Chat
**Focus:** Database architecture, ORM patterns, entity definitions, relationships, and CRUD operations

---

## Analysis: Database Architecture and ORM Implementation

### Overview

AgentDune Chat uses **PostgreSQL** as its primary database with **Drizzle ORM** for type-safe database operations. The architecture follows a clean separation of concerns with dedicated files for schema definitions, queries, migrations, and client configuration. Authentication is handled by **Better Auth** with a Drizzle adapter integration. The codebase implements a repository pattern for complex domain logic (like credit management) while using a centralized queries module for most CRUD operations.

---

## 1. Technology Stack

### Core Database Technologies

**Database:** PostgreSQL
- Configured via `POSTGRES_URL` environment variable
- Production deployment likely uses Vercel Postgres (based on `@vercel/postgres` dependency)
- Connection pooling configured differently for dev vs production environments

**ORM:** Drizzle ORM v0.34.1
- Type-safe query builder
- Schema-first approach with TypeScript
- SQL migration generation via `drizzle-kit` v0.25.0
- PostgreSQL-specific features utilized

**Key Dependencies** (`package.json`):
```json
{
  "drizzle-orm": "^0.34.1",
  "postgres": "^3.4.7",
  "@vercel/postgres": "^0.10.0",
  "better-auth": "^1.3.29"
}
```

### Dev Tools
- `drizzle-kit`: Migration generation and database introspection
- `tsx`: TypeScript execution for migration scripts
- Database studio: `drizzle-kit studio` for GUI exploration

---

## 2. Database Configuration

### Entry Point: `drizzle.config.ts`

**Location:** `/home/user/agentdune-chat/drizzle.config.ts`

```typescript
// Lines 1-16
import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env.local" });

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.POSTGRES_URL!,
  },
});
```

**Key Configuration:**
- **Schema Source:** `./lib/db/schema.ts` - Single source of truth for all table definitions
- **Migration Output:** `./lib/db/migrations` - Auto-generated SQL files
- **Dialect:** `postgresql` - Uses PostgreSQL-specific features
- **Connection:** Environment-based via `POSTGRES_URL`

### Database Client Setup: `lib/db/client.ts`

**Location:** `/home/user/agentdune-chat/lib/db/client.ts`

```typescript
// Lines 1-27
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/lib/env";

const globalForDb = globalThis as unknown as {
  __postgresClient?: ReturnType<typeof postgres>;
  __drizzleDb?: ReturnType<typeof drizzle>;
};

const isProd = process.env.NODE_ENV === "production";

if (!globalForDb.__postgresClient) {
  globalForDb.__postgresClient = postgres(env.POSTGRES_URL, {
    max: isProd ? undefined : 5,  // Dev: 5 connections, Prod: default
  });
}

export const client = globalForDb.__postgresClient;

if (!globalForDb.__drizzleDb) {
  globalForDb.__drizzleDb = drizzle(client);
}

export const db = globalForDb.__drizzleDb;
```

**Architecture Patterns:**
1. **Connection Singleton:** Uses `globalThis` to prevent connection pool exhaustion during HMR (Hot Module Replacement)
2. **Environment-Aware Pooling:**
   - Development: Limited to 5 connections to avoid exhausting Postgres during HMR
   - Production: Default pooling (unlimited)
3. **Two Exports:**
   - `client`: Raw PostgreSQL client for direct SQL operations
   - `db`: Drizzle instance for ORM operations

**Why This Pattern:**
- Prevents "too many connections" errors in development
- Ensures connection reuse across module hot reloads
- Maintains type safety while allowing low-level access when needed

---

## 3. Entity Definitions and Schema

### Schema Organization: `lib/db/schema.ts`

**Location:** `/home/user/agentdune-chat/lib/db/schema.ts`

The schema follows a **table-per-entity** approach with explicit relationships defined using foreign keys.

### Core Entities

#### 3.1 User Entity

```typescript
// Lines 203-218
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
  role: text("role"),
  banned: boolean("banned").default(false),
  banReason: text("ban_reason"),
  banExpires: timestamp("ban_expires"),
});

export type User = InferSelectModel<typeof user>;
```

**Key Features:**
- **Primary Key:** Text-based ID (likely UUID from Better Auth)
- **Unique Constraint:** Email must be unique
- **Auto-Update:** `updatedAt` uses `$onUpdate()` hook to automatically update timestamp
- **Type Safety:** `InferSelectModel` generates TypeScript type from schema
- **Role-Based Access:** `role` field for RBAC (admin/user)
- **Ban System:** `banned`, `banReason`, `banExpires` fields for user deactivation

#### 3.2 Authentication Tables (Better Auth Integration)

**Session Table:**
```typescript
// Lines 220-234
export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .$onUpdate(() => new Date())
    .notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  impersonatedBy: text("impersonated_by"),
});
```

**Account Table (OAuth/Credentials):**
```typescript
// Lines 236-254
export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .$onUpdate(() => new Date())
    .notNull(),
});
```

**Verification Table:**
```typescript
// Lines 256-266
export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});
```

**Auth Schema Export:**
```typescript
// Line 268
export const schema = { user, session, account, verification };
```

This `schema` object is passed to Better Auth's Drizzle adapter at `lib/auth.ts:22-24`.

#### 3.3 Chat System Tables

**Chat Table:**
```typescript
// Lines 93-105
export const chat = pgTable("Chat", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  title: text("title").notNull(),
  userId: text("userId")
    .notNull()
    .references(() => user.id),
  visibility: varchar("visibility", { enum: ["public", "private"] })
    .notNull()
    .default("private"),
  isPinned: boolean("isPinned").notNull().default(false),
});

export type Chat = InferSelectModel<typeof chat>;
```

**Features:**
- UUID primary key with `defaultRandom()`
- Visibility control (public/private)
- Pin functionality for important chats
- Foreign key to user (no cascade delete specified)

**Message Table:**
```typescript
// Lines 109-126
export const message = pgTable("Message", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  chatId: uuid("chatId")
    .notNull()
    .references(() => chat.id, { onDelete: "cascade" }),
  parentMessageId: uuid("parentMessageId"),
  role: varchar("role").notNull(),
  parts: json("parts").notNull(),
  attachments: json("attachments").notNull(),
  createdAt: timestamp("createdAt").notNull(),
  annotations: json("annotations"),
  isPartial: boolean("isPartial").notNull().default(false),
  selectedModel: varchar("selectedModel", { length: 256 }).default(""),
  selectedTool: varchar("selectedTool", { length: 256 }).default(""),
  lastContext: json("lastContext"),
});

export type DBMessage = InferSelectModel<typeof message>;
```

**Key Design Decisions:**
- **JSON Columns:** `parts`, `attachments`, `annotations`, `lastContext` stored as JSON for flexibility
- **Self-Referencing:** `parentMessageId` enables message threading/branching
- **Cascade Delete:** Messages deleted when chat is deleted
- **Partial Responses:** `isPartial` flag for streaming support
- **Model Tracking:** Records which AI model generated the response

**Vote Table (Composite Primary Key):**
```typescript
// Lines 130-148
export const vote = pgTable(
  "Vote",
  {
    chatId: uuid("chatId")
      .notNull()
      .references(() => chat.id, { onDelete: "cascade" }),
    messageId: uuid("messageId")
      .notNull()
      .references(() => message.id, { onDelete: "cascade" }),
    isUpvoted: boolean("isUpvoted").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.chatId, table.messageId] }),
  })
);

export type Vote = InferSelectModel<typeof vote>;
```

**Unique Pattern:**
- **Composite Primary Key:** `(chatId, messageId)` ensures one vote per message per chat
- **Cascade Deletes:** Votes removed when chat or message is deleted

#### 3.4 Document System Tables

**Document Table (Composite Primary Key with Timestamp):**
```typescript
// Lines 152-174
export const document = pgTable(
  "Document",
  {
    id: uuid("id").notNull().defaultRandom(),
    createdAt: timestamp("createdAt").notNull(),
    title: text("title").notNull(),
    content: text("content"),
    kind: varchar("text", { enum: ["text", "code", "sheet"] })
      .notNull()
      .default("text"),
    userId: text("userId")
      .notNull()
      .references(() => user.id),
    messageId: uuid("messageId")
      .notNull()
      .references(() => message.id, { onDelete: "cascade" }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id, table.createdAt] }),
  })
);

export type Document = InferSelectModel<typeof document>;
```

**Design Pattern:**
- **Temporal Primary Key:** `(id, createdAt)` enables document versioning
- **Document Types:** Enum constrains to "text", "code", or "sheet"
- **Message Association:** Links documents to specific messages
- **Cascade Delete:** Documents removed when message is deleted

**Suggestion Table (Complex Foreign Key):**
```typescript
// Lines 178-200
export const suggestion = pgTable(
  "Suggestion",
  {
    id: uuid("id").notNull().defaultRandom(),
    documentId: uuid("documentId").notNull(),
    documentCreatedAt: timestamp("documentCreatedAt").notNull(),
    originalText: text("originalText").notNull(),
    suggestedText: text("suggestedText").notNull(),
    description: text("description"),
    isResolved: boolean("isResolved").notNull().default(false),
    userId: text("userId")
      .notNull()
      .references(() => user.id),
    createdAt: timestamp("createdAt").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    documentRef: foreignKey({
      columns: [table.documentId, table.documentCreatedAt],
      foreignColumns: [document.id, document.createdAt],
    }),
  })
);

export type Suggestion = InferSelectModel<typeof suggestion>;
```

**Advanced Pattern:**
- **Composite Foreign Key:** References document's composite primary key `(id, createdAt)`
- **Resolution Tracking:** `isResolved` flag for suggestion workflow
- **Edit Tracking:** Stores both original and suggested text

#### 3.5 Credit System

**UserCredit Table:**
```typescript
// Lines 18-25
export const userCredit = pgTable("UserCredit", {
  userId: text("userId")
    .primaryKey()
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  credits: integer("credits").notNull().default(10_000),
  reservedCredits: integer("reservedCredits").notNull().default(0),
});

export type UserCredit = InferSelectModel<typeof userCredit>;
```

**Features:**
- **One-to-One:** userId is both primary key and foreign key
- **Default Credits:** New users get 10,000 credits
- **Reservation System:** `reservedCredits` for concurrent request handling
- **Cascade Delete:** Credits removed when user is deleted

#### 3.6 Document RAG System (OpenAI Vector Store)

**UploadedDocument Table:**
```typescript
// Lines 29-77
export const uploadedDocument = pgTable(
  "UploadedDocument",
  {
    // Identity
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    filename: text("filename").notNull(),

    // Ownership and timestamps
    uploadedBy: text("uploaded_by")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    deletedAt: timestamp("deleted_at"),

    // File metadata
    fileSize: integer("file_size").notNull(),
    contentType: text("content_type").notNull(),

    // Storage references
    blobUrl: text("blob_url").notNull(),
    blobPathname: text("blob_pathname").notNull(),

    // OpenAI references
    openaiFileId: text("openai_file_id").notNull().unique(),
    vectorStoreId: text("vector_store_id").notNull(),

    // Processing status
    status: varchar("status", {
      enum: ["uploading", "processing", "ready", "failed"],
    })
      .notNull()
      .default("uploading"),
    errorMessage: text("error_message"),

    // Organization
    tags: json("tags").$type<string[]>().notNull().default([]),
  },
  (table) => ({
    uploadedByIdx: index("uploaded_document_uploaded_by_idx").on(table.uploadedBy),
    statusIdx: index("uploaded_document_status_idx").on(table.status),
    vectorStoreIdx: index("uploaded_document_vector_store_id_idx").on(table.vectorStoreId),
    deletedAtIdx: index("uploaded_document_deleted_at_idx").on(table.deletedAt),
  })
);

export type UploadedDocument = InferSelectModel<typeof uploadedDocument>;
export type InsertUploadedDocument = InferInsertModel<typeof uploadedDocument>;
```

**Advanced Features:**
- **Soft Delete:** `deletedAt` timestamp for soft deletion pattern
- **Multiple Indexes:** Optimized for common query patterns
- **Status Machine:** Tracks document processing lifecycle
- **External Integration:** Links to OpenAI vector store and file storage
- **Typed JSON:** `.$type<string[]>()` provides TypeScript type for JSON column

**VectorStoreConfig Table:**
```typescript
// Lines 79-84
export const vectorStoreConfig = pgTable("VectorStoreConfig", {
  id: text("id").primaryKey().default("singleton"),
  vectorStoreId: text("vector_store_id").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type VectorStoreConfig = InferSelectModel<typeof vectorStoreConfig>;
```

**Singleton Pattern:**
- **Fixed ID:** Default value "singleton" ensures only one row exists
- **Shared Vector Store:** All documents use the same OpenAI vector store
- **Global Configuration:** Application-wide vector store ID

---

## 4. Relationship Management

### Relationship Patterns

#### 4.1 One-to-Many Relationships

**User → Chats:**
```typescript
// chat.userId references user.id
userId: text("userId")
  .notNull()
  .references(() => user.id)
```
- No cascade delete: Chats remain when user exists (handled at application level)

**User → UserCredit (One-to-One):**
```typescript
// userCredit.userId is both PK and FK
userId: text("userId")
  .primaryKey()
  .references(() => user.id, { onDelete: "cascade" })
```
- Cascade delete: Credits removed when user is deleted

**Chat → Messages:**
```typescript
// message.chatId references chat.id
chatId: uuid("chatId")
  .notNull()
  .references(() => chat.id, { onDelete: "cascade" })
```
- Cascade delete: All messages deleted when chat is deleted

**User → UploadedDocuments:**
```typescript
// uploadedDocument.uploadedBy references user.id
uploadedBy: text("uploaded_by")
  .notNull()
  .references(() => user.id, { onDelete: "cascade" })
```
- Cascade delete: Documents removed when user is deleted

#### 4.2 Self-Referencing Relationships

**Message Threading:**
```typescript
// message.parentMessageId references message.id
parentMessageId: uuid("parentMessageId")
```
- No explicit foreign key constraint (flexibility for branching)
- Enables chat branching UI feature

#### 4.3 Composite Relationships

**Suggestion → Document:**
```typescript
// suggestion references document's composite key (id, createdAt)
documentRef: foreignKey({
  columns: [table.documentId, table.documentCreatedAt],
  foreignColumns: [document.id, document.createdAt],
})
```
- References document version at specific point in time

#### 4.4 Many-to-Many via Junction Table

**Vote as Junction:**
```typescript
// Vote table connects Chat and Message with composite PK
pk: primaryKey({ columns: [table.chatId, table.messageId] })
```
- Composite primary key ensures one vote per message per chat
- Cascade deletes from both chat and message

### Foreign Key Cascade Strategy

| Table | Foreign Key | On Delete | Rationale |
|-------|-------------|-----------|-----------|
| `userCredit` | user.id | CASCADE | Credits meaningless without user |
| `session` | user.id | CASCADE | Sessions invalid without user |
| `account` | user.id | CASCADE | OAuth accounts tied to user |
| `message` | chat.id | CASCADE | Messages belong to chat |
| `document` | message.id | CASCADE | Documents tied to message |
| `vote` | chat.id, message.id | CASCADE | Votes meaningless without both |
| `uploadedDocument` | user.id | CASCADE | Admin-uploaded docs owned by user |
| `chat` | user.id | NONE | Application-level handling |

---

## 5. CRUD Operations

### Query Organization: `lib/db/queries.ts`

**Location:** `/home/user/agentdune-chat/lib/db/queries.ts`

All CRUD operations centralized in a single file with 1,028 lines of query logic.

### 5.1 Basic CRUD Patterns

#### Create Operations

**Single Insert:**
```typescript
// Lines 45-66 - saveChat
export async function saveChat({
  id, userId, title
}: { id: string; userId: string; title: string }) {
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
```

**Pattern:**
- Explicit timestamp setting
- Try-catch with error logging
- Re-throw error for upstream handling

**Batch Insert with Side Effects:**
```typescript
// Lines 135-152 - saveMessages
export async function saveMessages({ _messages }: { _messages: DBMessage[] }) {
  try {
    if (_messages.length === 0) return;

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
```

**Pattern:**
- Early return for empty arrays
- Side effects: Update parent chat timestamps
- Parallel updates via `Promise.all()`

#### Read Operations

**Single Select with Filter:**
```typescript
// Lines 36-43 - getUserByEmail
export async function getUserByEmail(email: string): Promise<User[]> {
  try {
    return await db.select().from(user).where(eq(user.email, email));
  } catch (error) {
    console.error("Failed to get user from database");
    throw error;
  }
}
```

**Complex Query with Join and Conditional Where:**
```typescript
// Lines 274-320 - getDocumentsById (visibility check)
export async function getDocumentsById({
  id, userId
}: { id: string; userId?: string }) {
  try {
    const documents = await _getDocumentsById({ id });

    if (documents.length === 0) return [];

    const [doc] = documents;

    // Check ownership or public visibility
    if (!userId || doc.userId !== userId) {
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
    console.error("Failed to get documents by id with visibility from database");
    throw error;
  }
}
```

**Pattern:**
- Multi-table joins for access control
- Conditional logic based on ownership
- Authorization logic at data layer

#### Update Operations

**Simple Update:**
```typescript
// Lines 575-588 - updateChatVisiblityById
export async function updateChatVisiblityById({
  chatId, visibility
}: { chatId: string; visibility: "private" | "public" }) {
  try {
    return await db.update(chat).set({ visibility }).where(eq(chat.id, chatId));
  } catch (error) {
    console.error("Failed to update chat visibility in database");
    throw error;
  }
}
```

**Partial Update:**
```typescript
// Lines 155-172 - updateMessage
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
```

**Pattern:**
- Selective field updates (doesn't update all fields)
- No automatic `updatedAt` handling (must be explicit if needed)

#### Delete Operations

**Cascade Delete with Cleanup:**
```typescript
// Lines 68-86 - deleteChatById
export async function deleteChatById({ id }: { id: string }) {
  try {
    // Get all messages for this chat to clean up their attachments
    const messagesToDelete = await db
      .select()
      .from(message)
      .where(eq(message.chatId, id));

    // Clean up attachments before deleting the chat
    if (messagesToDelete.length > 0) {
      await deleteAttachmentsFromMessages(messagesToDelete);
    }

    return await db.delete(chat).where(eq(chat.id, id));
  } catch (error) {
    console.error("Failed to delete chat by id from database");
    throw error;
  }
}
```

**Pattern:**
- Manual cleanup before cascade delete
- External resource cleanup (Vercel Blob storage)
- Database cascade handles message deletion

**Helper Function for External Cleanup:**
```typescript
// Lines 693-716 - deleteAttachmentsFromMessages
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
      await del(attachmentUrls);  // Vercel Blob deletion
    }
  } catch (error) {
    console.error("Failed to delete attachments from Vercel Blob:", error);
    // Don't throw - proceed with message deletion even if blob cleanup fails
  }
}
```

**Soft Delete:**
```typescript
// Lines 943-956 - softDeleteDocument
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
```

**Pattern:**
- Sets `deletedAt` timestamp instead of actual deletion
- Allows data recovery
- All queries must filter by `isNull(uploadedDocument.deletedAt)`

### 5.2 Advanced Query Patterns

#### Upsert (Insert with Conflict Handling)

**Vector Store Configuration:**
```typescript
// Lines 745-766 - setVectorStoreId
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
```

**Pattern:**
- `onConflictDoUpdate` for upsert behavior
- Singleton pattern implementation
- Updates only changed fields on conflict

#### Conditional Upsert with Voting

**Vote Message:**
```typescript
// Lines 187-217 - voteMessage
export async function voteMessage({
  chatId, messageId, type
}: { chatId: string; messageId: string; type: "up" | "down" }) {
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
```

**Pattern:**
- Check-then-insert or update
- Two separate queries (not atomic via SQL)
- Race condition possible with concurrent requests

#### Pagination with Filtering

**List Documents:**
```typescript
// Lines 778-839 - listDocuments
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
```

**Pattern:**
- Dynamic WHERE clause building
- Case-insensitive search with `ilike()`
- PostgreSQL JSON operators via `sql` template
- Separate count query for total
- Pagination metadata in response

#### Complex Delete with Temporal Logic

**Delete Messages After Timestamp:**
```typescript
// Lines 476-515 - deleteMessagesByChatIdAfterTimestamp
export async function deleteMessagesByChatIdAfterTimestamp({
  chatId, timestamp
}: { chatId: string; timestamp: Date }) {
  try {
    const messagesToDelete = await db
      .select()
      .from(message)
      .where(and(eq(message.chatId, chatId), gte(message.createdAt, timestamp)));

    const messageIds = messagesToDelete.map((message) => message.id);

    if (messageIds.length > 0) {
      // Clean up attachments before deleting messages
      await deleteAttachmentsFromMessages(messagesToDelete);

      await db
        .delete(vote)
        .where(and(eq(vote.chatId, chatId), inArray(vote.messageId, messageIds)));

      return await db
        .delete(message)
        .where(and(eq(message.chatId, chatId), inArray(message.id, messageIds)));
    }
  } catch (error) {
    console.error("Failed to delete messages by id after timestamp from database");
    throw error;
  }
}
```

**Pattern:**
- Multi-step deletion process
- External cleanup (blob storage)
- Manual cascade to related tables (votes)
- Temporal filtering with `gte()`

#### Index-Based Deletion (Chat Branching)

**Delete Messages After Specific Message:**
```typescript
// Lines 517-573 - deleteMessagesByChatIdAfterMessageId
export async function deleteMessagesByChatIdAfterMessageId({
  chatId, messageId
}: { chatId: string; messageId: string }) {
  try {
    // First, get the target message
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
        .where(and(
          eq(message.chatId, chatId),
          inArray(message.id, messageIdsToDelete)
        ));
    }
  } catch (error) {
    console.error("Failed to delete messages by chat id after message id from database");
    throw error;
  }
}
```

**Pattern:**
- In-memory array manipulation for index finding
- Not optimized for large chats (loads all messages)
- Supports chat branching UI feature
- External cleanup before deletion

---

## 6. Repository Pattern

### Credit Management Repository: `lib/repositories/credits.ts`

**Location:** `/home/user/agentdune-chat/lib/repositories/credits.ts`

The codebase uses a **repository pattern** for domain-specific logic, particularly for the credit system which requires atomic operations and complex business rules.

#### Auto-Create Pattern

**Ensure User Credit Row:**
```typescript
// Lines 6-8
async function ensureUserCreditRow(userId: string) {
  await db.insert(userCredit).values({ userId }).onConflictDoNothing();
}
```

**Get with Auto-Create:**
```typescript
// Lines 10-42 - getUserCreditsInfo
export async function getUserCreditsInfo({ userId }: { userId: string }) {
  let creditsRows = await db
    .select({
      credits: userCredit.credits,
      reservedCredits: userCredit.reservedCredits,
    })
    .from(userCredit)
    .where(eq(userCredit.userId, userId))
    .limit(1);

  let userInfo = creditsRows[0];
  if (!userInfo) {
    await ensureUserCreditRow(userId);
    creditsRows = await db
      .select({
        credits: userCredit.credits,
        reservedCredits: userCredit.reservedCredits,
      })
      .from(userCredit)
      .where(eq(userCredit.userId, userId))
      .limit(1);
    userInfo = creditsRows[0];
    if (!userInfo) {
      return null;
    }
  }

  return {
    totalCredits: userInfo.credits,
    availableCredits: userInfo.credits - userInfo.reservedCredits,
    reservedCredits: userInfo.reservedCredits,
  };
}
```

**Pattern:**
- Lazy initialization of credit rows
- Automatic retry after creation
- Calculated field: `availableCredits`

#### Atomic Reservation Pattern

**Reserve Credits (Optimistic Locking):**
```typescript
// Lines 44-106 - reserveAvailableCredits
export async function reserveAvailableCredits({
  userId, maxAmount, minAmount
}: {
  userId: string;
  maxAmount: number;
  minAmount: number;
}): Promise<
  | { success: true; reservedAmount: number; }
  | { success: false; error: string; }
> {
  try {
    const userInfo = await getUserCreditsInfo({ userId });
    if (!userInfo) {
      return { success: false, error: "User credits not initialized" };
    }

    const availableCredits = userInfo.availableCredits;
    const amountToReserve = Math.min(maxAmount, availableCredits);

    if (amountToReserve < minAmount) {
      return { success: false, error: "Insufficient credits" };
    }

    const result = await db
      .update(userCredit)
      .set({
        reservedCredits: sql`${userCredit.reservedCredits} + ${amountToReserve}`,
      })
      .where(
        and(
          eq(userCredit.userId, userId),
          gte(
            sql`${userCredit.credits} - ${userCredit.reservedCredits}`,
            amountToReserve
          )
        )
      )
      .returning({
        credits: userCredit.credits,
        reservedCredits: userCredit.reservedCredits,
      });

    if (result.length === 0) {
      return { success: false, error: "Failed to reserve credits" };
    }

    return {
      success: true,
      reservedAmount: amountToReserve,
    };
  } catch (error) {
    console.error("Failed to reserve available credits:", error);
    return { success: false, error: "Failed to reserve credits" };
  }
}
```

**Pattern:**
- **Optimistic Locking:** WHERE clause verifies available credits
- **Atomic Update:** SQL expression ensures race-condition safety
- **Result Discrimination:** Union type for success/failure
- **Returning Clause:** Confirms actual updated values

#### Finalize Credits (Two-Phase Commit Pattern)

**Finalize Usage:**
```typescript
// Lines 108-124 - finalizeCreditsUsage
export async function finalizeCreditsUsage({
  userId, reservedAmount, actualAmount
}: {
  userId: string;
  reservedAmount: number;
  actualAmount: number;
}): Promise<void> {
  await db
    .update(userCredit)
    .set({
      credits: sql`${userCredit.credits} - ${actualAmount}`,
      reservedCredits: sql`${userCredit.reservedCredits} - ${reservedAmount}`,
    })
    .where(eq(userCredit.userId, userId));
}
```

**Release Reserved Credits:**
```typescript
// Lines 126-144 - releaseReservedCredits
export async function releaseReservedCredits({
  userId, amount
}: { userId: string; amount: number }): Promise<void> {
  await db
    .update(userCredit)
    .set({
      reservedCredits: sql`${userCredit.reservedCredits} - ${amount}`,
    })
    .where(
      and(
        eq(userCredit.userId, userId),
        gte(userCredit.reservedCredits, amount)
      )
    );
}
```

**Pattern:**
- **Two-Phase Commit:**
  1. Reserve credits (lock resources)
  2. Finalize (deduct actual amount and unlock)
- **Differential Accounting:** Can reserve more than actually used
- **Safe Arithmetic:** SQL expressions prevent race conditions

**Credit Flow Example:**
```typescript
// 1. Reserve max amount (e.g., 1000 tokens)
const reservation = await reserveAvailableCredits({
  userId: "user123",
  maxAmount: 1000,
  minAmount: 100,
});

// 2. Use API (actual usage: 450 tokens)
const actualUsage = 450;

// 3. Finalize and release unused
await finalizeCreditsUsage({
  userId: "user123",
  reservedAmount: reservation.reservedAmount,  // 1000
  actualAmount: actualUsage,                   // 450
});
// Result: 450 credits deducted, 550 unreserved and returned to pool
```

---

## 7. Authentication Integration

### Better Auth with Drizzle Adapter: `lib/auth.ts`

**Location:** `/home/user/agentdune-chat/lib/auth.ts`

```typescript
// Lines 1-44
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins";
import { env } from "@/lib/env";
import { db } from "./db/client";
import { schema } from "./db/schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  trustedOrigins: env.VERCEL_URL ? [env.VERCEL_URL] : undefined,
  secret: env.AUTH_SECRET,

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },

  plugins: [
    nextCookies(),
    admin({
      defaultRole: "user",
      adminRoles: ["admin"],
      impersonationSessionDuration: 60 * 60,
    }),
  ],
});
```

**Integration Points:**
1. **Drizzle Adapter:** Maps Better Auth operations to Drizzle queries
2. **Schema Passing:** Better Auth uses the exported `schema` object (line 7, 24)
3. **Table Convention:** Better Auth expects specific table names (`user`, `session`, `account`, `verification`)
4. **Admin Plugin:** Provides user management APIs used in `trpc/routers/admin.router.ts`

---

## 8. Migration System

### Migration Management: `lib/db/migrate.ts`

**Location:** `/home/user/agentdune-chat/lib/db/migrate.ts`

```typescript
// Lines 1-32
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

config({ path: ".env.local" });

const runMigrate = async () => {
  if (!process.env.POSTGRES_URL) {
    throw new Error("POSTGRES_URL is not defined");
  }

  const connection = postgres(process.env.POSTGRES_URL, { max: 1 });
  const db = drizzle(connection);

  console.log("⏳ Running migrations...");

  const start = Date.now();
  await migrate(db, { migrationsFolder: "./lib/db/migrations" });
  const end = Date.now();

  console.log("✅ Migrations completed in", end - start, "ms");
  process.exit(0);
};

runMigrate().catch((err) => {
  console.error("❌ Migration failed");
  console.error(err);
  process.exit(1);
});
```

**Pattern:**
- Standalone script executed via `tsx`
- Single connection for migration
- Automatic exit on completion
- Run during build process (`package.json:9`)

### Migration Generation Workflow

**Scripts in `package.json`:**
```json
{
  "db:generate": "drizzle-kit generate",
  "db:migrate": "npx tsx lib/db/migrate.ts",
  "db:push": "drizzle-kit push",
  "db:studio": "drizzle-kit studio",
  "build": "(cd packages/models && bun run build) && tsx lib/db/migrate && next build"
}
```

**Workflow:**
1. **Schema Change:** Modify `lib/db/schema.ts`
2. **Generate Migration:** Run `bun run db:generate`
   - Drizzle Kit compares schema to database
   - Generates SQL in `lib/db/migrations/XXXX_name.sql`
3. **Review SQL:** Manually inspect generated migration
4. **Apply Migration:**
   - Dev: `bun run db:migrate`
   - Production: Automatic during `bun run build`

### Migration Files

**Initial Migration (0000_petite_morbius.sql):**
- Creates all base tables
- Establishes foreign key relationships
- Sets up indexes

**Document RAG Migration (0001_tranquil_baron_strucker.sql):**
- Adds `UploadedDocument` table with indexes
- Adds `VectorStoreConfig` singleton table
- Demonstrates iterative schema evolution

**Migration Journal:**
```json
// lib/db/migrations/meta/_journal.json
{
  "version": "7",
  "dialect": "postgresql",
  "entries": [
    {
      "idx": 0,
      "version": "7",
      "when": 1761083757216,
      "tag": "0000_petite_morbius",
      "breakpoints": true
    },
    {
      "idx": 1,
      "version": "7",
      "when": 1761166979193,
      "tag": "0001_tranquil_baron_strucker",
      "breakpoints": true
    }
  ]
}
```

**Tracking:**
- Sequential index for ordering
- Timestamp for audit trail
- Tag for human-readable naming

---

## 9. Data Access Patterns in tRPC

### Admin Router: `trpc/routers/admin.router.ts`

**Location:** `/home/user/agentdune-chat/trpc/routers/admin.router.ts`

The tRPC router demonstrates how database queries are consumed by the API layer.

#### Pattern 1: Direct Database Access

**List Users with Credits:**
```typescript
// Lines 12-88
listUsers: adminProcedure
  .input(z.object({ /* ... */ }))
  .query(async ({ input }) => {
    const whereConditions = [];

    // Build dynamic WHERE clause
    if (input.searchValue && input.searchField) {
      if (input.searchField === "email") {
        whereConditions.push(ilike(user.email, `%${input.searchValue}%`));
      } else if (input.searchField === "name") {
        whereConditions.push(ilike(user.name, `%${input.searchValue}%`));
      }
    }

    // Query users with JOIN to credits
    const users = await db
      .select({
        user,
        credits: userCredit.credits,
      })
      .from(user)
      .leftJoin(userCredit, eq(user.id, userCredit.userId))
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .limit(input.limit)
      .offset(input.offset);

    // Count total
    const [totalResult] = await db
      .select({ count: count() })
      .from(user)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

    // Transform for API response
    const transformedUsers = users.map((row) => ({
      id: row.user.id,
      email: row.user.email,
      name: row.user.name,
      role: (row.user.role || "user") as "admin" | "user",
      status: (row.user.banned ? "inactive" : "active") as "active" | "inactive",
      createdAt: row.user.createdAt,
      banned: row.user.banned || false,
      banReason: row.user.banReason,
      credits: row.credits ?? 0,
    }));

    return {
      users: transformedUsers,
      total: totalResult?.count || 0,
    };
  }),
```

**Pattern:**
- Direct Drizzle ORM usage in tRPC resolver
- Complex joins and transformations
- No query function abstraction for this specific case

#### Pattern 2: Query Function Abstraction

**Document List:**
```typescript
// Lines 271-286
documents: {
  list: adminProcedure
    .input(z.object({ /* ... */ }))
    .query(async ({ input }) => {
      const { listDocuments } = await import("@/lib/db/queries");
      return await listDocuments(input);
    }),
}
```

**Pattern:**
- Dynamic import of query functions
- Pass through input to query layer
- Separation of concerns: router handles auth, queries handle data

#### Pattern 3: Multi-Step Transactions

**Delete Document:**
```typescript
// Lines 304-346
delete: adminProcedure
  .input(z.object({ id: z.string() }))
  .mutation(async ({ input }) => {
    const { getUploadedDocumentById, softDeleteDocument } = await import("@/lib/db/queries");
    const { removeFileFromVectorStore } = await import("@/lib/openai/vector-store");
    const { deleteFileFromOpenAI } = await import("@/lib/openai/files");

    // Get document by ID
    const document = await getUploadedDocumentById(input.id);

    if (!document) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Document not found",
      });
    }

    try {
      // Remove from vector store
      await removeFileFromVectorStore(
        document.vectorStoreId,
        document.openaiFileId
      );

      // Delete from OpenAI Files
      await deleteFileFromOpenAI(document.openaiFileId);

      // Soft delete in database
      await softDeleteDocument(input.id);

      return { success: true };
    } catch (error) {
      console.error("Failed to delete document:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to delete document",
      });
    }
  }),
```

**Pattern:**
- Multi-step transaction across systems (OpenAI + DB)
- Soft delete in database
- Error handling with proper HTTP codes
- Orchestration at router level

#### Pattern 4: Better Auth Integration

**Create User:**
```typescript
// Lines 90-140
createUser: adminProcedure
  .input(z.object({ /* ... */ }))
  .mutation(async ({ input }) => {
    const passwordWasGenerated = !input.password;
    const password = input.password || generateSecurePassword(16);

    try {
      // Call Better Auth admin API to create user
      const result = await auth.api.createUser({
        body: {
          email: input.email,
          name: input.name,
          password,
          role: input.role,
        },
        headers: await headers(),
      });

      return {
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          role: result.user.role || "user",
        },
        generatedPassword: passwordWasGenerated ? password : undefined,
      };
    } catch (error) {
      // Handle duplicate email error
      if (
        error instanceof Error &&
        (error.message.includes("duplicate") ||
         error.message.includes("unique") ||
         error.message.includes("email"))
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Email already exists",
        });
      }
      throw error;
    }
  }),
```

**Pattern:**
- Delegates to Better Auth APIs for user management
- Better Auth handles database operations internally
- Error translation for API consumers
- Security: generates strong passwords

**Direct Database Update:**
```typescript
// Lines 142-173
updateUser: adminProcedure
  .input(z.object({ /* ... */ }))
  .mutation(async ({ input }) => {
    try {
      // Update user email directly via database
      await db
        .update(user)
        .set({ email: input.email })
        .where(eq(user.id, input.userId));

      return { success: true };
    } catch (error) {
      // Handle duplicate email error
      if (
        error instanceof Error &&
        (error.message.includes("duplicate") ||
         error.message.includes("unique") ||
         error.message.includes("email"))
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Email already exists",
        });
      }
      throw error;
    }
  }),
```

**Pattern:**
- Mix of Better Auth APIs and direct database access
- Direct DB updates for fields Better Auth doesn't support via API
- Consistent error handling across both approaches

---

## 10. Key Architectural Patterns

### 10.1 Singleton Pattern

**Use Cases:**
- Database client (`lib/db/client.ts:6-26`)
- Vector store configuration (`lib/db/schema.ts:79-84`)

**Implementation:**
```typescript
// Singleton client
const globalForDb = globalThis as unknown as {
  __postgresClient?: ReturnType<typeof postgres>;
  __drizzleDb?: ReturnType<typeof drizzle>;
};

if (!globalForDb.__postgresClient) {
  globalForDb.__postgresClient = postgres(env.POSTGRES_URL, { max: isProd ? undefined : 5 });
}

// Singleton table row
export const vectorStoreConfig = pgTable("VectorStoreConfig", {
  id: text("id").primaryKey().default("singleton"),
  vectorStoreId: text("vector_store_id").notNull().unique(),
  // ...
});
```

### 10.2 Soft Delete Pattern

**Implementation:**
- `UploadedDocument` table includes `deletedAt` timestamp
- All queries filter by `isNull(uploadedDocument.deletedAt)`
- Allows data recovery and audit trail

**Example:**
```typescript
// Always exclude soft-deleted
whereConditions.push(isNull(uploadedDocument.deletedAt));

// Soft delete operation
await db
  .update(uploadedDocument)
  .set({ deletedAt: new Date(), updatedAt: new Date() })
  .where(eq(uploadedDocument.id, id));
```

### 10.3 Repository Pattern

**Use Case:** Credit management (`lib/repositories/credits.ts`)

**Benefits:**
- Encapsulates complex business logic
- Atomic operations via SQL expressions
- Type-safe domain operations
- Reusable across application

**Contrast:**
- Simple CRUD → `lib/db/queries.ts`
- Complex domain logic → `lib/repositories/*.ts`

### 10.4 Type Inference Pattern

**Drizzle's Type Generation:**
```typescript
// Schema definition
export const user = pgTable("user", { /* ... */ });

// Automatic type inference
export type User = InferSelectModel<typeof user>;
export type InsertUser = InferInsertModel<typeof user>;
```

**Benefits:**
- Single source of truth
- TypeScript types automatically updated when schema changes
- No manual type maintenance

### 10.5 Query Builder Pattern

**Drizzle ORM Approach:**
```typescript
await db
  .select()
  .from(user)
  .where(eq(user.email, email))
  .limit(1);
```

**vs. Raw SQL Pattern:**
```typescript
await client.query(
  'SELECT * FROM user WHERE email = $1 LIMIT 1',
  [email]
);
```

**Benefits:**
- Type safety at every step
- Auto-completion in IDE
- SQL injection prevention
- Portable across databases

### 10.6 Optimistic Locking Pattern

**Credit Reservation:**
```typescript
const result = await db
  .update(userCredit)
  .set({
    reservedCredits: sql`${userCredit.reservedCredits} + ${amountToReserve}`,
  })
  .where(
    and(
      eq(userCredit.userId, userId),
      gte(
        sql`${userCredit.credits} - ${userCredit.reservedCredits}`,
        amountToReserve
      )
    )
  )
  .returning({ /* ... */ });

if (result.length === 0) {
  // Update failed due to insufficient credits
  return { success: false, error: "Failed to reserve credits" };
}
```

**Pattern:**
- WHERE clause includes availability check
- Update fails if condition not met
- No explicit locks needed
- Race-condition safe

---

## 11. Performance Optimizations

### 11.1 Indexes

**Explicit Indexes on UploadedDocument:**
```typescript
// Lines 68-76 in schema.ts
(table) => ({
  uploadedByIdx: index("uploaded_document_uploaded_by_idx").on(table.uploadedBy),
  statusIdx: index("uploaded_document_status_idx").on(table.status),
  vectorStoreIdx: index("uploaded_document_vector_store_id_idx").on(table.vectorStoreId),
  deletedAtIdx: index("uploaded_document_deleted_at_idx").on(table.deletedAt),
})
```

**Query Optimization:**
- `uploadedBy`: Fast user-specific queries
- `status`: Filtering by processing state
- `vectorStoreId`: Vector store operations
- `deletedAt`: Soft delete filtering

### 11.2 Connection Pooling

**Development Protection:**
```typescript
max: isProd ? undefined : 5  // Limit dev connections
```

**Prevents:**
- Connection exhaustion during HMR
- "Too many connections" errors in development
- Resource waste on dev machines

### 11.3 Batch Operations

**Bulk Insert:**
```typescript
// Lines 442-464 in queries.ts
export async function saveDocuments({
  documents
}: { documents: Array<{ /* ... */ }> }) {
  if (documents.length === 0) return;

  try {
    return await db.insert(document).values(documents);
  } catch (error) {
    console.error("Failed to save documents in database", error);
    throw error;
  }
}
```

**Pattern:**
- Single query for multiple rows
- Reduced network round trips
- Transaction guarantees

### 11.4 Parallel Updates

**Update Multiple Chats:**
```typescript
// Lines 143-146 in queries.ts
const uniqueChatIds = [...new Set(_messages.map((msg) => msg.chatId))];
await Promise.all(
  uniqueChatIds.map((chatId) => updateChatUpdatedAt({ chatId }))
);
```

**Pattern:**
- Concurrent updates via `Promise.all()`
- Faster than sequential updates
- Safe for independent records

### 11.5 Selective Field Updates

**Update Only Changed Fields:**
```typescript
// Lines 155-172 in queries.ts
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
```

**Pattern:**
- Explicit field list (not full object spread)
- Smaller update payloads
- Preserves fields not intended to change

---

## 12. Security Patterns

### 12.1 SQL Injection Prevention

**Query Builder Safety:**
```typescript
// ✅ Safe - parameterized query
await db.select().from(user).where(eq(user.email, userInput));

// ❌ Would be unsafe - string concatenation
await client.query(`SELECT * FROM user WHERE email = '${userInput}'`);
```

**Drizzle automatically parameterizes all values.**

### 12.2 Cascade Deletes for Data Integrity

**Foreign Key Cascades:**
```typescript
userId: text("user_id")
  .notNull()
  .references(() => user.id, { onDelete: "cascade" })
```

**Prevents:**
- Orphaned records
- Referential integrity violations
- Manual cleanup bugs

### 12.3 Authorization at Data Layer

**Visibility Checks in Queries:**
```typescript
// Lines 274-320 in queries.ts
if (!userId || doc.userId !== userId) {
  // Check public visibility via JOIN
  const documentsWithVisibility = await db
    .select({ /* ... */ })
    .from(document)
    .innerJoin(message, eq(document.messageId, message.id))
    .innerJoin(chat, eq(message.chatId, chat.id))
    .where(and(eq(document.id, id), eq(chat.visibility, "public")))
    .orderBy(asc(document.createdAt));

  return documentsWithVisibility;
}
```

**Pattern:**
- Authorization logic in data layer
- Prevents unauthorized data exposure
- Enforces access control consistently

### 12.4 Unique Constraints

**Email Uniqueness:**
```typescript
email: text("email").notNull().unique()
```

**OpenAI File ID Uniqueness:**
```typescript
openaiFileId: text("openai_file_id").notNull().unique()
```

**Prevents:**
- Duplicate accounts
- Data inconsistencies
- External ID collisions

### 12.5 Type Safety

**TypeScript Types from Schema:**
```typescript
export type User = InferSelectModel<typeof user>;
export type DBMessage = InferSelectModel<typeof message>;
```

**Prevents:**
- Type mismatches at compile time
- Runtime type errors
- Invalid data structures

---

## 13. Common Workflows

### Workflow 1: User Registration

```
1. Better Auth API Call (lib/auth.ts:21-44)
   ↓
2. Drizzle Adapter Inserts (automatic)
   - user table
   - account table
   ↓
3. Auto-Create Credit Row (lib/repositories/credits.ts:6-8)
   - userCredit table (lazy)
   ↓
4. Session Creation (automatic)
   - session table
```

### Workflow 2: Create Chat Message

```
1. Client sends message
   ↓
2. Save message (lib/db/queries.ts:120-132)
   - message table
   ↓
3. Update chat timestamp (automatic)
   - chat.updatedAt
   ↓
4. Reserve credits (lib/repositories/credits.ts:44-106)
   - userCredit.reservedCredits += amount
   ↓
5. Stream AI response
   ↓
6. Finalize credits (lib/repositories/credits.ts:108-124)
   - userCredit.credits -= actualAmount
   - userCredit.reservedCredits -= reservedAmount
```

### Workflow 3: Upload Document to RAG

```
1. Upload to Vercel Blob
   ↓
2. Upload to OpenAI Files API
   ↓
3. Get/Create Vector Store ID (lib/db/queries.ts:726-766)
   - vectorStoreConfig singleton
   ↓
4. Add File to Vector Store
   ↓
5. Save Document Record (lib/db/queries.ts:897-915)
   - uploadedDocument table (status: "processing")
   ↓
6. Poll Status (background)
   ↓
7. Update Status (lib/db/queries.ts:920-938)
   - uploadedDocument.status = "ready"
```

### Workflow 4: Delete Chat

```
1. Get messages (lib/db/queries.ts:71-74)
   ↓
2. Extract attachment URLs (lib/db/queries.ts:693-716)
   ↓
3. Delete from Vercel Blob
   ↓
4. Delete chat (lib/db/queries.ts:81)
   ↓
5. CASCADE DELETES (automatic):
   - messages
   - votes
   - documents
   - suggestions
```

---

## 14. Development Scripts

### Database Management Commands

```bash
# Generate migration from schema changes
bun run db:generate

# Apply migrations
bun run db:migrate

# Push schema directly (bypass migrations)
bun run db:push

# Pull schema from database
bun run db:pull

# Check migration conflicts
bun run db:check

# Open Drizzle Studio GUI
bun run db:studio
```

### Build Process

```bash
# Full build with migration
bun run build
# Executes:
# 1. cd packages/models && bun run build
# 2. tsx lib/db/migrate
# 3. next build
```

---

## 15. Summary

### Technology Stack
- **Database:** PostgreSQL (Vercel Postgres)
- **ORM:** Drizzle ORM v0.34.1
- **Connection:** `postgres` driver with pooling
- **Authentication:** Better Auth with Drizzle adapter
- **Type Safety:** Full TypeScript integration via type inference

### Architecture Patterns
1. **Centralized Queries:** `lib/db/queries.ts` for most CRUD operations
2. **Repository Pattern:** `lib/repositories/*` for complex domain logic
3. **Singleton Pattern:** Database client and vector store config
4. **Soft Delete:** UploadedDocument with `deletedAt` timestamp
5. **Optimistic Locking:** Credit reservation system
6. **Type Inference:** Schema-driven TypeScript types

### Entity Organization
- **11 Main Tables:** user, session, account, verification, chat, message, vote, document, suggestion, userCredit, uploadedDocument, vectorStoreConfig
- **Relationship Types:** One-to-many, one-to-one, self-referencing, composite foreign keys
- **Cascade Strategy:** Selective use of `onDelete: "cascade"` for data integrity

### CRUD Operations
- **Basic CRUD:** Centralized in `lib/db/queries.ts` (1,028 lines)
- **Complex Operations:** Multi-step transactions, batch inserts, parallel updates
- **Query Patterns:** Dynamic WHERE clauses, pagination, filtering, joins
- **External Integration:** Coordinates with Vercel Blob, OpenAI APIs

### Performance & Security
- **Indexes:** Strategic indexes on high-query columns
- **Connection Pooling:** Environment-aware (5 connections in dev)
- **Batch Operations:** Bulk inserts for efficiency
- **SQL Injection Prevention:** Query builder parameterization
- **Authorization:** Data-layer access control

### Migration System
- **Schema-First:** Single source of truth in `lib/db/schema.ts`
- **Auto-Generation:** Drizzle Kit generates SQL migrations
- **Build Integration:** Automatic migration during deployment
- **Audit Trail:** Migration journal tracks all changes

---

## File Reference Index

### Core Database Files
- **Schema:** `/home/user/agentdune-chat/lib/db/schema.ts`
- **Client:** `/home/user/agentdune-chat/lib/db/client.ts`
- **Queries:** `/home/user/agentdune-chat/lib/db/queries.ts`
- **Migrations:** `/home/user/agentdune-chat/lib/db/migrate.ts`
- **Config:** `/home/user/agentdune-chat/drizzle.config.ts`

### Repository Pattern
- **Credits:** `/home/user/agentdune-chat/lib/repositories/credits.ts`

### Integration Points
- **Authentication:** `/home/user/agentdune-chat/lib/auth.ts`
- **tRPC Router:** `/home/user/agentdune-chat/trpc/routers/admin.router.ts`

### Migrations
- **Initial:** `/home/user/agentdune-chat/lib/db/migrations/0000_petite_morbius.sql`
- **RAG System:** `/home/user/agentdune-chat/lib/db/migrations/0001_tranquil_baron_strucker.sql`
- **Journal:** `/home/user/agentdune-chat/lib/db/migrations/meta/_journal.json`

---

## Conclusion

AgentDune Chat demonstrates a **mature, production-ready database architecture** using Drizzle ORM with PostgreSQL. The codebase exhibits:

1. **Strong Type Safety:** Full TypeScript integration with schema-driven types
2. **Clean Separation:** Schema, queries, repositories, and API layers clearly separated
3. **Performance-Conscious:** Strategic indexes, connection pooling, batch operations
4. **Security-First:** SQL injection prevention, cascade deletes, authorization at data layer
5. **Scalable Patterns:** Repository pattern for complex logic, optimistic locking for concurrency
6. **Developer Experience:** Excellent tooling (Drizzle Studio, migration generation, type inference)

The architecture balances **simplicity** (centralized queries file) with **sophistication** (repository pattern for domain logic), making it maintainable while supporting complex features like chat branching, document RAG, and credit management.
