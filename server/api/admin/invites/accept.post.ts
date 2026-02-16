import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

interface AcceptInviteBody {
  token?: string
}

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Authentication required.'
    })
  }

  const body = await readBody<AcceptInviteBody>(event)

  if (!body.token) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invite token is required.'
    })
  }

  const supabase = await serverSupabaseClient(event)

  // Find the invite
  const { data: invite } = await supabase
    .from('admin_invites')
    .select('id, email, expires_at, used_at, created_by')
    .eq('token', body.token)
    .maybeSingle()

  if (!invite) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Invalid invite token.'
    })
  }

  if (invite.used_at) {
    throw createError({
      statusCode: 410,
      statusMessage: 'This invite has already been used.'
    })
  }

  if (new Date(invite.expires_at) < new Date()) {
    throw createError({
      statusCode: 410,
      statusMessage: 'This invite has expired.'
    })
  }

  // Verify email matches
  if (invite.email.toLowerCase() !== user.email?.toLowerCase()) {
    throw createError({
      statusCode: 403,
      statusMessage: 'This invite was sent to a different email address.'
    })
  }

  // Create admin user
  const { error: insertError } = await supabase
    .from('admin_users')
    .insert({
      user_id: user.id,
      email: user.email,
      role: 'admin',
      created_by: invite.created_by
    })

  if (insertError) {
    throw createError({
      statusCode: 500,
      statusMessage: insertError.message
    })
  }

  // Mark invite as used
  await supabase
    .from('admin_invites')
    .update({ used_at: new Date().toISOString() })
    .eq('id', invite.id)

  return { ok: true, message: 'You are now an admin.' }
})
