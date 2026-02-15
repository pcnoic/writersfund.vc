import { createError } from "h3";
import { randomUUID } from "node:crypto";
import { serverSupabaseClient, serverSupabaseUser } from "#supabase/server";
import {
  buildAiStoryFromNarrative,
  getWordCount,
  summarizeNarrative,
} from "~/server/utils/narrative";
import { canSubmitNow, getNextVotingWindow } from "~/server/utils/schedule";
import { spellcheck } from "~/server/utils/spellcheck";

interface CreatePassageBody {
  title?: string;
  content?: string;
  genre?: string;
}

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event);
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: "Authentication required.",
    });
  }

  const body = await readBody<CreatePassageBody>(event);

  if (!body.title || !body.content || !body.genre) {
    throw createError({
      statusCode: 400,
      statusMessage: "title, content and genre are required.",
    });
  }

  if (body.content.length < 120) {
    throw createError({
      statusCode: 400,
      statusMessage: "Passage content must be at least 120 characters.",
    });
  }

  const submissionWindow = canSubmitNow();
  if (!submissionWindow.allowed) {
    throw createError({
      statusCode: 403,
      statusMessage: `Submissions are closed during voting. Next open: ${submissionWindow.nextOpen.toISOString()}`,
    });
  }

  const corrected = spellcheck(body.content);
  const wordCount = getWordCount(corrected);
  if (wordCount > 3000) {
    throw createError({
      statusCode: 400,
      statusMessage: "Passage must be 3000 words or fewer.",
    });
  }

  const narrative = await summarizeNarrative(corrected);
  const aiStory = await buildAiStoryFromNarrative({
    narrative,
    maxWords: wordCount,
    genre: body.genre,
  });

  const supabase = await serverSupabaseClient(event);

  const writerPassageId = randomUUID();
  const aiPassageId = randomUUID();

  const { error: insertPassagesError } = await supabase
    .from("passages")
    .insert([
      {
        id: writerPassageId,
        user_id: user.id,
        kind: "writer",
        title: body.title.trim(),
        content: corrected,
        genre: body.genre.trim(),
        status: "approved",
        narrative,
        word_count: wordCount,
        parent_passage_id: null,
      },
      {
        id: aiPassageId,
        user_id: null,
        kind: "ai",
        title: `${body.title.trim()} (AI mirror)`,
        content: aiStory,
        genre: body.genre.trim(),
        status: "approved",
        narrative,
        word_count: wordCount,
        parent_passage_id: writerPassageId,
      },
    ]);

  if (insertPassagesError) {
    throw createError({
      statusCode: 500,
      statusMessage: insertPassagesError.message,
    });
  }

  const { data: tournament } = await supabase
    .from("tournaments")
    .select("id")
    .eq("status", "active")
    .maybeSingle();

  if (!tournament?.id) {
    throw createError({
      statusCode: 500,
      statusMessage: "No active tournament configured.",
    });
  }

  const nextWindow = getNextVotingWindow();
  const matchupId = randomUUID();
  const { error: matchupError } = await supabase.from("matchups").insert({
    id: matchupId,
    tournament_id: tournament.id,
    writer_passage_id: writerPassageId,
    ai_passage_id: aiPassageId,
    opens_at: nextWindow.opensAt.toISOString(),
    closes_at: nextWindow.closesAt.toISOString(),
    status: "open",
  });

  if (matchupError) {
    throw createError({ statusCode: 500, statusMessage: matchupError.message });
  }

  return {
    passage: {
      id: writerPassageId,
      title: body.title.trim(),
      content: corrected,
      genre: body.genre.trim(),
    },
    aiPassage: {
      id: aiPassageId,
      title: `${body.title.trim()} (AI mirror)`,
      content: aiStory,
      genre: body.genre.trim(),
    },
    matchup: {
      id: matchupId,
      opensAt: nextWindow.opensAt.toISOString(),
      closesAt: nextWindow.closesAt.toISOString(),
    },
    narrative,
    wordCount,
  };
});
