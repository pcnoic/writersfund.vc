import { serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    return { user: null }
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      metadata: user.user_metadata || {}
    }
  }
})
