import { getAuthUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await getAuthUser(event)
  if (!user) {
    return { isAdmin: false }
  }

  if (user.is_admin) {
    return { isAdmin: true }
  }

  return { isAdmin: false }
})
