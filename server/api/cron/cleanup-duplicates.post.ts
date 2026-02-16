import { createClient } from "@supabase/supabase-js";

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

  const { data: writerPassages, error: fetchError } = await supabase
    .from("passages")
    .select("id, user_id, title, created_at")
    .eq("kind", "writer")
    .order("created_at", { ascending: true });

  if (fetchError) {
    console.error("[Cleanup] Error fetching passages:", fetchError);
    throw createError({
      statusCode: 500,
      statusMessage: fetchError.message,
    });
  }

  if (!writerPassages || writerPassages.length === 0) {
    return { duplicatesRemoved: 0, message: "No passages to check" };
  }

  const seen = new Map<string, string>();
  const duplicateIds: string[] = [];

  for (const passage of writerPassages) {
    const key = `${passage.user_id}:${passage.title.toLowerCase().trim()}`;
    
    if (seen.has(key)) {
      duplicateIds.push(passage.id);
      console.log(`[Cleanup] Found duplicate: "${passage.title}" (id: ${passage.id})`);
    } else {
      seen.set(key, passage.id);
    }
  }

  if (duplicateIds.length === 0) {
    return { duplicatesRemoved: 0, message: "No duplicates found" };
  }

  console.log(`[Cleanup] Removing ${duplicateIds.length} duplicate passages...`);

  const { data: aiPassages } = await supabase
    .from("passages")
    .select("id")
    .in("parent_passage_id", duplicateIds);

  const aiPassageIds = aiPassages?.map((p) => p.id) || [];

  if (aiPassageIds.length > 0) {
    await supabase.from("matchups").delete().in("ai_passage_id", aiPassageIds);
    await supabase.from("matchups").delete().in("writer_passage_id", duplicateIds);
    await supabase.from("passages").delete().in("id", aiPassageIds);
  }

  const { error: deleteError } = await supabase
    .from("passages")
    .delete()
    .in("id", duplicateIds);

  if (deleteError) {
    console.error("[Cleanup] Error deleting duplicates:", deleteError);
    throw createError({
      statusCode: 500,
      statusMessage: deleteError.message,
    });
  }

  console.log(`[Cleanup] Successfully removed ${duplicateIds.length} duplicates`);

  return {
    duplicatesRemoved: duplicateIds.length,
    aiPassagesRemoved: aiPassageIds.length,
    removedIds: duplicateIds,
  };
});
