import { createError } from "h3";
import { randomUUID } from "node:crypto";
import { requireAuthUser } from "~/server/utils/auth";
import { query } from "~/server/utils/db";
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
  const user = await requireAuthUser(event);

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

  const writerPassageId = randomUUID();

  try {
    await query(
      `INSERT INTO passages (
        id, user_id, kind, title, content, genre, status, narrative, word_count, parent_passage_id
      ) VALUES ($1, $2, 'writer', $3, $4, $5, 'pending_processing', NULL, $6, NULL)`,
      [writerPassageId, user.id, body.title.trim(), corrected, body.genre.trim(), wordCount]
    )
  } catch {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to create passage.',
    })
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
