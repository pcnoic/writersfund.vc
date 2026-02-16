import { createError } from "h3";
import { randomUUID } from "node:crypto";
import { serverSupabaseClient, serverSupabaseUser } from "#supabase/server";
import { getWordCount } from "~/server/utils/narrative";
import { canSubmitNow } from "~/server/utils/schedule";
import { spellcheck } from "~/server/utils/spellcheck";
import { verifyRecaptcha } from "~/server/utils/recaptcha";

interface CreatePassageBody {
  title?: string;
  content?: string;
  genre?: string;
  recaptchaToken?: string;
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

  await verifyRecaptcha(body.recaptchaToken || "", "submission");

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

  const supabase = await serverSupabaseClient(event);

  const writerPassageId = randomUUID();

  const { error: insertPassagesError } = await supabase
    .from("passages")
    .insert({
      id: writerPassageId,
      user_id: user.id,
      kind: "writer",
      title: body.title.trim(),
      content: corrected,
      genre: body.genre.trim(),
      status: "pending_processing",
      narrative: null,
      word_count: wordCount,
      parent_passage_id: null,
    });

  if (insertPassagesError) {
    throw createError({
      statusCode: 500,
      statusMessage: insertPassagesError.message,
    });
  }

  return {
    passage: {
      id: writerPassageId,
      title: body.title.trim(),
      content: corrected,
      genre: body.genre.trim(),
      status: "pending_processing",
    },
    wordCount,
    message: "Submission received. Your story will be processed shortly.",
  };
});
