import { createError } from 'h3'
import { requireAuthUser } from '~/server/utils/auth'
import { query } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)

  try {
    const { rows } = await query(
      `SELECT id, title, created_at, genre, status
       FROM passages
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [user.id]
    )

    return { passages: rows }
  } catch (error) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to fetch passages.' })
  }
})
