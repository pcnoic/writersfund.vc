import openai from "./openai";
import { countWords } from "./spellcheck";

export async function summarizeNarrative(text: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are a literary assistant. Extract a concise 2-3 sentence narrative summary of the provided text. Focus on the core plot and emotional arc.",
        },
        {
          role: "user",
          content: text,
        },
      ],
      max_tokens: 150,
    });

    return response.choices[0]?.message?.content?.trim() || text.slice(0, 240);
  } catch (error) {
    console.error("OpenAI summarization failed:", error);
    // Fallback to simple truncation
    return text.slice(0, 240) + "...";
  }
}

export async function buildAiStoryFromNarrative(input: {
  narrative: string;
  maxWords: number;
  genre?: string;
}): Promise<string> {
  const { narrative, maxWords, genre = "literary fiction" } = input;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a skilled ${genre} author. your task is to write a story based on a provided narrative summary.
Constraints:
- Tone: ${genre}.
- Length: Strictly under ${maxWords} words.
- Do not simply summarize; write a compelling scene or story.
- Do not include a title.`,
        },
        {
          role: "user",
          content: `Narrative summary: ${narrative}`,
        },
      ],
      max_tokens: Math.min(4000, maxWords * 2), // Rough estimate for tokens vs words
    });

    return (
      response.choices[0]?.message?.content?.trim() ||
      `In a mirrored retelling: ${narrative}`
    );
  } catch (error) {
    console.error("OpenAI story generation failed:", error);
    return `In a mirrored retelling: ${narrative}`;
  }
}

export function getWordCount(text: string): number {
  return countWords(text);
}
