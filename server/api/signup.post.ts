import { createError } from 'h3'
import { startAuthChallenge, upsertUserProfile } from '~/server/utils/store'

interface SignupBody {
  name?: string
  penName?: string
  email?: string
  password?: string
  timezone?: string
  bio?: string
  agreeOwnership?: boolean
  agreeTournament?: boolean
}

export default defineEventHandler(async (event) => {
  const body = await readBody<SignupBody>(event)

  if (!body.name || !body.penName || !body.email || !body.password || !body.timezone) {
    throw createError({
      statusCode: 400,
      statusMessage: 'name, penName, email, password and timezone are required.'
    })
  }

  if (!body.agreeOwnership || !body.agreeTournament) {
    throw createError({
      statusCode: 400,
      statusMessage: 'You must accept the ownership terms and tournament rules.'
    })
  }

  const user = await upsertUserProfile({
    name: body.name,
    penName: body.penName,
    email: body.email,
    timezone: body.timezone,
    password: body.password,
    bio: body.bio
  })

  const { challenge } = await startAuthChallenge(body.email)

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
