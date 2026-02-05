import { countWords } from './spellcheck'

export function summarizeNarrative(text: string): string {
  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean)
  const summary = sentences.slice(0, 2).join(' ')
  return summary || text.slice(0, 240)
}

export function buildAiStoryFromNarrative(input: { narrative: string; maxWords: number }): string {
  const prefix = `In a mirrored retelling: ${input.narrative}`
  const words = prefix.split(/\s+/).filter(Boolean)
  if (words.length <= input.maxWords) {
    return prefix
  }
  return words.slice(0, input.maxWords).join(' ') + '.'
}

export function getWordCount(text: string): number {
  return countWords(text)
}
