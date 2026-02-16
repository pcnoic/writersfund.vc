import { createError } from 'h3'
import { randomUUID } from 'node:crypto'
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Authentication required.' })
  }

  const supabase = await serverSupabaseClient(event)
  const nowIso = new Date().toISOString()

  const { data: matchups, error: matchupsError } = await supabase
    .from('matchups')
    .select('id, writer_passage_id, ai_passage_id, opens_at, closes_at')
    .eq('status', 'open')
    .lte('opens_at', nowIso)
    .gte('closes_at', nowIso)
    .order('opens_at', { ascending: true })

  if (matchupsError) {
    throw createError({ statusCode: 500, statusMessage: matchupsError.message })
  }

  for (const matchup of matchups || []) {
    const { data: existingVote } = await supabase
      .from('votes')
      .select('id')
      .eq('matchup_id', matchup.id)
      .eq('voter_id', user.id)
      .maybeSingle()

    if (existingVote) continue

    let { data: ballot } = await supabase
      .from('ballots')
      .select('id, matchup_id, voter_id, option_a, option_b')
      .eq('matchup_id', matchup.id)
      .eq('voter_id', user.id)
      .maybeSingle()

    if (!ballot) {
      const flip = Math.random() > 0.5
      const ballotId = randomUUID()
      const optionA = flip ? matchup.writer_passage_id : matchup.ai_passage_id
      const optionB = flip ? matchup.ai_passage_id : matchup.writer_passage_id

      const { error: ballotError } = await supabase.from('ballots').insert({
        id: ballotId,
        matchup_id: matchup.id,
        voter_id: user.id,
        option_a: optionA,
        option_b: optionB
      })

      if (ballotError) {
        throw createError({ statusCode: 500, statusMessage: ballotError.message })
      }

      ballot = {
        id: ballotId,
        matchup_id: matchup.id,
        voter_id: user.id,
        option_a: optionA,
        option_b: optionB
      }
    }

    const { data: passages, error: passagesError } = await supabase
      .from('passages')
      .select('id, kind, title, content, genre')
      .in('id', [ballot.option_a, ballot.option_b])

    if (passagesError) {
      throw createError({ statusCode: 500, statusMessage: passagesError.message })
    }

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
