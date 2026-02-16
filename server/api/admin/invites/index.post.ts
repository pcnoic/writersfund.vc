import { serverSupabaseClient } from '#supabase/server'
import { requireAdmin, generateInviteToken } from '~/server/utils/admin'

interface CreateInviteBody {
  email?: string
}

export default defineEventHandler(async (event) => {
  const { adminUser } = await requireAdmin(event)

  const body = await readBody<CreateInviteBody>(event)

  if (!body.email) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Email is required.'
    })
  }

  const supabase = await serverSupabaseClient(event)

  // Check if email is already an admin
  const { data: existingAdmin } = await supabase
    .from('admin_users')
    .select('id')
    .eq('email', body.email)
    .maybeSingle()

  if (existingAdmin) {
    throw createError({
      statusCode: 409,
      statusMessage: 'This email is already an admin.'
    })
  }

  // Check if there's already a pending invite
  const { data: existingInvite } = await supabase
    .from('admin_invites')
    .select('id')
    .eq('email', body.email)
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  if (existingInvite) {
    throw createError({
      statusCode: 409,
      statusMessage: 'A pending invite already exists for this email.'
    })
  }

  const token = generateInviteToken()
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7) // 7 day expiry

  // Get admin user id for created_by
  let createdById = adminUser?.id
  if (!createdById) {
    // Bootstrap case - create admin record first
    const user = await serverSupabaseUser(event)
    const { data: newAdmin } = await supabase
      .from('admin_users')
      .insert({
        user_id: user!.id,
        email: user!.email,
        role: 'super_admin'
      })
      .select('id')
      .single()
    createdById = newAdmin?.id
  }

  const { data: invite, error } = await supabase
    .from('admin_invites')
    .insert({
      email: body.email,
      token,
      expires_at: expiresAt.toISOString(),
      created_by: createdById
    })
    .select()
    .single()

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message
    })
  }

  return {
    invite,
    inviteUrl: `/admin/accept-invite?token=${token}`
  }
})
