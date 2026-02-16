import { createError } from 'h3'
import type { H3Event } from 'h3'
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

export async function requireAdmin(event: H3Event) {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Authentication required.'
    })
  }

  const supabase = await serverSupabaseClient(event)

  const { data: dbUser } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle()

  if (!dbUser?.is_admin) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Admin access required.'
    })
  }

  return { user, isAdmin: true }
}
