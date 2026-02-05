const replacements: Array<[RegExp, string]> = [
  [/\bteh\b/gi, 'the'],
  [/\brecieve\b/gi, 'receive'],
  [/\bseperate\b/gi, 'separate'],
  [/\boccured\b/gi, 'occurred'],
  [/\bdefinately\b/gi, 'definitely'],
  [/\bwich\b/gi, 'which'],
  [/\bthier\b/gi, 'their'],
  [/\bintial\b/gi, 'initial'],
  [/\bgoverment\b/gi, 'government'],
  [/\bpublically\b/gi, 'publicly'],
  [/\buntill\b/gi, 'until'],
  [/\bneccessary\b/gi, 'necessary']
]

export function spellcheck(input: string): string {
  let output = input.replace(/\r\n/g, '\n')
  for (const [pattern, replacement] of replacements) {
    output = output.replace(pattern, replacement)
  }
  output = output.replace(/[ \t]+/g, ' ')
  output = output.replace(/\n{3,}/g, '\n\n')
  return output.trim()
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}
