import { query } from '~/server/utils/db'
import { requireAdmin } from '~/server/utils/admin'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const { rows: admins } = await query(
    `SELECT id, user_id, email, role, created_at
     FROM admin_users
     ORDER BY created_at DESC`
  )

  return { admins }
})
