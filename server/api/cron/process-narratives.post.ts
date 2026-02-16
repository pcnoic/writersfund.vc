import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
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

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw createError({
      statusCode: 500,
      statusMessage: "Supabase configuration missing",
    });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: pendingPassages, error: fetchError } = await supabase
    .from("passages")
    .select("id, title, content, genre, word_count, user_id")
    .is("processed_at", null)
    .eq("kind", "writer")
    .order("created_at", { ascending: true })
    .limit(BATCH_SIZE);

  if (fetchError) {
    console.error("[Cron] Error fetching pending passages:", fetchError);
    throw createError({
      statusCode: 500,
      statusMessage: fetchError.message,
    });
  }

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

      const { error: aiInsertError } = await supabase.from("passages").insert({
        id: aiPassageId,
        user_id: null,
        kind: "ai",
        title: `${passage.title} (AI mirror)`,
        content: aiStory,
        genre: passage.genre,
        status: "approved",
        narrative,
        word_count: wordCount,
        parent_passage_id: passage.id,
      });

      if (aiInsertError) {
        console.error(`[Cron] Error inserting AI passage for ${passage.id}:`, aiInsertError);
        results.push({ id: passage.id, success: false, error: aiInsertError.message });
        continue;
      }

      const { error: updateError } = await supabase
        .from("passages")
        .update({ 
          status: "approved", 
          narrative,
          processed_at: new Date().toISOString()
        })
        .eq("id", passage.id);

      if (updateError) {
        console.error(`[Cron] Error updating passage ${passage.id}:`, updateError);
        results.push({ id: passage.id, success: false, error: updateError.message });
        continue;
      }

      const { data: tournament } = await supabase
        .from("tournaments")
        .select("id")
        .eq("status", "active")
        .maybeSingle();

      if (tournament?.id) {
        const nextWindow = getNextVotingWindow();
        const matchupId = randomUUID();

        await supabase.from("matchups").insert({
          id: matchupId,
          tournament_id: tournament.id,
          writer_passage_id: passage.id,
          ai_passage_id: aiPassageId,
          opens_at: nextWindow.opensAt.toISOString(),
          closes_at: nextWindow.closesAt.toISOString(),
          status: "open",
        });
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
