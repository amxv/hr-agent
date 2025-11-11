# Chat Storage and Management Research

## Summary

This document details the chat storage system, data models, and deletion mechanisms in the AgentDune Chat application. It includes information on how to identify and delete all chats for a specific user.

---

## 1. Database System

**Answer:** PostgreSQL with Drizzle ORM

### Details:
- **ORM Framework:** Drizzle ORM (lightweight, type-safe)
- **Database:** PostgreSQL
- **Connection Setup:** `/Users/ashray/code/amxv/agentdune-chat/lib/db/client.ts`

### Connection Code:
```typescript
// File: /Users/ashray/code/amxv/agentdune-chat/lib/db/client.ts (lines 1-23)
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const globalForDb = globalThis as unknown as {
  __postgresClient?: ReturnType<typeof postgres>;
  __drizzleDb?: ReturnType<typeof drizzle>;
};

const isProd = process.env.NODE_ENV === "production";

if (!globalForDb.__postgresClient) {
  globalForDb.__postgresClient = postgres(env.POSTGRES_URL, {
    // In dev we keep a small pool to avoid exhausting Postgres during HMR.
    max: isProd ? undefined : 5,
  });
}

export const client = globalForDb.__postgresClient;
export const db =
  globalForDb.__drizzleDb ?? (globalForDb.__drizzleDb = drizzle(client));
```

---

## 2. Chat Data Model and User Association

**Answer:** Chats are associated with users via the `userId` field (foreign key).

### Chat Table Definition:
File: `/Users/ashray/code/amxv/agentdune-chat/lib/db/schema.ts` (lines 93-105)

```typescript
export const chat = pgTable("Chat", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  title: text("title").notNull(),
  userId: text("userId")
    .notNull()
    .references(() => user.id),  // Foreign key to user table
  visibility: varchar("visibility", { enum: ["public", "private"] })
    .notNull()
    .default("private"),
  isPinned: boolean("isPinned").notNull().default(false),
});

export type Chat = InferSelectModel<typeof chat>;
```

### Key Relationships:
- **Primary Key:** `id` (UUID)
- **User Association:** `userId` (text, references `user.id`)
- **Cascading Delete:** Messages cascade-delete when a chat is deleted (line 113-115)
- **Message Relationship:** One-to-Many (one chat has many messages)

### Message Table Definition:
File: `/Users/ashray/code/amxv/agentdune-chat/lib/db/schema.ts` (lines 109-126)

```typescript
export const message = pgTable("Message", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  chatId: uuid("chatId")
    .notNull()
    .references(() => chat.id, {
      onDelete: "cascade",  // Messages are deleted when chat is deleted
    }),
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
```

---

## 3. Chat Data Model Definition Location

**Answer:** `/Users/ashray/code/amxv/agentdune-chat/lib/db/schema.ts`

All database schema definitions are centralized in this file:
- **Chat table:** Lines 93-105
- **Message table:** Lines 109-126
- **Vote table (for message ratings):** Lines 130-148
- **User table:** Lines 203-218

This is a Drizzle ORM schema file using PostgreSQL core functions.

---

## 4. Existing Chat Deletion Functions and API Routes

**Answer:** Multiple functions and API routes exist for deleting chats.

### Primary Deletion Function:
File: `/Users/ashray/code/amxv/agentdune-chat/lib/db/queries.ts` (lines 68-86)

```typescript
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
```

### Key Points:
1. **Attachment Cleanup:** Removes files from Vercel Blob storage before deleting messages
2. **Cascade Delete:** Messages are automatically deleted via foreign key cascade
3. **Location:** `/Users/ashray/code/amxv/agentdune-chat/lib/db/queries.ts`

### Related Deletion Functions:

#### Get All Chats for a User:
File: `/Users/ashray/code/amxv/agentdune-chat/lib/db/queries.ts` (lines 88-99)

```typescript
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
```

### TRPC Router Deletion Endpoint:
File: `/Users/ashray/code/amxv/agentdune-chat/trpc/routers/chat.router.ts` (lines 201-218)

```typescript
deleteChat: protectedProcedure
  .input(
    z.object({
      chatId: z.string().uuid(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const chat = await getChatById({ id: input.chatId });
    if (!chat || chat.userId !== ctx.user.id) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Chat not found or access denied",
      });
    }

    await deleteChatById({ id: input.chatId });
    return { success: true };
  }),
```

### Related Message Deletion Functions:

**Delete Messages After Timestamp:**
File: `/Users/ashray/code/amxv/agentdune-chat/lib/db/queries.ts` (lines 476-515)

**Delete Messages After Message ID (branch deletion):**
File: `/Users/ashray/code/amxv/agentdune-chat/lib/db/queries.ts` (lines 517-573)

---

## 5. User Authentication System and User Lookup

**Answer:** The application uses `better-auth` for authentication with admin plugin support.

### Authentication Setup:
File: `/Users/ashray/code/amxv/agentdune-chat/lib/auth.ts` (lines 1-44)

```typescript
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins";
import { env } from "@/lib/env";
import { db } from "./db/client";
import { schema } from "./db/schema";

export type Session = {
  user?: {
    id?: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string | null; // "admin" | "user"
    banned?: boolean | null;
  };
  expires?: string;
};

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

### User Table Structure:
File: `/Users/ashray/code/amxv/agentdune-chat/lib/db/schema.ts` (lines 203-218)

```typescript
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),  // Email is unique
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
  role: text("role"),  // "admin" or "user"
  banned: boolean("banned").default(false),
  banReason: text("ban_reason"),
  banExpires: timestamp("ban_expires"),
});
```

### Finding User by Email:

**Function to Get User by Email:**
File: `/Users/ashray/code/amxv/agentdune-chat/lib/db/queries.ts` (lines 36-43)

```typescript
export async function getUserByEmail(email: string): Promise<User[]> {
  try {
    return await db.select().from(user).where(eq(user.email, email));
  } catch (error) {
    console.error("Failed to get user from database");
    throw error;
  }
}
```

**Finding the Admin User (admin@agentdune.com):**
```typescript
// This would return the user record for admin@agentdune.com
const users = await getUserByEmail("admin@agentdune.com");
const adminUser = users[0];  // Get first result
```

### User ID Type:
- **Type:** `text` (string)
- **Unique:** Yes
- **Primary Key:** Yes
- **Required:** Yes

---

## 6. Database Tables and Collections for Chat Data

**Answer:** PostgreSQL has the following tables storing chat-related data:

### Tables Overview:

| Table | Purpose | Relationship |
|-------|---------|--------------|
| `Chat` | Chat sessions | Parent table, references `user.id` |
| `Message` | Chat messages | Child of `Chat`, cascade deletes |
| `Vote` | Message ratings | References `Chat` and `Message` |
| `Document` | Artifacts created in chat | References `Message` and `user.id` |
| `Suggestion` | Suggestions for documents | References `Document` |
| `user` | User accounts | Parent table |
| `session` | Auth sessions | References `user.id` |
| `account` | OAuth accounts | References `user.id` |
| `verification` | Email verification | User verification |
| `UserCredit` | User credit balance | References `user.id` |
| `UploadedDocument` | RAG documents | References `user.id` |
| `VectorStoreConfig` | Vector store config | Singleton config |

### Detailed Table Information:

#### Chat Table:
- **Name:** `Chat`
- **Primary Key:** `id` (UUID)
- **Foreign Key:** `userId` → `user.id`
- **Fields:** id, createdAt, updatedAt, title, userId, visibility, isPinned
- **Location:** Schema line 93-105

#### Message Table:
- **Name:** `Message`
- **Primary Key:** `id` (UUID)
- **Foreign Keys:**
  - `chatId` → `chat.id` (with CASCADE delete)
  - `parentMessageId` → `message.id` (optional, for branching)
- **Fields:** id, chatId, parentMessageId, role, parts, attachments, createdAt, annotations, isPartial, selectedModel, selectedTool, lastContext
- **Location:** Schema line 109-126

#### Vote Table:
- **Name:** `Vote`
- **Composite Primary Key:** (chatId, messageId)
- **Foreign Keys:**
  - `chatId` → `chat.id` (CASCADE delete)
  - `messageId` → `message.id` (CASCADE delete)
- **Fields:** chatId, messageId, isUpvoted
- **Location:** Schema line 130-148

#### User Table:
- **Name:** `user`
- **Primary Key:** `id` (text)
- **Unique Constraint:** `email`
- **Fields:** id, name, email, emailVerified, image, createdAt, updatedAt, role, banned, banReason, banExpires
- **Location:** Schema line 203-218

---

## 7. How to Delete All Chats for a User

### Complete Process:

**Step 1: Get User ID from Email**

```typescript
import { getUserByEmail } from "@/lib/db/queries";

const users = await getUserByEmail("admin@agentdune.com");
if (users.length === 0) {
  throw new Error("User not found");
}
const adminUser = users[0];
const userId = adminUser.id;
```

**Step 2: Get All Chats for User**

```typescript
import { getChatsByUserId } from "@/lib/db/queries";

const userChats = await getChatsByUserId({ id: userId });
console.log(`Found ${userChats.length} chats to delete`);
```

**Step 3: Delete Each Chat**

```typescript
import { deleteChatById } from "@/lib/db/queries";

for (const chat of userChats) {
  await deleteChatById({ id: chat.id });
  console.log(`Deleted chat: ${chat.title}`);
}
```

### Complete Script Example:

```typescript
import { getUserByEmail, getChatsByUserId, deleteChatById } from "@/lib/db/queries";

async function deleteAllUserChats(email: string) {
  try {
    // Step 1: Find user by email
    const users = await getUserByEmail(email);
    if (users.length === 0) {
      console.log(`User with email ${email} not found`);
      return;
    }

    const user = users[0];
    console.log(`Found user: ${user.name} (${user.email})`);

    // Step 2: Get all chats for this user
    const chats = await getChatsByUserId({ id: user.id });
    console.log(`User has ${chats.length} chats to delete`);

    // Step 3: Delete each chat
    for (const chat of chats) {
      await deleteChatById({ id: chat.id });
      console.log(`✓ Deleted chat: "${chat.title}" (${chat.id})`);
    }

    console.log(`All chats deleted for user: ${user.email}`);
  } catch (error) {
    console.error("Error deleting chats:", error);
    throw error;
  }
}

// Usage
await deleteAllUserChats("admin@agentdune.com");
```

### What Gets Deleted:

When `deleteChatById()` is called for each chat:

1. **All Messages** in the chat (CASCADE delete)
2. **All Attachments** (Vercel Blob storage) - cleaned up before deletion
3. **All Votes** on messages (CASCADE delete)
4. **All Documents** (artifacts) created in the chat (CASCADE delete via message deletion)

**NOTE:** The following are NOT automatically deleted:
- User credit records (separate from chats)
- User account
- User sessions

---

## 8. Attachment Cleanup Logic

When deleting chats and messages, attachments are cleaned up from Vercel Blob storage before database deletion.

File: `/Users/ashray/code/amxv/agentdune-chat/lib/db/queries.ts` (lines 693-716)

```typescript
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
      await del(attachmentUrls);  // Delete from Vercel Blob
    }
  } catch (error) {
    console.error("Failed to delete attachments from Vercel Blob:", error);
    // Don't throw here - we still want to proceed with message deletion
    // even if blob cleanup fails
  }
}
```

---

## 9. Admin User Management

For accessing and managing users as an admin, use the admin router:

File: `/Users/ashray/code/amxv/agentdune-chat/trpc/routers/admin.router.ts` (lines 11-88)

### List Users with Filters:
```typescript
adminRouter.listUsers({
  searchValue: "admin@agentdune.com",
  searchField: "email",
  limit: 10,
  offset: 0
})
```

This will return user details including:
- id, email, name, role, status, createdAt, banned, banReason, credits

---

## Key Files Reference

| File | Purpose | Lines |
|------|---------|-------|
| `/Users/ashray/code/amxv/agentdune-chat/lib/db/schema.ts` | Database schema definitions | 93-218 |
| `/Users/ashray/code/amxv/agentdune-chat/lib/db/client.ts` | Database client initialization | 1-23 |
| `/Users/ashray/code/amxv/agentdune-chat/lib/db/queries.ts` | Query functions including deletion | 36-99, 68-86 |
| `/Users/ashray/code/amxv/agentdune-chat/lib/auth.ts` | Authentication setup | 1-44 |
| `/Users/ashray/code/amxv/agentdune-chat/trpc/routers/chat.router.ts` | Chat TRPC endpoints | 201-218 |
| `/Users/ashray/code/amxv/agentdune-chat/trpc/routers/admin.router.ts` | Admin TRPC endpoints | 11-88 |

---

## Summary Table

| Question | Answer |
|----------|--------|
| **1. Database System** | PostgreSQL with Drizzle ORM |
| **2. Chat-User Association** | `Chat.userId` references `User.id` (foreign key) |
| **3. Data Model Location** | `/Users/ashray/code/amxv/agentdune-chat/lib/db/schema.ts` |
| **4. Delete Functions** | `deleteChatById()` in `/Users/ashray/code/amxv/agentdune-chat/lib/db/queries.ts:68-86` |
| **5. Auth System** | `better-auth` with admin plugin; user lookup via `getUserByEmail()` |
| **6. Chat Tables** | Chat, Message, Vote, Document, Suggestion, User, Session, Account, etc. |
| **7. Find User** | `await getUserByEmail("admin@agentdune.com")` returns User[] |
| **8. Delete All User Chats** | Get user → Get chats → Delete each chat via `deleteChatById()` |

