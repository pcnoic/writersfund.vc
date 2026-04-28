import { query, queryOne } from '~/server/utils/db'
import { requireAdmin } from '~/server/utils/admin'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const [
    usersCount,
    passagesCount,
    votesCount,
    matchupsCount,
    recentPassagesResult,
    recentUsersResult,
    passagesByStatusResult,
    passagesByGenreResult
  ] = await Promise.all([
    queryOne<{ count: string }>(`SELECT COUNT(*)::text AS count FROM users`),
    queryOne<{ count: string }>(`SELECT COUNT(*)::text AS count FROM passages WHERE kind = 'writer'`),
    queryOne<{ count: string }>(`SELECT COUNT(*)::text AS count FROM votes`),
    queryOne<{ count: string }>(`SELECT COUNT(*)::text AS count FROM matchups`),
    query(`
      SELECT id, title, genre, status, word_count, created_at
      FROM passages
      WHERE kind = 'writer'
      ORDER BY created_at DESC
      LIMIT 10
    `),
    query(`
      SELECT id, name, pen_name, email, created_at
      FROM users
      ORDER BY created_at DESC
      LIMIT 10
    `),
    query(`SELECT status FROM passages WHERE kind = 'writer'`),
    query(`SELECT genre FROM passages WHERE kind = 'writer'`)
  ])

  const totalUsers = Number(usersCount?.count || '0')
  const totalPassages = Number(passagesCount?.count || '0')
  const totalVotes = Number(votesCount?.count || '0')
  const totalMatchups = Number(matchupsCount?.count || '0')
  const recentPassages = recentPassagesResult.rows
  const recentUsers = recentUsersResult.rows
  const passagesByStatus = passagesByStatusResult.rows
  const passagesByGenre = passagesByGenreResult.rows

  // Aggregate status counts
  const statusCounts: Record<string, number> = {}
  for (const p of passagesByStatus || []) {
    statusCounts[p.status] = (statusCounts[p.status] || 0) + 1
  }

  // Aggregate genre counts
  const genreCounts: Record<string, number> = {}
  for (const p of passagesByGenre || []) {
    genreCounts[p.genre] = (genreCounts[p.genre] || 0) + 1
  }

  // Get submissions per day for the last 7 days
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  
  const { rows: recentSubmissions } = await query(
    `SELECT created_at
     FROM passages
     WHERE kind = 'writer' AND created_at >= $1`,
    [sevenDaysAgo.toISOString()]
  )

  const submissionsByDay: Record<string, number> = {}
  for (const p of recentSubmissions || []) {
    const day = new Date(p.created_at).toISOString().split('T')[0]
    submissionsByDay[day] = (submissionsByDay[day] || 0) + 1
  }

  // Get signups per day for the last 7 days
  const { rows: recentSignups } = await query(
    `SELECT created_at
     FROM users
     WHERE created_at >= $1`,
    [sevenDaysAgo.toISOString()]
  )

  const signupsByDay: Record<string, number> = {}
  for (const u of recentSignups || []) {
    const day = new Date(u.created_at).toISOString().split('T')[0]
    signupsByDay[day] = (signupsByDay[day] || 0) + 1
  }

  return {
    overview: {
      totalUsers: totalUsers || 0,
      totalSubmissions: totalPassages || 0,
      totalVotes: totalVotes || 0,
      totalMatchups: totalMatchups || 0
    },
    statusBreakdown: statusCounts,
    genreBreakdown: genreCounts,
    trends: {
      submissionsByDay,
      signupsByDay
    },
    recentSubmissions: recentPassages || [],
    recentUsers: recentUsers || []
  }
})
