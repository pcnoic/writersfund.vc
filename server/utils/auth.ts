import { createError, getHeader } from 'h3'
import type { H3Event } from 'h3'
import { extractTokenFromHeader, verifyToken } from '~/server/utils/jwt'
import { queryOne } from '~/server/utils/db'

export interface AuthUser {
  id: string
  email: string
  name: string
  pen_name: string
  timezone: string
  bio: string | null
  is_admin: boolean
}

export async function getAuthUser(event: H3Event): Promise<AuthUser | null> {
  let token = getCookie(event, 'auth_token')
  if (!token) {
    token = extractTokenFromHeader(getHeader(event, 'authorization'))
  }

  if (!token) return null

  const payload = verifyToken(token)
  if (!payload) return null

  const user = await queryOne<AuthUser>(
    `SELECT id, email, name, pen_name, timezone, bio, is_admin
     FROM users
     WHERE id = $1`,
    [payload.userId]
  )

  return user
}

export async function requireAuthUser(event: H3Event): Promise<AuthUser> {
  const user = await getAuthUser(event)
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Authentication required.',
    })
  }
  return user
}
