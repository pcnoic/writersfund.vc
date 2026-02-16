import { createError } from 'h3'
import { startAuthChallenge } from '~/server/utils/store'

interface AuthStartBody {
  email?: string
}

export default defineEventHandler(async (event) => {
  const body = await readBody<AuthStartBody>(event)

  if (!body.email) {
    throw createError({ statusCode: 400, statusMessage: 'email is required.' })
  }

  const { challenge, user } = await startAuthChallenge(body.email)

  return {
    user: {
      id: user.id,
      name: user.name,
      penName: user.penName,
      email: user.email,
      timezone: user.timezone,
      bio: user.bio || ''
    },
    challenge: {
      expiresAt: challenge.expiresAt,
      previewCode: challenge.code
    }
  }
})
