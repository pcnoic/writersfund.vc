import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    return { isAdmin: false }
  }

  const supabase = await serverSupabaseClient(event)

  const { data: dbUser } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle()

  if (dbUser?.is_admin) {
    return { isAdmin: true }
  }

  return { isAdmin: false }
})
