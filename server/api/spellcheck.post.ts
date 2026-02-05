import { createError } from 'h3'
import { countWords, spellcheck } from '~/server/utils/spellcheck'

interface SpellcheckBody {
  content?: string
}

export default defineEventHandler(async (event) => {
  const body = await readBody<SpellcheckBody>(event)

  if (!body.content) {
    throw createError({ statusCode: 400, statusMessage: 'content is required.' })
  }

  const corrected = spellcheck(body.content)

  return {
    corrected,
    wordCount: countWords(corrected)
  }
})
