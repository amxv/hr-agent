import { adminRouter } from '@/trpc/routers/admin.router'
import { db } from '@/lib/db/client'
import type { Session } from '@/lib/auth'

/**
 * Creates a tRPC caller with specified user context
 */
export function createCaller(userId: string, role: 'admin' | 'user' = 'admin') {
  const mockSession: Session = {
    user: {
      id: userId,
      email: role === 'admin' ? 'admin@test.com' : 'user@test.com',
      name: role === 'admin' ? 'Test Admin' : 'Test User',
      role,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    session: {
      id: 'test-session-id',
      userId,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      token: 'test-token',
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  }

  return adminRouter.createCaller({
    db,
    user: mockSession.user,
    session: mockSession,
  })
}

/**
 * Pre-configured admin caller for tests
 */
export const adminCaller = createCaller('test-admin-id', 'admin')

/**
 * Pre-configured user caller for tests
 */
export const userCaller = createCaller('test-user-id', 'user')
