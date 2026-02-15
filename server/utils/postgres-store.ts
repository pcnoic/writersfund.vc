import { randomUUID } from "node:crypto";
import { and, asc, count, eq, gt, lt, lte } from "drizzle-orm";
import { createError } from "h3";
import { getDb } from "~/db/client";
import {
  applications,
  authChallenges,
  ballots,
  matchups,
  passages,
  sessions,
  tournaments,
  users,
  votes,
} from "~/db/schema";
import type {
  Application,
  AuthChallenge,
  Ballot,
  LeaderboardEntry,
  Matchup,
  Passage,
  Session,
  Store,
  User,
  Vote,
  VoteChoice,
} from "~/types/domain";
import { createSeedStore } from "./seed";
import {
  buildAiStoryFromNarrative,
  getWordCount,
  summarizeNarrative,
} from "./narrative";
import { canSubmitNow, getNextVotingWindow } from "./schedule";
import { spellcheck } from "./spellcheck";
import { hashPassword } from "./password";

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

function normalizeStore(store: Store): Store {
  return {
    ...store,
    authChallenges: store.authChallenges ?? [],
    sessions: store.sessions ?? [],
    applications: store.applications ?? [],
  };
}

async function ensureSeedData(): Promise<void> {
  const db = getDb();
  const existing = await db.select({ count: count() }).from(tournaments);
  if ((existing[0]?.count ?? 0) > 0) {
    return;
  }

  const seed = createSeedStore();

  await db.insert(users).values(
    seed.users.map((item) => ({
      id: item.id,
      name: item.name,
      penName: item.penName,
      email: item.email,
      timezone: item.timezone,
      bio: item.bio || null,
      passwordHash: item.passwordHash || null,
      createdAt: new Date(),
    })),
  );

  await db.insert(tournaments).values(
    seed.tournaments.map((item) => ({
      id: item.id,
      name: item.name,
      season: item.season,
      status: item.status,
      createdAt: new Date(item.createdAt),
    })),
  );

  await db.insert(passages).values(
    seed.passages.map((item) => ({
      id: item.id,
      userId: item.userId,
      kind: item.kind,
      title: item.title,
      content: item.content,
      genre: item.genre,
      status: item.status,
      createdAt: new Date(item.createdAt),
    })),
  );

  await db.insert(matchups).values(
    seed.matchups.map((item) => ({
      id: item.id,
      tournamentId: item.tournamentId,
      writerPassageId: item.writerPassageId,
      aiPassageId: item.aiPassageId,
      opensAt: new Date(item.opensAt),
      closesAt: new Date(item.closesAt),
      status: item.status,
    })),
  );
}

function deriveNameFromEmail(email: string): string {
  const prefix = email.split("@")[0] ?? "writer";
  const cleaned = prefix.replace(/[._-]+/g, " ").trim();
  return cleaned
    .split(" ")
    .filter(Boolean)
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
    .join(" ");
}

function generateChallengeCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function computeLeaderboard(store: Store): LeaderboardEntry[] {
  const baseRating = 1200;
  const aiRating = 1200;
  const kFactor = 24;

  const writers = new Map<string, LeaderboardEntry>();
  for (const user of store.users) {
    writers.set(user.id, {
      writerId: user.id,
      writerName: user.penName || user.name,
      rating: baseRating,
      wins: 0,
      losses: 0,
      matches: 0,
      votesReceived: 0,
    });
  }

  const sortedVotes = [...store.votes].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  );

  for (const vote of sortedVotes) {
    const matchup = store.matchups.find((item) => item.id === vote.matchupId);
    if (!matchup) continue;

    const writerPassage = store.passages.find(
      (item) => item.id === matchup.writerPassageId,
    );
    if (!writerPassage?.userId) continue;

    const entry = writers.get(writerPassage.userId);
    if (!entry) continue;

    const writerWon = vote.winnerPassageId === matchup.writerPassageId;
    const expected = 1 / (1 + 10 ** ((aiRating - entry.rating) / 400));
    const actual = writerWon ? 1 : 0;

    entry.rating = Number(
      (entry.rating + kFactor * (actual - expected)).toFixed(2),
    );
    entry.matches += 1;
    entry.votesReceived += 1;
    if (writerWon) entry.wins += 1;
    else entry.losses += 1;
  }

  return Array.from(writers.values()).sort((a, b) => b.rating - a.rating);
}

export async function readStore(): Promise<Store> {
  await ensureSeedData();
  const db = getDb();

  const [
    dbUsers,
    dbChallenges,
    dbSessions,
    dbPassages,
    dbMatchups,
    dbBallots,
    dbVotes,
    dbTournaments,
    dbApplications,
  ] = await Promise.all([
    db.select().from(users),
    db.select().from(authChallenges),
    db.select().from(sessions),
    db.select().from(passages),
    db.select().from(matchups),
    db.select().from(ballots),
    db.select().from(votes),
    db.select().from(tournaments),
    db.select().from(applications),
  ]);

  return normalizeStore({
    users: dbUsers.map<User>((item) => ({
      id: item.id,
      name: item.name,
      penName: item.penName || item.name,
      email: item.email,
      timezone: item.timezone || "UTC",
      bio: item.bio || "",
      passwordHash: item.passwordHash || undefined,
    })),
    authChallenges: dbChallenges.map<AuthChallenge>((item) => ({
      id: item.id,
      email: item.email,
      code: item.code,
      expiresAt: toIso(item.expiresAt),
      consumedAt: item.consumedAt ? toIso(item.consumedAt) : null,
      createdAt: toIso(item.createdAt),
    })),
    sessions: dbSessions.map<Session>((item) => ({
      id: item.id,
      userId: item.userId,
      expiresAt: toIso(item.expiresAt),
      createdAt: toIso(item.createdAt),
    })),
    applications: dbApplications.map<Application>((item) => ({
      id: item.id,
      userId: item.userId,
      goals: item.goals,
      projectSummary: item.projectSummary,
      writingSample: item.writingSample,
      createdAt: toIso(item.createdAt),
    })),
    passages: dbPassages.map<Passage>((item) => ({
      id: item.id,
      userId: item.userId,
      kind: item.kind as Passage["kind"],
      title: item.title,
      content: item.content,
      genre: item.genre,
      status: item.status as Passage["status"],
      createdAt: toIso(item.createdAt),
    })),
    matchups: dbMatchups.map<Matchup>((item) => ({
      id: item.id,
      tournamentId: item.tournamentId,
      writerPassageId: item.writerPassageId,
      aiPassageId: item.aiPassageId,
      opensAt: toIso(item.opensAt),
      closesAt: toIso(item.closesAt),
      status: item.status as Matchup["status"],
    })),
    ballots: dbBallots.map<Ballot>((item) => ({
      id: item.id,
      matchupId: item.matchupId,
      voterId: item.voterId,
      optionA: item.optionA,
      optionB: item.optionB,
      createdAt: toIso(item.createdAt),
    })),
    votes: dbVotes.map<Vote>((item) => ({
      id: item.id,
      eventId: item.eventId,
      matchupId: item.matchupId,
      ballotId: item.ballotId,
      voterId: item.voterId,
      choice: item.choice as VoteChoice,
      winnerPassageId: item.winnerPassageId,
      feedback: item.feedback,
      trustWeight: item.trustWeight,
      createdAt: toIso(item.createdAt),
    })),
    tournaments: dbTournaments.map((item) => ({
      id: item.id,
      name: item.name,
      season: item.season,
      status: item.status as "active" | "closed",
      createdAt: toIso(item.createdAt),
    })),
  });
}

export async function writeStore(_store?: Store): Promise<void> {
  throw createError({
    statusCode: 500,
    statusMessage:
      "writeStore is unavailable with Postgres mode. Use explicit mutations.",
  });
}

export async function upsertUserProfile(input: {
  id?: string;
  name: string;
  penName: string;
  email: string;
  timezone: string;
  password?: string;
  bio?: string;
}): Promise<User> {
  await ensureSeedData();
  const db = getDb();
  const normalizedEmail = input.email.trim().toLowerCase();

  const existing = await db.query.users.findFirst({
    where: (table, { eq }) => eq(table.email, normalizedEmail),
  });

  const passwordHash = input.password
    ? hashPassword(input.password)
    : undefined;

  if (!existing) {
    const created = {
      id: input.id || `u-${randomUUID()}`,
      name: input.name.trim(),
      penName: input.penName.trim(),
      email: normalizedEmail,
      timezone: input.timezone,
      bio: input.bio?.trim() || null,
      passwordHash: passwordHash || null,
    };

    await db.insert(users).values(created);
    return {
      id: created.id,
      name: created.name,
      penName: created.penName,
      email: created.email,
      timezone: created.timezone,
      bio: created.bio || "",
    };
  }

  await db
    .update(users)
    .set({
      name: input.name.trim(),
      penName: input.penName.trim(),
      timezone: input.timezone,
      bio: input.bio?.trim() || existing.bio,
      passwordHash: passwordHash || existing.passwordHash,
    })
    .where(eq(users.id, existing.id));

  return {
    id: existing.id,
    name: input.name.trim(),
    penName: input.penName.trim(),
    email: existing.email,
    timezone: input.timezone,
    bio: input.bio?.trim() || existing.bio || "",
  };
}

export async function startAuthChallenge(email: string): Promise<{
  challenge: AuthChallenge;
  user: User;
}> {
  await ensureSeedData();
  const db = getDb();
  const normalizedEmail = email.trim().toLowerCase();

  let user = await db.query.users.findFirst({
    where: (table, { eq }) => eq(table.email, normalizedEmail),
  });

  if (!user) {
    const derivedName = deriveNameFromEmail(normalizedEmail);
    const createdUser = {
      id: `u-${randomUUID()}`,
      name: derivedName,
      penName: derivedName,
      email: normalizedEmail,
      timezone: "UTC",
    };

    await db.insert(users).values(createdUser);
    user = createdUser;
  }

  const challenge: AuthChallenge = {
    id: `ac-${randomUUID()}`,
    email: normalizedEmail,
    code: generateChallengeCode(),
    expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
    consumedAt: null,
    createdAt: new Date().toISOString(),
  };

  await db.insert(authChallenges).values({
    id: challenge.id,
    email: challenge.email,
    code: challenge.code,
    expiresAt: new Date(challenge.expiresAt),
    consumedAt: null,
    createdAt: new Date(challenge.createdAt),
  });

  return {
    challenge,
    user: {
      id: user.id,
      name: user.name,
      penName: user.penName || user.name,
      email: user.email,
      timezone: user.timezone || "UTC",
      bio: user.bio || "",
    },
  };
}

export async function verifyAuthChallenge(
  email: string,
  code: string,
): Promise<{
  session: Session;
  user: User;
}> {
  await ensureSeedData();
  const db = getDb();

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedCode = code.trim();

  const user = await db.query.users.findFirst({
    where: (table, { eq }) => eq(table.email, normalizedEmail),
  });

  if (!user) {
    throw createError({
      statusCode: 404,
      statusMessage: "No account found for this email.",
    });
  }

  const now = new Date();
  const challenge = await db.query.authChallenges.findFirst({
    where: (table, { and, eq, gt, isNull }) =>
      and(
        eq(table.email, normalizedEmail),
        eq(table.code, normalizedCode),
        gt(table.expiresAt, now),
        isNull(table.consumedAt),
      ),
    orderBy: (table, { desc }) => desc(table.createdAt),
  });

  if (!challenge) {
    throw createError({
      statusCode: 401,
      statusMessage: "Invalid or expired login code.",
    });
  }

  await db
    .update(authChallenges)
    .set({ consumedAt: now })
    .where(eq(authChallenges.id, challenge.id));

  const session: Session = {
    id: `s-${randomUUID()}`,
    userId: user.id,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60_000).toISOString(),
    createdAt: now.toISOString(),
  };

  await db.insert(sessions).values({
    id: session.id,
    userId: session.userId,
    expiresAt: new Date(session.expiresAt),
    createdAt: new Date(session.createdAt),
  });

  return {
    session,
    user: {
      id: user.id,
      name: user.name,
      penName: user.penName || user.name,
      email: user.email,
      timezone: user.timezone || "UTC",
      bio: user.bio || "",
    },
  };
}

export async function getUserBySession(
  sessionId: string,
): Promise<User | null> {
  if (!sessionId) return null;

  await ensureSeedData();
  const db = getDb();

  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));

  const session = await db.query.sessions.findFirst({
    where: (table, { and, eq, gt }) =>
      and(eq(table.id, sessionId), gt(table.expiresAt, new Date())),
  });

  if (!session) {
    return null;
  }

  const user = await db.query.users.findFirst({
    where: (table, { eq }) => eq(table.id, session.userId),
  });

  if (!user) return null;

  return {
    id: user.id,
    name: user.name,
    penName: user.penName || user.name,
    email: user.email,
    timezone: user.timezone || "UTC",
    bio: user.bio || "",
  };
}

export async function revokeSession(sessionId: string): Promise<void> {
  if (!sessionId) return;
  await ensureSeedData();
  const db = getDb();
  await db.delete(sessions).where(eq(sessions.id, sessionId));
}

export async function createApplication(input: {
  userId: string;
  goals: string;
  projectSummary: string;
  writingSample: string;
}): Promise<Application> {
  await ensureSeedData();
  const db = getDb();

  const application: Application = {
    id: `app-${randomUUID()}`,
    userId: input.userId,
    goals: input.goals.trim(),
    projectSummary: input.projectSummary.trim(),
    writingSample: input.writingSample.trim(),
    createdAt: new Date().toISOString(),
  };

  await db.insert(applications).values({
    id: application.id,
    userId: application.userId,
    goals: application.goals,
    projectSummary: application.projectSummary,
    writingSample: application.writingSample,
    createdAt: new Date(application.createdAt),
  });

  return application;
}

export async function createPassage(input: {
  userId: string;
  title: string;
  content: string;
  genre: string;
}): Promise<{
  passage: Passage;
  aiPassage: Passage;
  matchup: Matchup;
  narrative: string;
  wordCount: number;
}> {
  await ensureSeedData();
  const db = getDb();

  const user = await db.query.users.findFirst({
    where: (table, { eq }) => eq(table.id, input.userId),
  });
  if (!user) {
    throw createError({
      statusCode: 404,
      statusMessage: "Authenticated user not found.",
    });
  }

  const submissionWindow = canSubmitNow();
  if (!submissionWindow.allowed) {
    throw createError({
      statusCode: 403,
      statusMessage: `Submissions are closed during voting. Next open: ${submissionWindow.nextOpen.toISOString()}`,
    });
  }

  const corrected = spellcheck(input.content);
  const wordCount = getWordCount(corrected);
  if (wordCount > 3000) {
    throw createError({
      statusCode: 400,
      statusMessage: "Passage must be 3000 words or fewer.",
    });
  }

  const passage: Passage = {
    id: `p-${randomUUID()}`,
    userId: input.userId,
    kind: "writer",
    title: input.title,
    content: corrected,
    genre: input.genre,
    status: "approved",
    createdAt: new Date().toISOString(),
  };

  const narrative = summarizeNarrative(corrected);
  const aiStory = buildAiStoryFromNarrative({ narrative, maxWords: wordCount });

  const aiPassage: Passage = {
    id: `p-${randomUUID()}`,
    userId: null,
    kind: "ai",
    title: `${input.title} (AI mirror)`,
    content: aiStory,
    genre: input.genre,
    status: "approved",
    createdAt: new Date().toISOString(),
  };

  const activeTournament = await db.query.tournaments.findFirst({
    where: (table, { eq }) => eq(table.status, "active"),
  });

  if (!activeTournament) {
    throw createError({
      statusCode: 500,
      statusMessage: "No active tournament configured.",
    });
  }

  const nextWindow = getNextVotingWindow();
  const matchup: Matchup = {
    id: `m-${randomUUID()}`,
    tournamentId: activeTournament.id,
    writerPassageId: passage.id,
    aiPassageId: aiPassage.id,
    opensAt: nextWindow.opensAt.toISOString(),
    closesAt: nextWindow.closesAt.toISOString(),
    status: "open",
  };

  await db.insert(passages).values([
    {
      id: passage.id,
      userId: passage.userId,
      kind: passage.kind,
      title: passage.title,
      content: passage.content,
      genre: passage.genre,
      status: passage.status,
      createdAt: new Date(passage.createdAt),
    },
    {
      id: aiPassage.id,
      userId: aiPassage.userId,
      kind: aiPassage.kind,
      title: aiPassage.title,
      content: aiPassage.content,
      genre: aiPassage.genre,
      status: aiPassage.status,
      createdAt: new Date(aiPassage.createdAt),
    },
  ]);

  await db.insert(matchups).values({
    id: matchup.id,
    tournamentId: matchup.tournamentId,
    writerPassageId: matchup.writerPassageId,
    aiPassageId: matchup.aiPassageId,
    opensAt: new Date(matchup.opensAt),
    closesAt: new Date(matchup.closesAt),
    status: matchup.status,
  });

  return { passage, aiPassage, matchup, narrative, wordCount };
}

export async function getOrCreateBallot(voterId: string): Promise<{
  ballot: Ballot | null;
  writerPassage: Passage | null;
  aiPassage: Passage | null;
}> {
  await ensureSeedData();
  const db = getDb();

  const now = new Date();
  const candidateMatchups = await db
    .select()
    .from(matchups)
    .where(
      and(
        eq(matchups.status, "open"),
        lte(matchups.opensAt, now),
        gt(matchups.closesAt, now),
      ),
    )
    .orderBy(asc(matchups.opensAt));

  for (const matchup of candidateMatchups) {
    const vote = await db.query.votes.findFirst({
      where: (table, { and, eq }) =>
        and(eq(table.matchupId, matchup.id), eq(table.voterId, voterId)),
    });

    if (vote) continue;

    let ballot = await db.query.ballots.findFirst({
      where: (table, { and, eq }) =>
        and(eq(table.matchupId, matchup.id), eq(table.voterId, voterId)),
    });

    const writerPassage = await db.query.passages.findFirst({
      where: (table, { eq }) => eq(table.id, matchup.writerPassageId),
    });
    const aiPassage = await db.query.passages.findFirst({
      where: (table, { eq }) => eq(table.id, matchup.aiPassageId),
    });

    if (!writerPassage || !aiPassage) {
      continue;
    }

    if (!ballot) {
      const flip = Math.random() > 0.5;
      const ballotRow = {
        id: `b-${randomUUID()}`,
        matchupId: matchup.id,
        voterId,
        optionA: flip ? writerPassage.id : aiPassage.id,
        optionB: flip ? aiPassage.id : writerPassage.id,
        createdAt: new Date(),
      };

      await db.insert(ballots).values(ballotRow);
      ballot = ballotRow;
    }

    return {
      ballot: {
        id: ballot.id,
        matchupId: ballot.matchupId,
        voterId: ballot.voterId,
        optionA: ballot.optionA,
        optionB: ballot.optionB,
        createdAt: toIso(ballot.createdAt),
      },
      writerPassage: {
        id: writerPassage.id,
        userId: writerPassage.userId,
        kind: writerPassage.kind as Passage["kind"],
        title: writerPassage.title,
        content: writerPassage.content,
        genre: writerPassage.genre,
        status: writerPassage.status as Passage["status"],
        createdAt: toIso(writerPassage.createdAt),
      },
      aiPassage: {
        id: aiPassage.id,
        userId: aiPassage.userId,
        kind: aiPassage.kind as Passage["kind"],
        title: aiPassage.title,
        content: aiPassage.content,
        genre: aiPassage.genre,
        status: aiPassage.status as Passage["status"],
        createdAt: toIso(aiPassage.createdAt),
      },
    };
  }

  return { ballot: null, writerPassage: null, aiPassage: null };
}

export async function castVote(input: {
  ballotId: string;
  voterId: string;
  choice: VoteChoice;
  feedback: string;
}): Promise<Vote> {
  await ensureSeedData();
  const db = getDb();

  const ballot = await db.query.ballots.findFirst({
    where: (table, { eq }) => eq(table.id, input.ballotId),
  });

  if (!ballot) {
    throw createError({ statusCode: 404, statusMessage: "Ballot not found." });
  }

  const matchup = await db.query.matchups.findFirst({
    where: (table, { eq }) => eq(table.id, ballot.matchupId),
  });

  if (!matchup) {
    throw createError({ statusCode: 404, statusMessage: "Matchup not found." });
  }

  const now = new Date();
  if (now < matchup.opensAt || now > matchup.closesAt) {
    throw createError({
      statusCode: 403,
      statusMessage: "Voting is closed for this matchup.",
    });
  }

  if (ballot.voterId !== input.voterId) {
    throw createError({
      statusCode: 403,
      statusMessage: "Ballot does not belong to this voter.",
    });
  }

  if (input.feedback.trim().length < 50) {
    throw createError({
      statusCode: 400,
      statusMessage: "Feedback must be at least 50 characters.",
    });
  }

  const alreadyVoted = await db.query.votes.findFirst({
    where: (table, { and, eq }) =>
      and(
        eq(table.voterId, input.voterId),
        eq(table.matchupId, ballot.matchupId),
      ),
  });

  if (alreadyVoted) {
    throw createError({
      statusCode: 409,
      statusMessage: "You have already voted on this matchup.",
    });
  }

  const vote: Vote = {
    id: `v-${randomUUID()}`,
    eventId: `evt-${randomUUID()}`,
    matchupId: ballot.matchupId,
    ballotId: ballot.id,
    voterId: input.voterId,
    choice: input.choice,
    winnerPassageId: input.choice === "A" ? ballot.optionA : ballot.optionB,
    feedback: input.feedback.trim(),
    trustWeight: 1,
    createdAt: new Date().toISOString(),
  };

  await db.insert(votes).values({
    id: vote.id,
    eventId: vote.eventId,
    matchupId: vote.matchupId,
    ballotId: vote.ballotId,
    voterId: vote.voterId,
    choice: vote.choice,
    winnerPassageId: vote.winnerPassageId,
    feedback: vote.feedback,
    trustWeight: vote.trustWeight,
    createdAt: new Date(vote.createdAt),
  });

  return vote;
}

export async function getMatchupResult(matchupId: string): Promise<{
  writerVotes: number;
  aiVotes: number;
  totalVotes: number;
}> {
  await ensureSeedData();
  const db = getDb();
  const matchup = await db.query.matchups.findFirst({
    where: (table, { eq }) => eq(table.id, matchupId),
  });

  if (!matchup) {
    throw createError({ statusCode: 404, statusMessage: "Matchup not found." });
  }

  const now = Date.now();
  if (now < matchup.closesAt.getTime()) {
    throw createError({
      statusCode: 403,
      statusMessage: "Results are locked until the voting window closes.",
    });
  }

  const matchupVotes = await db
    .select()
    .from(votes)
    .where(eq(votes.matchupId, matchup.id));

  let writerVotes = 0;
  let aiVotes = 0;

  for (const vote of matchupVotes) {
    if (vote.winnerPassageId === matchup.writerPassageId) writerVotes += 1;
    if (vote.winnerPassageId === matchup.aiPassageId) aiVotes += 1;
  }

  return {
    writerVotes,
    aiVotes,
    totalVotes: writerVotes + aiVotes,
  };
}

export async function buildLeaderboard(): Promise<LeaderboardEntry[]> {
  const store = await readStore();
  return computeLeaderboard(store);
}
