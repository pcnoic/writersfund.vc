import { serverSupabaseClient } from '#supabase/server'
import { requireAdmin } from '~/server/utils/admin'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const supabase = await serverSupabaseClient(event)

  const { data: admins, error } = await supabase
    .from('admin_users')
    .select(`
      id,
      user_id,
      email,
      role,
      created_at
    `)
    .order('created_at', { ascending: false })

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message
    })
  }

  return { admins: admins || [] }
})
