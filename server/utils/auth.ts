import { getCookie, setCookie } from 'h3'
import type { H3Event } from 'h3'
import { createError } from 'h3'
import type { User } from '~/types/domain'
import { getUserBySession } from './store'

export const SESSION_COOKIE = 'wf_session'

export function writeSessionCookie(event: H3Event, sessionId: string): void {
  setCookie(event, SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7,
    path: '/'
  })
}

export function clearSessionCookie(event: H3Event): void {
  setCookie(event, SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 0,
    path: '/'
  })
}

export async function getAuthUser(event: H3Event): Promise<User | null> {
  const sessionId = getCookie(event, SESSION_COOKIE) ?? ''
  if (!sessionId) return null
  return getUserBySession(sessionId)
}

export async function requireAuthUser(event: H3Event): Promise<User> {
  const user = await getAuthUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Authentication required.' })
  }

  return user
}
