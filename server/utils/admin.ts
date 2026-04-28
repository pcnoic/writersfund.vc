import { createError } from 'h3'
import type { H3Event } from 'h3'
import { verifyToken, extractTokenFromHeader, getTokenFromCookie } from '~/server/utils/jwt'
import { queryOne } from '~/server/utils/db'

export async function requireAdmin(event: H3Event) {
  // Try to get token from cookie or auth header
  let token = getCookie(event, 'auth_token')
  if (!token) {
    const authHeader = getHeader(event, 'authorization')
    token = extractTokenFromHeader(authHeader)
  }

  if (!token) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Authentication required.',
    })
  }

  const payload = verifyToken(token)
  if (!payload) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Invalid or expired token.',
    })
  }

  // Check if user is admin
  const user = await queryOne<{ is_admin: boolean }>(
    'SELECT is_admin FROM users WHERE id = $1',
    [payload.userId]
  )

  if (!user?.is_admin) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Admin access required.',
    })
  }

  return { userId: payload.userId, isAdmin: true }
}
