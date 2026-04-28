import { createError } from 'h3'
import { randomUUID } from 'node:crypto'
import { requireAuthUser } from '~/server/utils/auth'
import { query, queryOne } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)
  const nowIso = new Date().toISOString()

  const { rows: matchups } = await query<{
    id: string
    writer_passage_id: string
    ai_passage_id: string
    opens_at: string
    closes_at: string
  }>(
    `SELECT id, writer_passage_id, ai_passage_id, opens_at, closes_at
     FROM matchups
     WHERE status = 'open' AND opens_at <= $1 AND closes_at >= $1
     ORDER BY opens_at ASC`,
    [nowIso]
  )

  for (const matchup of matchups || []) {
    const existingVote = await queryOne<{ id: string }>(
      `SELECT id
       FROM votes
       WHERE matchup_id = $1 AND voter_id = $2`,
      [matchup.id, user.id]
    )

    if (existingVote) continue

    let ballot = await queryOne<{
      id: string
      matchup_id: string
      voter_id: string
      option_a: string
      option_b: string
    }>(
      `SELECT id, matchup_id, voter_id, option_a, option_b
       FROM ballots
       WHERE matchup_id = $1 AND voter_id = $2`,
      [matchup.id, user.id]
    )

    if (!ballot) {
      const flip = Math.random() > 0.5
      const ballotId = randomUUID()
      const optionA = flip ? matchup.writer_passage_id : matchup.ai_passage_id
      const optionB = flip ? matchup.ai_passage_id : matchup.writer_passage_id

      try {
        await query(
          `INSERT INTO ballots (id, matchup_id, voter_id, option_a, option_b)
           VALUES ($1, $2, $3, $4, $5)`,
          [ballotId, matchup.id, user.id, optionA, optionB]
        )
      } catch {
        throw createError({ statusCode: 500, statusMessage: 'Failed to create ballot.' })
      }

      ballot = {
        id: ballotId,
        matchup_id: matchup.id,
        voter_id: user.id,
        option_a: optionA,
        option_b: optionB
      }
    }

    const { rows: passages } = await query<{
      id: string
      kind: string
      title: string
      content: string
      genre: string
    }>(
      `SELECT id, kind, title, content, genre
       FROM passages
       WHERE id = ANY($1::uuid[])`,
      [[ballot.option_a, ballot.option_b]]
    )

    const optionA = passages?.find((item) => item.id === ballot.option_a)
    const optionB = passages?.find((item) => item.id === ballot.option_b)

    if (!optionA || !optionB) {
      continue
    }

    return {
      ballot: {
        id: ballot.id,
        matchupId: ballot.matchup_id
      },
      passages: {
        A: optionA,
        B: optionB
      }
    }
  }

  return { ballot: null }
})
