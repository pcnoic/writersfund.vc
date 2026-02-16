import { createError } from 'h3'
import type { H3Event } from 'h3'
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

const SUPER_ADMIN_EMAIL = 'pcnoic@gmail.com'

export async function requireAdmin(event: H3Event) {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Authentication required.'
    })
  }

  const supabase = await serverSupabaseClient(event)

  // Check if user is in admin_users table
  const { data: adminUser } = await supabase
    .from('admin_users')
    .select('id, role')
    .eq('user_id', user.id)
    .maybeSingle()

  // Also allow the super admin email directly (bootstrap case)
  if (!adminUser && user.email !== SUPER_ADMIN_EMAIL) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Admin access required.'
    })
  }

  return {
    user,
    adminUser,
    isSuperAdmin: user.email === SUPER_ADMIN_EMAIL || adminUser?.role === 'super_admin'
  }
}

export function generateInviteToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let token = ''
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return token
}
