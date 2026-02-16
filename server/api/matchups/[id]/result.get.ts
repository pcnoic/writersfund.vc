import { createError } from 'h3'
import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const matchupId = getRouterParam(event, 'id')
  if (!matchupId) {
    throw createError({ statusCode: 400, statusMessage: 'Matchup id is required.' })
  }

  const supabase = await serverSupabaseClient(event)

  const { data: matchup } = await supabase
    .from('matchups')
    .select('id, writer_passage_id, ai_passage_id, closes_at')
    .eq('id', matchupId)
    .maybeSingle()

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

  const { data: votes } = await supabase
    .from('votes')
    .select('winner_passage_id')
    .eq('matchup_id', matchup.id)

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
