import { queryOne } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const data = await queryOne(
    `SELECT id, name, season, status, created_at
     FROM tournaments
     WHERE status = 'active'
     ORDER BY created_at DESC
     LIMIT 1`
  )

  return data || null
})
