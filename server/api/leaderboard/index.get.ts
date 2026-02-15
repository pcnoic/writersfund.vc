import { serverSupabaseClient } from '#supabase/server'
import { formatUtc, getNextLeaderboardUpdate } from '~/server/utils/schedule'

function weekIndex(startIso: string, now = new Date()): number {
  const start = new Date(startIso)
  const diffMs = now.getTime() - start.getTime()
  return Math.max(1, Math.min(12, Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1))
}

interface LeaderboardEntry {
  writerId: string
  writerName: string
  rating: number
  wins: number
  losses: number
  matches: number
  votesReceived: number
}

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseClient(event)

  const [{ data: profiles }, { data: passages }, { data: matchups }, { data: votes }] = await Promise.all([
    supabase.from('profiles').select('id, pen_name, name'),
    supabase.from('passages').select('id, user_id'),
    supabase.from('matchups').select('id, writer_passage_id, ai_passage_id'),
    supabase.from('votes').select('matchup_id, winner_passage_id, created_at')
  ])

  const baseRating = 1200
  const aiRating = 1200
  const kFactor = 24

  const writerMap = new Map<string, LeaderboardEntry>()
  for (const profile of profiles || []) {
    writerMap.set(profile.id, {
      writerId: profile.id,
      writerName: profile.pen_name || profile.name || 'Writer',
      rating: baseRating,
      wins: 0,
      losses: 0,
      matches: 0,
      votesReceived: 0
    })
  }

  const passageToUser = new Map<string, string>()
  for (const passage of passages || []) {
    if (passage.user_id) {
      passageToUser.set(passage.id, passage.user_id)
    }
  }

  const matchupMap = new Map<string, { writerPassageId: string; aiPassageId: string }>()
  for (const matchup of matchups || []) {
    matchupMap.set(matchup.id, {
      writerPassageId: matchup.writer_passage_id,
      aiPassageId: matchup.ai_passage_id
    })
  }

  const sortedVotes = [...(votes || [])].sort((a, b) =>
    (a.created_at || '').localeCompare(b.created_at || '')
  )

  for (const vote of sortedVotes) {
    const matchup = matchupMap.get(vote.matchup_id)
    if (!matchup) continue
    const writerId = passageToUser.get(matchup.writerPassageId)
    if (!writerId) continue
    const entry = writerMap.get(writerId)
    if (!entry) continue

    const writerWon = vote.winner_passage_id === matchup.writerPassageId
    const expected = 1 / (1 + 10 ** ((aiRating - entry.rating) / 400))
    const actual = writerWon ? 1 : 0

    entry.rating = Number((entry.rating + kFactor * (actual - expected)).toFixed(2))
    entry.matches += 1
    entry.votesReceived += 1
    if (writerWon) entry.wins += 1
    else entry.losses += 1
  }

  const entries = Array.from(writerMap.values()).sort((a, b) => b.rating - a.rating)

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('created_at')
    .eq('status', 'active')
    .maybeSingle()

  const currentWeek = tournament?.created_at ? weekIndex(tournament.created_at) : 1
  const totalWeeks = 12
  const weeksRemaining = totalWeeks - currentWeek

  return {
    updatedAt: new Date().toISOString(),
    nextUpdateAt: formatUtc(getNextLeaderboardUpdate()),
    currentWeek,
    totalWeeks,
    weeksRemaining,
    entries
  }
})
