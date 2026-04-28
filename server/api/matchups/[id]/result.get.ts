import { createError } from 'h3'
import { query, queryOne } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const matchupId = getRouterParam(event, 'id')
  if (!matchupId) {
    throw createError({ statusCode: 400, statusMessage: 'Matchup id is required.' })
  }

  const matchup = await queryOne<{
    id: string
    writer_passage_id: string
    ai_passage_id: string
    closes_at: string
  }>(
    `SELECT id, writer_passage_id, ai_passage_id, closes_at
     FROM matchups
     WHERE id = $1`,
    [matchupId]
  )

  if (!matchup) {
    throw createError({ statusCode: 404, statusMessage: 'Matchup not found.' })
  }

  const now = Date.now()
  if (now < new Date(matchup.closes_at).getTime()) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Results are locked until the voting window closes.'
    })
  }

  const { rows: votes } = await query<{ winner_passage_id: string }>(
    `SELECT winner_passage_id
     FROM votes
     WHERE matchup_id = $1`,
    [matchup.id]
  )

  let writerVotes = 0
  let aiVotes = 0

  for (const vote of votes || []) {
    if (vote.winner_passage_id === matchup.writer_passage_id) writerVotes += 1
    if (vote.winner_passage_id === matchup.ai_passage_id) aiVotes += 1
  }

  return {
    matchupId,
    writerVotes,
    aiVotes,
    totalVotes: writerVotes + aiVotes
  }
})
