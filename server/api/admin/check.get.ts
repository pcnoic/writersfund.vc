import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

const SUPER_ADMIN_EMAIL = 'pcnoic@gmail.com'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    return { isAdmin: false }
  }

  // Super admin email always has access
  if (user.email === SUPER_ADMIN_EMAIL) {
    return { isAdmin: true, role: 'super_admin' }
  }

  const supabase = await serverSupabaseClient(event)

  const { data: adminUser } = await supabase
    .from('admin_users')
    .select('id, role')
    .eq('user_id', user.id)
    .maybeSingle()

  if (adminUser) {
    return { isAdmin: true, role: adminUser.role }
  }

  return { isAdmin: false }
})
