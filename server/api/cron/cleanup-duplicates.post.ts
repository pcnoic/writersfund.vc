import { query, queryOne, transaction } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const authHeader = getHeader(event, 'authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    })
  }

  try {
    const { rows: writerPassages } = await query(
      `SELECT id, user_id, title, created_at 
       FROM passages 
       WHERE kind = 'writer' 
       ORDER BY created_at ASC`
    )

    if (writerPassages.length === 0) {
      return { duplicatesRemoved: 0, message: 'No passages to check' }
    }

    const seen = new Map<string, string>()
    const duplicateIds: string[] = []

    for (const passage of writerPassages) {
      const key = `${passage.user_id}:${passage.title.toLowerCase().trim()}`

      if (seen.has(key)) {
        duplicateIds.push(passage.id)
        console.log(`[Cleanup] Found duplicate: "${passage.title}" (id: ${passage.id})`)
      } else {
        seen.set(key, passage.id)
      }
    }

    if (duplicateIds.length === 0) {
      return { duplicatesRemoved: 0, message: 'No duplicates found' }
    }

    console.log(`[Cleanup] Removing ${duplicateIds.length} duplicate passages...`)

    return await transaction(async (client) => {
      // Get AI passages that reference the duplicates
      const { rows: aiPassages } = await query(
        `SELECT id FROM passages 
         WHERE parent_passage_id = ANY($1::uuid[])`,
        [duplicateIds]
      )

      const aiPassageIds = aiPassages.map((p) => p.id)

      // Delete in order to respect foreign key constraints
      if (aiPassageIds.length > 0) {
        await query(
          `DELETE FROM matchups 
           WHERE ai_passage_id = ANY($1::uuid[]) 
                 OR writer_passage_id = ANY($2::uuid[])`,
          [aiPassageIds, duplicateIds]
        )

        await query(
          `DELETE FROM passages 
           WHERE id = ANY($1::uuid[])`,
          [aiPassageIds]
        )
      } else {
        await query(
          `DELETE FROM matchups 
           WHERE writer_passage_id = ANY($1::uuid[])`,
          [duplicateIds]
        )
      }

      // Delete the duplicate passages
      await query(
        `DELETE FROM passages 
         WHERE id = ANY($1::uuid[])`,
        [duplicateIds]
      )

      console.log(`[Cleanup] Successfully removed ${duplicateIds.length} duplicates`)

      return {
        duplicatesRemoved: duplicateIds.length,
        aiPassagesRemoved: aiPassageIds.length,
        removedIds: duplicateIds,
      }
    })
  } catch (err) {
    console.error('[Cleanup] Error:', err)
    throw createError({
      statusCode: 500,
      statusMessage: 'Cleanup failed',
    })
  }
})
