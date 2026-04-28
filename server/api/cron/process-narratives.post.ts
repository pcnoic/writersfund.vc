import { randomUUID } from "node:crypto";
import { query, queryOne } from "~/server/utils/db";
import {
  buildAiStoryFromNarrative,
  getWordCount,
  summarizeNarrative,
} from "~/server/utils/narrative";
import { getNextVotingWindow } from "~/server/utils/schedule";

const BATCH_SIZE = 5;

export default defineEventHandler(async (event) => {
  const authHeader = getHeader(event, "authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
    });
  }

  const { rows: pendingPassages } = await query<{
    id: string;
    title: string;
    content: string;
    genre: string;
    word_count: number | null;
    user_id: string | null;
  }>(
    `SELECT id, title, content, genre, word_count, user_id
     FROM passages
     WHERE processed_at IS NULL AND kind = 'writer'
     ORDER BY created_at ASC
     LIMIT $1`,
    [BATCH_SIZE]
  );

  if (!pendingPassages || pendingPassages.length === 0) {
    return { processed: 0, message: "No pending passages to process" };
  }

  console.log(`[Cron] Processing ${pendingPassages.length} passages...`);

  const results = [];

  for (const passage of pendingPassages) {
    try {
      console.log(`[Cron] Processing passage ${passage.id}: ${passage.title}`);

      const narrative = await summarizeNarrative(passage.content);
      const wordCount = passage.word_count || getWordCount(passage.content);

      const aiStory = await buildAiStoryFromNarrative({
        narrative,
        maxWords: wordCount,
        genre: passage.genre,
      });

      const aiPassageId = randomUUID();

      await query(
        `INSERT INTO passages (
          id, user_id, kind, title, content, genre, status, narrative, word_count, parent_passage_id
        ) VALUES ($1, NULL, 'ai', $2, $3, $4, 'approved', $5, $6, $7)`,
        [aiPassageId, `${passage.title} (AI mirror)`, aiStory, passage.genre, narrative, wordCount, passage.id]
      );

      await query(
        `UPDATE passages
         SET status = 'approved', narrative = $1, processed_at = $2
         WHERE id = $3`,
        [narrative, new Date().toISOString(), passage.id]
      );

      const tournament = await queryOne<{ id: string }>(
        `SELECT id
         FROM tournaments
         WHERE status = 'active'
         ORDER BY created_at DESC
         LIMIT 1`
      );

      if (tournament?.id) {
        const nextWindow = getNextVotingWindow();
        const matchupId = randomUUID();

        await query(
          `INSERT INTO matchups (
            id, tournament_id, writer_passage_id, ai_passage_id, opens_at, closes_at, status
          ) VALUES ($1, $2, $3, $4, $5, $6, 'open')`,
          [
            matchupId,
            tournament.id,
            passage.id,
            aiPassageId,
            nextWindow.opensAt.toISOString(),
            nextWindow.closesAt.toISOString(),
          ]
        );
      }

      console.log(`[Cron] Successfully processed passage ${passage.id}`);
      results.push({ id: passage.id, success: true });
    } catch (error) {
      console.error(`[Cron] Error processing passage ${passage.id}:`, error);
      results.push({
        id: passage.id,
        success: false,
        error: (error as Error).message,
      });
    }
  }

  const successCount = results.filter((r) => r.success).length;
  console.log(`[Cron] Processed ${successCount}/${pendingPassages.length} passages successfully`);

  return {
    processed: pendingPassages.length,
    successful: successCount,
    results,
  };
});
