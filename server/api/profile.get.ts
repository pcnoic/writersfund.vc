import { query, queryOne } from '~/server/utils/db'
import { requireAuthUser } from '~/server/utils/auth'

function weekIndex(startIso: string, now = new Date()): number {
  const start = new Date(startIso)
  const diffMs = now.getTime() - start.getTime()
  return Math.max(1, Math.min(12, Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1))
}

export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)

  const userRecord = {
    id: user.id,
    name: user.name,
    penName: user.pen_name,
    email: user.email,
    timezone: user.timezone,
    bio: user.bio || '',
  }

  const [passagesResult, votesCastResult, userPassagesResult] = await Promise.all([
    query<{ id: string; title: string; created_at: string }>(
      `SELECT id, title, created_at
       FROM passages
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [user.id]
    ),
    query<{ id: string; matchup_id: string; winner_passage_id: string; created_at: string }>(
      `SELECT id, matchup_id, winner_passage_id, created_at
       FROM votes
       WHERE voter_id = $1`,
      [user.id]
    ),
    query<{ id: string }>(
      `SELECT id
       FROM passages
       WHERE user_id = $1`,
      [user.id]
    ),
  ])

  const passages = passagesResult.rows
  const votesCast = votesCastResult.rows
  const userPassages = userPassagesResult.rows
  const passageIds = userPassages.map((item) => item.id)

  const matchups = passageIds.length
    ? (
        await query<{ id: string; writer_passage_id: string; opens_at: string; closes_at: string }>(
          `SELECT id, writer_passage_id, opens_at, closes_at
           FROM matchups
           WHERE writer_passage_id = ANY($1::uuid[])`,
          [passageIds]
        )
      ).rows
    : []

  const matchupIds = matchups.map((item) => item.id)
  const votesReceived = matchupIds.length
    ? (
        await query<{ id: string; matchup_id: string; winner_passage_id: string; feedback: string | null; created_at: string }>(
          `SELECT id, matchup_id, winner_passage_id, feedback, created_at
           FROM votes
           WHERE matchup_id = ANY($1::uuid[])`,
          [matchupIds]
        )
      ).rows
    : []

  let writerVotes = 0
  for (const vote of votesReceived) {
    const matchup = matchups.find((item) => item.id === vote.matchup_id)
    if (!matchup) continue
    if (vote.winner_passage_id === matchup.writer_passage_id) writerVotes += 1
  }

  const votesReceivedCount = votesReceived.length
  const winRate = votesReceivedCount > 0 ? Math.round((writerVotes / votesReceivedCount) * 100) : 0
  const averagePeerRating = winRate

  const feedbackList = votesReceived
    .map((v) => v.feedback)
    .filter((f): f is string => Boolean(f && f.trim().length > 0))

  const baseRating = 1200
  const aiRating = 1200
  const kFactor = 24
  let currentElo = baseRating

  const allVotesForElo = [...votesReceived].sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''))

  for (const vote of allVotesForElo) {
    const matchup = matchups.find((m) => m.id === vote.matchup_id)
    if (!matchup) continue
    const writerWon = vote.winner_passage_id === matchup.writer_passage_id
    const expected = 1 / (1 + 10 ** ((aiRating - currentElo) / 400))
    const actual = writerWon ? 1 : 0
    currentElo = Number((currentElo + kFactor * (actual - expected)).toFixed(2))
  }

  const [allProfilesResult, allPassagesResult, allMatchupsResult, allVotesResult] = await Promise.all([
    query<{ id: string }>(`SELECT id FROM users`),
    query<{ id: string; user_id: string | null }>(
      `SELECT id, user_id
       FROM passages
       WHERE kind = 'writer'`
    ),
    query<{ id: string; writer_passage_id: string }>(
      `SELECT id, writer_passage_id
       FROM matchups`
    ),
    query<{ matchup_id: string; winner_passage_id: string; created_at: string }>(
      `SELECT matchup_id, winner_passage_id, created_at
       FROM votes
       ORDER BY created_at ASC`
    ),
  ])

  const writerElos = new Map<string, number>()
  for (const p of allProfilesResult.rows) {
    writerElos.set(p.id, baseRating)
  }

  for (const vote of allVotesResult.rows) {
    const matchup = allMatchupsResult.rows.find((m) => m.id === vote.matchup_id)
    if (!matchup) continue
    const passage = allPassagesResult.rows.find((p) => p.id === matchup.writer_passage_id)
    if (!passage?.user_id) continue
    const elo = writerElos.get(passage.user_id) || baseRating
    const writerWon = vote.winner_passage_id === matchup.writer_passage_id
    const expected = 1 / (1 + 10 ** ((aiRating - elo) / 400))
    const actual = writerWon ? 1 : 0
    writerElos.set(passage.user_id, Number((elo + kFactor * (actual - expected)).toFixed(2)))
  }

  const sortedWriters = Array.from(writerElos.entries()).sort((a, b) => b[1] - a[1])
  const userRankIndex = sortedWriters.findIndex(([id]) => id === user.id)
  const userRank = userRankIndex >= 0 ? userRankIndex + 1 : null

  const tournament = await queryOne<{ created_at: string }>(
    `SELECT created_at
     FROM tournaments
     WHERE status = 'active'
     ORDER BY created_at DESC
     LIMIT 1`
  )

  const week = tournament?.created_at ? weekIndex(tournament.created_at) : 1

  const timeline = Array.from({ length: 12 }).map((_, index) => {
    const weekNumber = index + 1
    const start = tournament?.created_at ? new Date(tournament.created_at) : new Date()
    start.setUTCDate(start.getUTCDate() + (weekNumber - 1) * 7)
    const end = new Date(start)
    end.setUTCDate(start.getUTCDate() + 7)

    const submitted = passages.some((passage) => {
      const createdAt = new Date(passage.created_at)
      return createdAt >= start && createdAt < end
    })

    return {
      week: weekNumber,
      status: submitted ? 'Submitted' : weekNumber < week ? 'Missed' : 'Pending',
      delta: submitted ? 'TBD' : '—',
    }
  })

  return {
    user: {
      id: userRecord.id,
      name: userRecord.name,
      penName: userRecord.penName,
      email: userRecord.email,
      timezone: userRecord.timezone,
      bio: userRecord.bio || '',
    },
    competitive: {
      rank: userRank,
      elo: currentElo,
      week,
      totalWeeks: 12,
    },
    stats: {
      submissions: passages.length,
      winRate,
      averagePeerRating,
      feedbackReceived: votesReceivedCount,
      votesCast: votesCast.length,
    },
    timeline,
    passages,
    feedback: feedbackList,
  }
})
