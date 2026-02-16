import { serverSupabaseClient } from '#supabase/server'
import { requireAdmin } from '~/server/utils/admin'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const supabase = await serverSupabaseClient(event)

  const { data: invites, error } = await supabase
    .from('admin_invites')
    .select(`
      id,
      email,
      token,
      expires_at,
      used_at,
      created_at,
      created_by
    `)
    .order('created_at', { ascending: false })

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message
    })
  }

  return { invites: invites || [] }
})
