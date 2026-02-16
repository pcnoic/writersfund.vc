import { createError } from "h3";
import { serverSupabaseClient, serverSupabaseUser } from "#supabase/server";

function weekIndex(startIso: string, now = new Date()): number {
  const start = new Date(startIso);
  const diffMs = now.getTime() - start.getTime();
  return Math.max(
    1,
    Math.min(12, Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1),
  );
}

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event);
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: "Authentication required.",
    });
  }

  const supabase = await serverSupabaseClient(event);

  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id, name, pen_name, email, timezone, bio")
    .eq("id", user.id)
    .maybeSingle();

  let userRecord: {
    id: string;
    name: string;
    penName: string;
    email: string;
    timezone: string;
    bio: string;
  };

  if (existingProfile) {
    userRecord = {
      id: existingProfile.id,
      name: existingProfile.name,
      penName: existingProfile.pen_name,
      email: existingProfile.email,
      timezone: existingProfile.timezone,
      bio: existingProfile.bio || "",
    };
  } else {
    const newProfile = {
      id: user.id,
      name: user.user_metadata?.name || "Writer",
      pen_name: user.user_metadata?.pen_name || "Writer",
      email: user.email!,
      timezone: user.user_metadata?.timezone || "UTC",
      bio: user.user_metadata?.bio || "",
    };
    await supabase.from("profiles").insert(newProfile);
    userRecord = {
      id: newProfile.id,
      name: newProfile.name,
      penName: newProfile.pen_name,
      email: newProfile.email,
      timezone: newProfile.timezone,
      bio: newProfile.bio,
    };
  }

  const { data: passages } = await supabase
    .from("passages")
    .select("id, title, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const { data: votesCast } = await supabase
    .from("votes")
    .select("id, matchup_id, winner_passage_id, created_at")
    .eq("voter_id", user.id);

  const { data: userPassages } = await supabase
    .from("passages")
    .select("id")
    .eq("user_id", user.id);

  const passageIds = (userPassages || []).map((item) => item.id);

  const { data: matchups } = await supabase
    .from("matchups")
    .select("id, writer_passage_id, opens_at, closes_at")
    .in("writer_passage_id", passageIds.length ? passageIds : [""]);

  const matchupIds = (matchups || []).map((item) => item.id);

  const { data: votesReceived } = await supabase
    .from("votes")
    .select("id, matchup_id, winner_passage_id")
    .in("matchup_id", matchupIds.length ? matchupIds : [""]);

  let writerVotes = 0;
  for (const vote of votesReceived || []) {
    const matchup = matchups?.find((item) => item.id === vote.matchup_id);
    if (!matchup) continue;
    if (vote.winner_passage_id === matchup.writer_passage_id) writerVotes += 1;
  }

  const votesReceivedCount = votesReceived?.length || 0;
  const winRate =
    votesReceivedCount > 0
      ? Math.round((writerVotes / votesReceivedCount) * 100)
      : 0;
  const averagePeerRating = winRate;

  const { data: feedbackVotes } = await supabase
    .from("votes")
    .select("feedback")
    .in("matchup_id", matchupIds.length ? matchupIds : [""]);

  const feedbackList = (feedbackVotes || [])
    .map((v) => v.feedback)
    .filter((f) => f && f.trim().length > 0);

  const baseRating = 1200;
  const aiRating = 1200;
  const kFactor = 24;
  let currentElo = baseRating;

  const { data: allVotesForElo } = await supabase
    .from("votes")
    .select("matchup_id, winner_passage_id, created_at")
    .in("matchup_id", matchupIds.length ? matchupIds : [""])
    .order("created_at", { ascending: true });

  for (const vote of allVotesForElo || []) {
    const matchup = matchups?.find((m) => m.id === vote.matchup_id);
    if (!matchup) continue;
    const writerWon = vote.winner_passage_id === matchup.writer_passage_id;
    const expected = 1 / (1 + 10 ** ((aiRating - currentElo) / 400));
    const actual = writerWon ? 1 : 0;
    currentElo = Number((currentElo + kFactor * (actual - expected)).toFixed(2));
  }

  const { data: allProfiles } = await supabase
    .from("profiles")
    .select("id");

  const { data: allPassages } = await supabase
    .from("passages")
    .select("id, user_id")
    .eq("kind", "writer");

  const { data: allMatchups } = await supabase
    .from("matchups")
    .select("id, writer_passage_id");

  const { data: allVotes } = await supabase
    .from("votes")
    .select("matchup_id, winner_passage_id, created_at")
    .order("created_at", { ascending: true });

  const writerElos = new Map<string, number>();
  for (const p of allProfiles || []) {
    writerElos.set(p.id, baseRating);
  }

  for (const vote of allVotes || []) {
    const matchup = allMatchups?.find((m) => m.id === vote.matchup_id);
    if (!matchup) continue;
    const passage = allPassages?.find((p) => p.id === matchup.writer_passage_id);
    if (!passage?.user_id) continue;
    const elo = writerElos.get(passage.user_id) || baseRating;
    const writerWon = vote.winner_passage_id === matchup.writer_passage_id;
    const expected = 1 / (1 + 10 ** ((aiRating - elo) / 400));
    const actual = writerWon ? 1 : 0;
    writerElos.set(passage.user_id, Number((elo + kFactor * (actual - expected)).toFixed(2)));
  }

  const sortedWriters = Array.from(writerElos.entries()).sort((a, b) => b[1] - a[1]);
  const userRankIndex = sortedWriters.findIndex(([id]) => id === user.id);
  const userRank = userRankIndex >= 0 ? userRankIndex + 1 : null;

  const { data: tournament } = await supabase
    .from("tournaments")
    .select("created_at")
    .eq("status", "active")
    .maybeSingle();

  const week = tournament?.created_at ? weekIndex(tournament.created_at) : 1;

  const timeline = Array.from({ length: 12 }).map((_, index) => {
    const weekNumber = index + 1;
    const start = tournament?.created_at
      ? new Date(tournament.created_at)
      : new Date();
    start.setUTCDate(start.getUTCDate() + (weekNumber - 1) * 7);
    const end = new Date(start);
    end.setUTCDate(start.getUTCDate() + 7);

    const submitted = (passages || []).some((passage) => {
      const createdAt = new Date(passage.created_at);
      return createdAt >= start && createdAt < end;
    });

    return {
      week: weekNumber,
      status: submitted
        ? "Submitted"
        : weekNumber < week
          ? "Missed"
          : "Pending",
      delta: submitted ? "TBD" : "—",
    };
  });

  return {
    user: {
      id: userRecord.id,
      name: userRecord.name,
      penName: userRecord.penName,
      email: userRecord.email,
      timezone: userRecord.timezone,
      bio: userRecord.bio || "",
    },
    competitive: {
      rank: userRank,
      elo: currentElo,
      week,
      totalWeeks: 12,
    },
    stats: {
      submissions: passages?.length || 0,
      winRate,
      averagePeerRating,
      feedbackReceived: votesReceivedCount,
      votesCast: votesCast?.length || 0,
    },
    timeline,
    passages: passages || [],
    feedback: feedbackList,
  };
});
