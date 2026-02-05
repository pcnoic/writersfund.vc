import { createError } from 'h3'
import { randomUUID } from 'node:crypto'
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import type { VoteChoice } from '~/types/domain'

interface VoteBody {
  ballotId?: string
  choice?: VoteChoice
  feedback?: string
}

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Authentication required.' })
  }

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

  const supabase = await serverSupabaseClient(event)

  const { data: ballot } = await supabase
    .from('ballots')
    .select('id, matchup_id, voter_id, option_a, option_b')
    .eq('id', body.ballotId)
    .maybeSingle()

  if (!ballot) {
    throw createError({ statusCode: 404, statusMessage: 'Ballot not found.' })
  }

  if (ballot.voter_id !== user.id) {
    throw createError({ statusCode: 403, statusMessage: 'Ballot does not belong to this voter.' })
  }

  const { data: matchup } = await supabase
    .from('matchups')
    .select('id, opens_at, closes_at')
    .eq('id', ballot.matchup_id)
    .maybeSingle()

  if (!matchup) {
    throw createError({ statusCode: 404, statusMessage: 'Matchup not found.' })
  }

  const now = new Date()
  if (now < new Date(matchup.opens_at) || now > new Date(matchup.closes_at)) {
    throw createError({ statusCode: 403, statusMessage: 'Voting is closed for this matchup.' })
  }

  const { data: existingVote } = await supabase
    .from('votes')
    .select('id')
    .eq('matchup_id', ballot.matchup_id)
    .eq('voter_id', user.id)
    .maybeSingle()

  if (existingVote) {
    throw createError({ statusCode: 409, statusMessage: 'You have already voted on this matchup.' })
  }

  const winnerPassageId = body.choice === 'A' ? ballot.option_a : ballot.option_b

  const { error } = await supabase.from('votes').insert({
    id: randomUUID(),
    event_id: randomUUID(),
    matchup_id: ballot.matchup_id,
    ballot_id: ballot.id,
    voter_id: user.id,
    choice: body.choice,
    winner_passage_id: winnerPassageId,
    feedback: body.feedback.trim(),
    trust_weight: 1
  })

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return { ok: true }
})
