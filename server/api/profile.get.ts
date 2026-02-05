import { createError } from 'h3'
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

function weekIndex(startIso: string, now = new Date()): number {
  const start = new Date(startIso)
  const diffMs = now.getTime() - start.getTime()
  return Math.max(1, Math.min(12, Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1))
}

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Authentication required.' })
  }

  const supabase = await serverSupabaseClient(event)

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, name, pen_name, email, timezone, bio, created_at')
    .eq('id', user.id)
    .maybeSingle()

  const { data: passages } = await supabase
    .from('passages')
    .select('id, title, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const { data: votesCast } = await supabase
    .from('votes')
    .select('id, matchup_id, winner_passage_id, created_at')
    .eq('voter_id', user.id)

  const { data: userPassages } = await supabase
    .from('passages')
    .select('id')
    .eq('user_id', user.id)

  const passageIds = (userPassages || []).map((item) => item.id)

  const { data: matchups } = await supabase
    .from('matchups')
    .select('id, writer_passage_id, opens_at, closes_at')
    .in('writer_passage_id', passageIds.length ? passageIds : [''])

  const matchupIds = (matchups || []).map((item) => item.id)

  const { data: votesReceived } = await supabase
    .from('votes')
    .select('id, matchup_id, winner_passage_id')
    .in('matchup_id', matchupIds.length ? matchupIds : [''])

  let writerVotes = 0
  for (const vote of votesReceived || []) {
    const matchup = matchups?.find((item) => item.id === vote.matchup_id)
    if (!matchup) continue
    if (vote.winner_passage_id === matchup.writer_passage_id) writerVotes += 1
  }

  const votesReceivedCount = votesReceived?.length || 0
  const winRate = votesReceivedCount > 0 ? Math.round((writerVotes / votesReceivedCount) * 100) : 0
  const averagePeerRating = winRate

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('created_at')
    .eq('status', 'active')
    .maybeSingle()

  const week = tournament?.created_at ? weekIndex(tournament.created_at) : 1

  const timeline = Array.from({ length: 12 }).map((_, index) => {
    const weekNumber = index + 1
    const start = tournament?.created_at ? new Date(tournament.created_at) : new Date()
    start.setUTCDate(start.getUTCDate() + (weekNumber - 1) * 7)
    const end = new Date(start)
    end.setUTCDate(start.getUTCDate() + 7)

    const submitted = (passages || []).some((passage) => {
      const createdAt = new Date(passage.created_at)
      return createdAt >= start && createdAt < end
    })

    return {
      week: weekNumber,
      status: submitted ? 'Submitted' : weekNumber < week ? 'Missed' : 'Pending',
      delta: submitted ? 'TBD' : '—'
    }
  })

  return {
    user: {
      id: profile?.id || user.id,
      name: profile?.name || user.user_metadata?.name || 'Writer',
      penName: profile?.pen_name || user.user_metadata?.pen_name || 'Writer',
      email: profile?.email || user.email,
      timezone: profile?.timezone || user.user_metadata?.timezone || 'UTC',
      bio: profile?.bio || user.user_metadata?.bio || ''
    },
    competitive: {
      rank: null,
      elo: 1200,
      week,
      totalWeeks: 12
    },
    stats: {
      submissions: passages?.length || 0,
      winRate,
      averagePeerRating,
      feedbackReceived: votesReceivedCount,
      votesCast: votesCast?.length || 0
    },
    timeline,
    passages: passages || []
  }
})
