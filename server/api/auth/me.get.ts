import { queryOne } from '~/server/utils/db'
import { getTokenFromCookie, extractTokenFromHeader, verifyToken } from '~/server/utils/jwt'

export default defineEventHandler(async (event) => {
  // Try to get token from cookie or auth header
  const cookieHeader = getCookie(event, 'auth_token')
  const authHeader = getHeader(event, 'authorization')

  let token = cookieHeader
  if (!token) {
    token = extractTokenFromHeader(authHeader)
  }

  if (!token) {
    return { user: null }
  }

  const payload = verifyToken(token)
  if (!payload) {
    return { user: null }
  }

  // Fetch full user data
  const user = await queryOne(
    `SELECT id, email, name, pen_name, is_admin, created_at 
     FROM users WHERE id = $1`,
    [payload.userId]
  )

  if (!user) {
    return { user: null }
  }

  return { user }
})
