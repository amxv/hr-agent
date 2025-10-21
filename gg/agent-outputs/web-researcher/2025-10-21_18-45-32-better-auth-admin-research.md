# Better Auth Admin Plugin & Email/Password Authentication Research

**Date**: October 21, 2025
**Sources**: Official Better Auth Documentation, Best Practices Guides

## Summary

Better Auth provides a comprehensive admin plugin for user management combined with built-in email/password authentication. This research covers configuration, implementation patterns, security best practices, and migration strategies for building an admin user management system.

---

## 1. Better Auth Admin Plugin Overview

### What It Does

The Admin plugin provides administrative functions for user management including:
- Creating users programmatically
- Managing user roles and permissions
- Banning/unbanning users
- Setting user passwords
- Impersonating users for testing
- Listing and filtering users
- Session management and revocation

**Source**: https://www.better-auth.com/docs/plugins/admin

### Installation & Setup

#### Step 1: Add Plugin to Server Config

```typescript
// auth.ts
import { betterAuth } from "better-auth"
import { admin } from "better-auth/plugins"

export const auth = betterAuth({
    // ... other config options
    plugins: [
        admin()
    ]
})
```

#### Step 2: Run Database Migration

```bash
npx @better-auth/cli migrate
```

This adds the following fields to the `user` table:
- `role` (string) - User's role, defaults to "user"
- `banned` (boolean) - Whether user is banned
- `banReason` (string) - Reason for ban
- `banExpires` (date) - When ban expires

And to the `session` table:
- `impersonatedBy` (string) - ID of admin impersonating this session

#### Step 3: Add Client Plugin

```typescript
// auth-client.ts
import { createAuthClient } from "better-auth/client"
import { adminClient } from "better-auth/client/plugins"

export const authClient = createAuthClient({
    plugins: [
        adminClient()
    ]
})
```

---

## 2. Email/Password Authentication Configuration

### Basic Setup

Enable email/password authentication in your auth config:

```typescript
import { betterAuth } from "better-auth";

export const auth = betterAuth({
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Set to true if you want email verification
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
});
```

**Source**: https://www.better-auth.com/docs/authentication/email-password

### Password Hashing

Better Auth uses **scrypt** by default for password hashing, which is:
- Designed to be slow and memory-intensive to prevent brute-force attacks
- OWASP recommended (especially when Argon2id is not available)
- Natively supported by Node.js

You can override with a custom hasher:

```typescript
export const auth = betterAuth({
  emailAndPassword: {
    password: {
      hash: async (password) => {
        // Your custom hashing function
        return hashedPassword;
      },
      verify: async ({ hash, password }) => {
        // Your custom verification function
        return isValid;
      }
    }
  }
})
```

### Email Verification (Optional)

```typescript
export const auth = betterAuth({
  emailVerification: {
    sendVerificationEmail: async ({ user, url, token }, request) => {
      await sendEmail({
        to: user.email,
        subject: "Verify your email address",
        text: `Click the link to verify your email: ${url}`,
      });
    },
  },
  emailAndPassword: {
    requireEmailVerification: true, // Force users to verify email before login
  },
});
```

---

## 3. Admin Plugin: User Management Operations

### 3.1 Create User (Admin Operation)

The admin can create users with email/password, assign roles, and set custom fields:

```typescript
// Client-side
const { data: newUser, error } = await authClient.admin.createUser({
  email: "user@example.com",     // required
  password: "secure-password",   // required
  name: "John Doe",              // required
  role: "user",                  // optional, defaults to "user"
  data: { customField: "value" }, // optional custom fields
});

// Server-side
const newUser = await auth.api.createUser({
  body: {
    email: "user@example.com",
    password: "secure-password",
    name: "John Doe",
    role: "user",
    data: { customField: "value" },
  },
  headers: await headers(), // Session cookies required
});
```

**Key Points**:
- Only authenticated admins can use this endpoint
- Password is required (no auto-generation by framework)
- You must implement your own password generation strategy
- Returns the created user object

### 3.2 List Users

Retrieve all users with powerful filtering, searching, and pagination:

```typescript
const { data: users, error } = await authClient.admin.listUsers({
  query: {
    searchValue: "John",
    searchField: "name", // "email" or "name"
    searchOperator: "contains", // "contains", "starts_with", "ends_with"
    limit: 50,
    offset: 0,
    sortBy: "name",
    sortDirection: "desc", // "asc" or "desc"
    filterField: "role",
    filterValue: "admin",
    filterOperator: "eq", // "eq", "ne", "lt", "lte", "gt", "gte"
  },
});

// Response includes pagination metadata
console.log(users.total);     // Total users matching filter
console.log(users.limit);     // Limit from query
console.log(users.offset);    // Offset from query
```

**Pagination Formula**:
```typescript
const pageSize = 10;
const currentPage = 2;
const totalPages = Math.ceil(total / pageSize);
const nextOffset = Math.min(offset + limit, total - 1);
const prevOffset = Math.max(0, offset - limit);
```

### 3.3 Set User Role

Change a user's role (single or multiple):

```typescript
await authClient.admin.setRole({
  userId: "user-id",
  role: "admin", // or ["admin", "moderator"] for multiple roles
});
```

### 3.4 Set User Password (Admin-Initiated)

Admin can set a user's password without requiring old password:

```typescript
await authClient.admin.setUserPassword({
  userId: "user-id",
  newPassword: "new-secure-password",
});
```

**Use Case**: When an admin creates a user or needs to reset a user's password.

### 3.5 Update User Details

```typescript
await authClient.admin.updateUser({
  userId: "user-id",
  data: { name: "Jane Doe", customField: "new-value" },
});
```

### 3.6 Ban/Unban User

Prevents user from signing in and revokes all sessions:

```typescript
// Ban user
await authClient.admin.banUser({
  userId: "user-id",
  banReason: "Spamming",
  banExpiresIn: 60 * 60 * 24 * 7, // 7 days, undefined = permanent
});

// Unban user
await authClient.admin.unbanUser({
  userId: "user-id",
});
```

**Note**: Ban can be temporary (with expiration) or permanent.

### 3.7 Session Management

```typescript
// List user sessions
const sessions = await authClient.admin.listUserSessions({
  userId: "user-id",
});

// Revoke specific session
await authClient.admin.revokeUserSession({
  sessionToken: "session_token_here",
});

// Revoke all sessions
await authClient.admin.revokeUserSessions({
  userId: "user-id",
});
```

### 3.8 Remove User (Hard Delete)

```typescript
const deletedUser = await authClient.admin.removeUser({
  userId: "user-id",
});
```

**Warning**: This is a hard delete. Consider soft delete strategy for audit trails.

### 3.9 Impersonate User

Admin can create a session as another user (for debugging):

```typescript
const { data, error } = await authClient.admin.impersonateUser({
  userId: "user-id",
});

// Stop impersonating
await authClient.admin.stopImpersonating();
```

**Default Duration**: 1 hour (configurable via `impersonationSessionDuration` option)

---

## 4. Role-Based Authorization (RBAC)

### Default Roles

- **admin**: Full control over all resources and users
- **user**: No control over other users (default)

An admin is:
1. Any user with the `admin` role, OR
2. Any user ID in the `adminUserIds` option

### Custom Roles & Permissions

Define fine-grained permissions:

```typescript
// permissions.ts
import { createAccessControl } from "better-auth/plugins/access";

const statement = {
  project: ["create", "share", "update", "delete"],
  user: ["create", "list", "ban", "delete"],
} as const;

const ac = createAccessControl(statement);

// Create roles with specific permissions
export const memberRole = ac.newRole({
  project: ["create"],
  user: [], // No permissions
});

export const adminRole = ac.newRole({
  project: ["create", "update", "delete"],
  user: ["create", "list", "ban", "delete"],
});
```

### Pass Roles to Plugin

```typescript
// auth.ts
import { admin as adminPlugin } from "better-auth/plugins"
import { ac, adminRole, memberRole } from "@/auth/permissions"

export const auth = betterAuth({
  plugins: [
    adminPlugin({
      ac,
      roles: {
        admin: adminRole,
        user: memberRole,
      }
    }),
  ],
});

// auth-client.ts
export const authClient = createAuthClient({
  plugins: [
    adminClient({
      ac,
      roles: {
        admin: adminRole,
        user: memberRole,
      }
    })
  ]
})
```

### Check Permissions

```typescript
// Client-side check (synchronous)
const canCreateProject = authClient.admin.checkRolePermission({
  role: "admin",
  permissions: { project: ["create"] },
});

// Server-side check (for authenticated user)
const canDelete = await authClient.admin.hasPermission({
  userId: "user-id",
  permissions: { user: ["delete"] },
});

// Server-side check by role
await auth.api.userHasPermission({
  body: {
    role: "admin",
    permissions: { user: ["delete"] },
  },
});
```

---

## 5. Admin Plugin Configuration Options

```typescript
admin({
  // Default role for new users
  defaultRole: "user",

  // Roles that can perform admin operations
  adminRoles: ["admin", "superadmin"],

  // User IDs with admin access (even without admin role)
  adminUserIds: ["user_id_1", "user_id_2"],

  // Duration of impersonation sessions (seconds)
  impersonationSessionDuration: 60 * 60 * 24, // 1 day

  // Default reason when admin bans user
  defaultBanReason: "No reason",

  // Default ban expiration (seconds), undefined = never expires
  defaultBanExpiresIn: undefined,

  // Message shown to banned users on login
  bannedUserMessage: "You have been banned from this application.",
})
```

---

## 6. Implementing User Deactivation (Soft Delete)

Better Auth doesn't have built-in soft delete yet (planned for future), but you can implement it using additional fields:

### Strategy 1: Use Admin Plugin Ban System

```typescript
// Deactivate user
await authClient.admin.banUser({
  userId: "user-id",
  banReason: "User deactivated",
  // No expiration = permanent deactivation
});

// Reactivate user
await authClient.admin.unbanUser({
  userId: "user-id",
});
```

**Pros**: Simple, built-in, prevents login automatically
**Cons**: Designed for temporary bans conceptually

### Strategy 2: Custom Status Field

Add a custom `status` field to the user table:

```typescript
export const auth = betterAuth({
  user: {
    additionalFields: {
      status: {
        type: "string", // "active", "inactive", "suspended"
        defaultValue: "active",
        returned: true,
        input: true,
      },
    },
  },
});
```

Then create middleware to check status:

```typescript
// middleware.ts
import { auth } from "@/auth";

export async function checkUserStatus(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (session?.user?.status !== "active") {
    // Revoke all sessions
    await auth.api.revokeUserSessions({
      body: { userId: session.user.id },
      headers: request.headers,
    });

    return new Response("User account is inactive", { status: 403 });
  }

  return null; // User is active
}
```

**Pros**: Flexible, clear intent, audit trail via timestamps
**Cons**: Requires manual middleware/checks

---

## 7. Password Generation Best Practices

### Recommended Approach

Use Node.js built-in utilities with cryptographic randomness:

```typescript
import { randomBytes } from "crypto";

function generateSecurePassword(length = 16): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?";
  const randomBuffer = randomBytes(length);
  let password = "";

  for (let i = 0; i < length; i++) {
    const randomIndex = randomBuffer[i] % chars.length;
    password += chars[randomIndex];
  }

  return password;
}
```

### Using generate-password Package

```typescript
import generator from "generate-password";

const password = generator.generate({
  length: 16,
  numbers: true,
  symbols: true,
  uppercase: true,
  lowercase: true,
  strict: true, // Ensure all types are included
});
```

### Best Practices (from OWASP & Security Standards)

1. **Length**: Minimum 12-16 characters for admin-generated passwords
2. **Entropy**: Include uppercase, lowercase, numbers, and symbols
3. **Randomness**: Always use cryptographically secure random generators
4. **Never Pre-Hash**: Always send plaintext to server over HTTPS
5. **Server-Side Hashing**: Let Better Auth's scrypt handle hashing
6. **Temporary Passwords**: Consider expiring generated passwords after first login
7. **Force Change on First Login**: Require users to set their own password immediately

### Implementation Pattern

```typescript
import generator from "generate-password";

async function createUserWithGeneratedPassword(
  email: string,
  name: string,
  role: string
) {
  // Generate temporary password
  const tempPassword = generator.generate({
    length: 16,
    numbers: true,
    symbols: true,
    uppercase: true,
    lowercase: true,
    strict: true,
  });

  // Create user via admin plugin
  const { data: newUser, error } = await authClient.admin.createUser({
    email,
    password: tempPassword, // Better Auth will hash this with scrypt
    name,
    role,
    data: {
      mustChangePassword: true, // Custom field
      generatedAt: new Date(),
    },
  });

  if (error) {
    throw new Error(`Failed to create user: ${error.message}`);
  }

  // Send password to user via secure channel
  await sendSecureEmail({
    to: email,
    subject: "Your temporary admin password",
    body: `Your temporary password: ${tempPassword}\n\nYou must change this password on first login.`,
  });

  return newUser;
}
```

---

## 8. Custom User Fields

### Define Additional Fields

```typescript
export const auth = betterAuth({
  user: {
    additionalFields: {
      department: {
        type: "string",
        required: false,
        input: true,
        returned: true,
      },
      status: {
        type: "string", // "active", "inactive", "suspended"
        defaultValue: "active",
      },
      lastLoginAt: {
        type: "date",
        returned: true,
        input: false,
      },
      mustChangePassword: {
        type: "boolean",
        defaultValue: false,
      },
    },
  },
});
```

### Use Custom Fields

```typescript
// During user creation
await authClient.admin.createUser({
  email: "user@example.com",
  password: "password123",
  name: "John Doe",
  data: {
    department: "Engineering",
    status: "active",
    mustChangePassword: true,
  },
});

// Update custom fields
await authClient.admin.updateUser({
  userId: "user-id",
  data: {
    department: "Marketing",
    lastLoginAt: new Date(),
  },
});
```

### Access Custom Fields

```typescript
const session = await authClient.getSession();
console.log(session.user.department);
console.log(session.user.status);
```

---

## 9. Database Hooks for Lifecycle Events

Better Auth provides hooks for custom logic at various points:

```typescript
export const auth = betterAuth({
  databaseHooks: {
    user: {
      create: async (user) => {
        console.log("User created:", user.email);
        // Send welcome email, log to analytics, etc.
        return user;
      },
      update: async (user) => {
        console.log("User updated:", user.id);
        return user;
      },
      delete: async (user) => {
        console.log("User deleted:", user.email);
        return user;
      },
    },
  },
});
```

**Use Cases**:
- Audit logging
- Triggering workflows
- Updating denormalized data
- Sending notifications

---

## 10. Migrating from OAuth to Email/Password

### Overview

Migration strategy depends on your existing auth system:

1. **Gradual Migration** (Recommended):
   - Users can login via existing OAuth
   - On first login, automatically create email/password account
   - Use account linking to connect both providers

2. **Direct Export & Import**:
   - Export users and password hashes from old system
   - Import into Better Auth database
   - Send password reset emails to all users

### Gradual Migration Setup

```typescript
export const auth = betterAuth({
  emailAndPassword: {
    enabled: true,
  },
  account: {
    accountLinking: {
      enabled: true,
      // Trust these providers to safely link accounts
      trustedProviders: ["google", "github", "email-password"],
      allowDifferentEmails: false,
    },
  },
  socialProviders: {
    google: { /* ... */ },
    github: { /* ... */ },
  },
  databaseHooks: {
    account: {
      create: async (account) => {
        // Track when OAuth accounts are first linked
        console.log("Account linked:", account.userId);
        return account;
      },
    },
  },
});
```

### Send Password Reset After Import

For users imported from old system:

```typescript
async function setupNewUserPassword(userId: string, email: string) {
  // Request password reset
  const { data, error } = await authClient.requestPasswordReset({
    email,
    redirectTo: "/auth/reset-password",
  });

  if (!error) {
    // Send custom email with instructions
    await sendEmail({
      to: email,
      subject: "Set your password for [App Name]",
      body: "We've migrated to a new authentication system...",
    });
  }
}
```

---

## 11. Best Practices Summary

### Security

1. **Always hash on server**: Use Better Auth's built-in scrypt hashing
2. **Use HTTPS**: Transport passwords securely
3. **Rate limiting**: Implement on login endpoints to prevent brute force
4. **Session management**: Use admin plugin's session revocation for deactivated users
5. **Audit logs**: Track all admin operations (user creation, password changes, etc.)

### User Management

1. **Temporary passwords**: Generate strong, temporary passwords for admin-created users
2. **Force password change**: Require users to set their own password on first login
3. **Email verification**: Enable for security, disable for faster onboarding
4. **Deactivation not deletion**: Use ban or status field instead of hard delete
5. **Graceful degradation**: Handle inactive users in middleware

### Admin Operations

1. **Permission checks**: Always verify admin permissions before operations
2. **Audit trails**: Log all user management operations
3. **Batch operations**: For bulk changes, implement custom endpoints
4. **Error handling**: Provide meaningful error messages for failed operations
5. **Pagination**: Always paginate large user lists (use 50-100 per page)

### Permissions

1. **Principle of least privilege**: Grant minimal necessary permissions
2. **Role composition**: Build roles from base permissions
3. **Regular reviews**: Audit role assignments quarterly
4. **Immutable operations**: Once admin role assigned, require multiple approvals to remove

---

## 12. Implementation Checklist

- [ ] Install Better Auth with admin plugin
- [ ] Run database migrations
- [ ] Enable email/password authentication
- [ ] Configure email sending (verification, password reset)
- [ ] Define custom user fields (status, mustChangePassword, etc.)
- [ ] Define role-based permissions
- [ ] Create password generation utility
- [ ] Implement admin user creation endpoint
- [ ] Add user listing/filtering UI
- [ ] Add user deactivation/reactivation logic
- [ ] Implement session revocation for inactive users
- [ ] Add audit logging for admin operations
- [ ] Set up middleware to check user status
- [ ] Test migration path from OAuth to email/password
- [ ] Document password requirements for users

---

## 13. Key Resources

| Resource | URL |
|----------|-----|
| Admin Plugin Docs | https://www.better-auth.com/docs/plugins/admin |
| Email/Password Docs | https://www.better-auth.com/docs/authentication/email-password |
| Options Reference | https://www.better-auth.com/docs/reference/options |
| Security Guide | https://www.better-auth.com/docs/reference/security |
| Database Concepts | https://www.better-auth.com/docs/concepts/database |
| TypeScript Guide | https://www.better-auth.com/docs/concepts/typescript |
| Hooks Documentation | https://www.better-auth.com/docs/concepts/hooks |

---

## 14. Code Examples Repository

The Better Auth GitHub repository contains examples:
- https://github.com/better-auth/better-auth
- Migration guides available in `/docs`
- Example applications in `/examples`

---

## Notes

- **Soft Delete Future**: Better Auth team plans to add built-in soft delete support (likely via `advanced.database.softDelete`)
- **Password Generation**: Always use cryptographically secure randomness (Node.js `crypto` module)
- **Migration Tooling**: No built-in migration tool yet; consider gradual account linking approach
- **Version**: Documentation current as of Better Auth v1.x stable
