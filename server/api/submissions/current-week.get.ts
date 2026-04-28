import { requireAuthUser } from '~/server/utils/auth'
import { queryOne } from '~/server/utils/db'

function getWeekStart(): Date {
  const now = new Date()
  const dayOfWeek = now.getUTCDay()
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const monday = new Date(now)
  monday.setUTCDate(now.getUTCDate() - diff)
  monday.setUTCHours(0, 0, 0, 0)
  return monday
}

export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)
  const weekStart = getWeekStart()

  const submission = await queryOne(
    `SELECT id, title, genre, content, narrative, word_count, created_at
     FROM passages
     WHERE user_id = $1
       AND kind = 'writer'
       AND created_at >= $2
     ORDER BY created_at DESC
     LIMIT 1`,
    [user.id, weekStart.toISOString()]
  )

  return {
    hasSubmission: !!submission,
    submission: submission || null
  }
})
