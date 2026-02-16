import { serverSupabaseClient } from '#supabase/server'
import { requireAdmin } from '~/server/utils/admin'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const supabase = await serverSupabaseClient(event)

  const [
    { count: totalUsers },
    { count: totalPassages },
    { count: totalVotes },
    { count: totalMatchups },
    { data: recentPassages },
    { data: recentUsers },
    { data: passagesByStatus },
    { data: passagesByGenre }
  ] = await Promise.all([
    supabase.from('users').select('*', { count: 'exact', head: true }),
    supabase.from('passages').select('*', { count: 'exact', head: true }).eq('kind', 'writer'),
    supabase.from('votes').select('*', { count: 'exact', head: true }),
    supabase.from('matchups').select('*', { count: 'exact', head: true }),
    supabase
      .from('passages')
      .select('id, title, genre, status, word_count, created_at')
      .eq('kind', 'writer')
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('users')
      .select('id, name, pen_name, email, created_at')
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('passages')
      .select('status')
      .eq('kind', 'writer'),
    supabase
      .from('passages')
      .select('genre')
      .eq('kind', 'writer')
  ])

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
  
  const { data: recentSubmissions } = await supabase
    .from('passages')
    .select('created_at')
    .eq('kind', 'writer')
    .gte('created_at', sevenDaysAgo.toISOString())

  const submissionsByDay: Record<string, number> = {}
  for (const p of recentSubmissions || []) {
    const day = new Date(p.created_at).toISOString().split('T')[0]
    submissionsByDay[day] = (submissionsByDay[day] || 0) + 1
  }

  // Get signups per day for the last 7 days
  const { data: recentSignups } = await supabase
    .from('users')
    .select('created_at')
    .gte('created_at', sevenDaysAgo.toISOString())

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
