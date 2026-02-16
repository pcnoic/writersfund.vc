import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

function getWeekStart(): Date {
  const now = new Date()
  const dayOfWeek = now.getUTCDay()
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const monday = new Date(now)
  monday.setUTCDate(now.getUTCDate() - diff)
  monday.setUTCHours(0, 0, 0, 0)
  return monday
}

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Authentication required.'
    })
  }

  const supabase = await serverSupabaseClient(event)
  const weekStart = getWeekStart()

  const { data: submission } = await supabase
    .from('passages')
    .select('id, title, genre, content, narrative, word_count, created_at')
    .eq('user_id', user.id)
    .eq('kind', 'writer')
    .gte('created_at', weekStart.toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return {
    hasSubmission: !!submission,
    submission: submission || null
  }
})
