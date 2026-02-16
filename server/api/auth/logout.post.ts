import { getCookie } from 'h3'
import { clearSessionCookie, SESSION_COOKIE } from '~/server/utils/auth'
import { revokeSession } from '~/server/utils/store'

export default defineEventHandler(async (event) => {
  const sessionId = getCookie(event, SESSION_COOKIE) ?? ''
  if (sessionId) {
    await revokeSession(sessionId)
  }

  clearSessionCookie(event)
  return { ok: true }
})
