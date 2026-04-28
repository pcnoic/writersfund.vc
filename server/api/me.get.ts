import { getAuthUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await getAuthUser(event)
  if (!user) {
    return { user: null }
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      metadata: {
        name: user.name,
        pen_name: user.pen_name,
        timezone: user.timezone,
        bio: user.bio || ''
      }
    }
  }
})
