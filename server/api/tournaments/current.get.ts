import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseClient(event)
  const { data } = await supabase
    .from('tournaments')
    .select('id, name, season, status, created_at')
    .eq('status', 'active')
    .maybeSingle()
  return data || null
})
