import { createError, getRequestURL } from 'h3'
import { serverSupabaseUser } from '#supabase/server'

const protectedPrefixes = [
  '/api/ballots',
  '/api/votes',
  '/api/passages',
  '/api/applications',
  '/api/profile',
  '/api/leaderboard'
]

export default defineEventHandler(async (event) => {
  const { pathname } = getRequestURL(event)

  const isProtected = protectedPrefixes.some((prefix) => pathname.startsWith(prefix))
  if (!isProtected) {
    return
  }

  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Sign in first to use this endpoint.' })
  }

  event.context.authUser = user
})
