import { createError } from 'h3'
import { writeSessionCookie } from '~/server/utils/auth'
import { verifyAuthChallenge } from '~/server/utils/store'

interface AuthVerifyBody {
  email?: string
  code?: string
}

export default defineEventHandler(async (event) => {
  const body = await readBody<AuthVerifyBody>(event)

  if (!body.email || !body.code) {
    throw createError({ statusCode: 400, statusMessage: 'email and code are required.' })
  }

  const { session, user } = await verifyAuthChallenge(body.email, body.code)
  writeSessionCookie(event, session.id)

  return {
    user: {
      id: user.id,
      name: user.name,
      penName: user.penName,
      email: user.email,
      timezone: user.timezone,
      bio: user.bio || ''
    },
    session: {
      expiresAt: session.expiresAt
    }
  }
})
