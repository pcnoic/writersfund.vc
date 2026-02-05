import { createError } from 'h3'
import { randomUUID } from 'node:crypto'
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

interface ApplicationBody {
  goals?: string
  projectSummary?: string
  writingSample?: string
}

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Authentication required.' })
  }

  const body = await readBody<ApplicationBody>(event)

  if (!body.goals || !body.projectSummary || !body.writingSample) {
    throw createError({ statusCode: 400, statusMessage: 'goals, projectSummary and writingSample are required.' })
  }

  const supabase = await serverSupabaseClient(event)
  const { error } = await supabase.from('applications').insert({
    id: randomUUID(),
    user_id: user.id,
    goals: body.goals.trim(),
    project_summary: body.projectSummary.trim(),
    writing_sample: body.writingSample.trim()
  })

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return { ok: true }
})
