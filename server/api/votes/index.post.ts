import { createError } from 'h3'
import { randomUUID } from 'node:crypto'
import { requireAuthUser } from '~/server/utils/auth'
import { query, queryOne } from '~/server/utils/db'
import type { VoteChoice } from '~/types/domain'
import { verifyRecaptcha } from '~/server/utils/recaptcha'

interface VoteBody {
  ballotId?: string
  choice?: VoteChoice
  feedback?: string
  recaptchaToken?: string
}

export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)

  const body = await readBody<VoteBody>(event)

  if (!body.ballotId || !body.choice || !body.feedback) {
    throw createError({ statusCode: 400, statusMessage: 'ballotId, choice and feedback are required.' })
  }

  if (body.choice !== 'A' && body.choice !== 'B') {
    throw createError({ statusCode: 400, statusMessage: 'choice must be A or B.' })
  }

  if (body.feedback.trim().length < 50) {
    throw createError({ statusCode: 400, statusMessage: 'Feedback must be at least 50 characters.' })
  }

  await verifyRecaptcha(body.recaptchaToken || '', 'vote')

  const ballot = await queryOne<{
    id: string
    matchup_id: string
    voter_id: string
    option_a: string
    option_b: string
  }>(
    `SELECT id, matchup_id, voter_id, option_a, option_b
     FROM ballots
     WHERE id = $1`,
    [body.ballotId]
  )

  if (!ballot) {
    throw createError({ statusCode: 404, statusMessage: 'Ballot not found.' })
  }

  if (ballot.voter_id !== user.id) {
    throw createError({ statusCode: 403, statusMessage: 'Ballot does not belong to this voter.' })
  }

  const matchup = await queryOne<{ id: string; opens_at: string; closes_at: string }>(
    `SELECT id, opens_at, closes_at
     FROM matchups
     WHERE id = $1`,
    [ballot.matchup_id]
  )

  if (!matchup) {
    throw createError({ statusCode: 404, statusMessage: 'Matchup not found.' })
  }

  const now = new Date()
  if (now < new Date(matchup.opens_at) || now > new Date(matchup.closes_at)) {
    throw createError({ statusCode: 403, statusMessage: 'Voting is closed for this matchup.' })
  }

  const existingVote = await queryOne<{ id: string }>(
    `SELECT id
     FROM votes
     WHERE matchup_id = $1 AND voter_id = $2`,
    [ballot.matchup_id, user.id]
  )

  if (existingVote) {
    throw createError({ statusCode: 409, statusMessage: 'You have already voted on this matchup.' })
  }

  const winnerPassageId = body.choice === 'A' ? ballot.option_a : ballot.option_b

  try {
    await query(
      `INSERT INTO votes (
        id, event_id, matchup_id, ballot_id, voter_id, choice, winner_passage_id, feedback, trust_weight
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        randomUUID(),
        randomUUID(),
        ballot.matchup_id,
        ballot.id,
        user.id,
        body.choice,
        winnerPassageId,
        body.feedback.trim(),
        1,
      ]
    )
  } catch (error) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to save vote.' })
  }

  return { ok: true }
})
