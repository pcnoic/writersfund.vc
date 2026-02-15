import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import { resolve } from "node:path";
import { createError } from "h3";
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
import * as pgStore from "./postgres-store";
import {
  buildAiStoryFromNarrative,
  getWordCount,
  summarizeNarrative,
} from "./narrative";
import { canSubmitNow, getNextVotingWindow } from "./schedule";
import { spellcheck } from "./spellcheck";
import { hashPassword } from "./password";

const STORE_FILE = resolve(process.cwd(), "data/store.json");
const usePostgres = Boolean(process.env.DATABASE_URL);

function normalizeStore(store: Store): Store {
  return {
    ...store,
    users: (store.users ?? []).map((user) => ({
      ...user,
      penName: user.penName || user.name,
      timezone: user.timezone || "UTC",
      bio: user.bio || "",
    })),
    authChallenges: store.authChallenges ?? [],
    sessions: store.sessions ?? [],
    applications: store.applications ?? [],
  };
}

async function ensureStoreFile(): Promise<void> {
  try {
    await fs.access(STORE_FILE);
  } catch {
    await fs.mkdir(resolve(process.cwd(), "data"), { recursive: true });
    const seed = createSeedStore();
    await fs.writeFile(STORE_FILE, JSON.stringify(seed, null, 2), "utf8");
  }
}

async function readFileStore(): Promise<Store> {
  await ensureStoreFile();
  const raw = await fs.readFile(STORE_FILE, "utf8");
  return normalizeStore(JSON.parse(raw) as Store);
}

async function writeFileStore(store: Store): Promise<void> {
  await fs.writeFile(
    STORE_FILE,
    JSON.stringify(normalizeStore(store), null, 2),
    "utf8",
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

function isExpired(isoDate: string): boolean {
  return Date.parse(isoDate) < Date.now();
}

function openMatchupsForVoter(store: Store, voterId: string): Matchup[] {
  const alreadyVoted = new Set(
    store.votes
      .filter((vote) => vote.voterId === voterId)
      .map((vote) => vote.matchupId),
  );

  return store.matchups.filter((matchup) => {
    if (matchup.status !== "open") return false;
    if (alreadyVoted.has(matchup.id)) return false;
    const now = Date.now();
    return (
      now >= Date.parse(matchup.opensAt) && now <= Date.parse(matchup.closesAt)
    );
  });
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
  return usePostgres ? pgStore.readStore() : readFileStore();
}

export async function writeStore(store: Store): Promise<void> {
  if (usePostgres) {
    return pgStore.writeStore(store);
  }

  return writeFileStore(store);
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
  if (usePostgres) {
    return pgStore.upsertUserProfile(input);
  }

  const store = await readFileStore();
  const normalizedEmail = input.email.trim().toLowerCase();

  let user = store.users.find(
    (item) => item.email.toLowerCase() === normalizedEmail,
  );
  if (!user) {
    user = {
      id: input.id || `u-${randomUUID()}`,
      name: input.name.trim(),
      penName: input.penName.trim(),
      email: normalizedEmail,
      timezone: input.timezone,
      bio: input.bio?.trim() || "",
      passwordHash: input.password ? hashPassword(input.password) : undefined,
    };
    store.users.push(user);
  } else {
    user.name = input.name.trim();
    user.penName = input.penName.trim();
    user.timezone = input.timezone;
    user.bio = input.bio?.trim() || user.bio;
    if (input.password) {
      user.passwordHash = hashPassword(input.password);
    }
  }

  await writeFileStore(store);
  return user;
}

export async function startAuthChallenge(email: string): Promise<{
  challenge: AuthChallenge;
  user: User;
}> {
  if (usePostgres) {
    return pgStore.startAuthChallenge(email);
  }

  const normalizedEmail = email.trim().toLowerCase();
  const store = await readFileStore();

  let user = store.users.find(
    (item) => item.email.toLowerCase() === normalizedEmail,
  );
  if (!user) {
    const derivedName = deriveNameFromEmail(normalizedEmail);
    user = {
      id: `u-${randomUUID()}`,
      email: normalizedEmail,
      name: derivedName,
      penName: derivedName,
      timezone: "UTC",
    };
    store.users.push(user);
  }

  const challenge: AuthChallenge = {
    id: `ac-${randomUUID()}`,
    email: normalizedEmail,
    code: generateChallengeCode(),
    expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
    consumedAt: null,
    createdAt: new Date().toISOString(),
  };

  store.authChallenges.unshift(challenge);
  store.authChallenges = store.authChallenges.slice(0, 200);
  await writeFileStore(store);

  return { challenge, user };
}

export async function verifyAuthChallenge(
  email: string,
  code: string,
): Promise<{
  session: Session;
  user: User;
}> {
  if (usePostgres) {
    return pgStore.verifyAuthChallenge(email, code);
  }

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedCode = code.trim();
  const store = await readFileStore();

  const user = store.users.find(
    (item) => item.email.toLowerCase() === normalizedEmail,
  );
  if (!user) {
    throw createError({
      statusCode: 404,
      statusMessage: "No account found for this email.",
    });
  }

  const challenge = store.authChallenges.find(
    (item) =>
      item.email === normalizedEmail &&
      item.code === normalizedCode &&
      item.consumedAt === null &&
      !isExpired(item.expiresAt),
  );

  if (!challenge) {
    throw createError({
      statusCode: 401,
      statusMessage: "Invalid or expired login code.",
    });
  }

  challenge.consumedAt = new Date().toISOString();

  const session: Session = {
    id: `s-${randomUUID()}`,
    userId: user.id,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60_000).toISOString(),
    createdAt: new Date().toISOString(),
  };

  store.sessions.push(session);
  await writeFileStore(store);

  return { session, user };
}

export async function getUserBySession(
  sessionId: string,
): Promise<User | null> {
  if (usePostgres) {
    return pgStore.getUserBySession(sessionId);
  }

  if (!sessionId) return null;
  const store = await readFileStore();

  store.sessions = store.sessions.filter(
    (session) => !isExpired(session.expiresAt),
  );
  const session = store.sessions.find((item) => item.id === sessionId);
  if (!session) {
    await writeFileStore(store);
    return null;
  }

  const user = store.users.find((item) => item.id === session.userId) ?? null;
  await writeFileStore(store);
  return user;
}

export async function revokeSession(sessionId: string): Promise<void> {
  if (usePostgres) {
    return pgStore.revokeSession(sessionId);
  }

  if (!sessionId) return;
  const store = await readFileStore();
  store.sessions = store.sessions.filter((session) => session.id !== sessionId);
  await writeFileStore(store);
}

export async function createApplication(input: {
  userId: string;
  goals: string;
  projectSummary: string;
  writingSample: string;
}): Promise<Application> {
  if (usePostgres) {
    return pgStore.createApplication(input);
  }

  const store = await readFileStore();
  const application: Application = {
    id: `app-${randomUUID()}`,
    userId: input.userId,
    goals: input.goals.trim(),
    projectSummary: input.projectSummary.trim(),
    writingSample: input.writingSample.trim(),
    createdAt: new Date().toISOString(),
  };

  store.applications.unshift(application);
  await writeFileStore(store);
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
  if (usePostgres) {
    return pgStore.createPassage(input);
  }

  const store = await readFileStore();
  const user = store.users.find((item) => item.id === input.userId);
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

  const activeTournament = store.tournaments.find(
    (item) => item.status === "active",
  );
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

  store.passages.unshift(passage, aiPassage);
  store.matchups.unshift(matchup);
  await writeFileStore(store);
  return { passage, aiPassage, matchup, narrative, wordCount };
}

export async function getOrCreateBallot(voterId: string): Promise<{
  ballot: Ballot | null;
  writerPassage: Passage | null;
  aiPassage: Passage | null;
}> {
  if (usePostgres) {
    return pgStore.getOrCreateBallot(voterId);
  }

  const store = await readFileStore();

  const voter = store.users.find((item) => item.id === voterId);
  if (!voter) {
    throw createError({
      statusCode: 401,
      statusMessage: "Authentication required.",
    });
  }

  const matchups = openMatchupsForVoter(store, voterId);
  const matchup = matchups[0];

  if (!matchup) {
    return { ballot: null, writerPassage: null, aiPassage: null };
  }

  const writerPassage =
    store.passages.find((passage) => passage.id === matchup.writerPassageId) ??
    null;
  const aiPassage =
    store.passages.find((passage) => passage.id === matchup.aiPassageId) ??
    null;

  if (!writerPassage || !aiPassage) {
    return { ballot: null, writerPassage: null, aiPassage: null };
  }

  const existing = store.ballots.find(
    (ballot) => ballot.matchupId === matchup.id && ballot.voterId === voterId,
  );
  if (existing) {
    return { ballot: existing, writerPassage, aiPassage };
  }

  const flip = Math.random() > 0.5;
  const ballot: Ballot = {
    id: `b-${randomUUID()}`,
    matchupId: matchup.id,
    voterId,
    optionA: flip ? writerPassage.id : aiPassage.id,
    optionB: flip ? aiPassage.id : writerPassage.id,
    createdAt: new Date().toISOString(),
  };

  store.ballots.push(ballot);
  await writeFileStore(store);

  return { ballot, writerPassage, aiPassage };
}

export async function castVote(input: {
  ballotId: string;
  voterId: string;
  choice: VoteChoice;
  feedback: string;
}): Promise<Vote> {
  if (usePostgres) {
    return pgStore.castVote(input);
  }

  const store = await readFileStore();
  const ballot = store.ballots.find((item) => item.id === input.ballotId);
  if (!ballot) {
    throw createError({ statusCode: 404, statusMessage: "Ballot not found." });
  }

  const matchup = store.matchups.find((item) => item.id === ballot.matchupId);
  if (!matchup) {
    throw createError({ statusCode: 404, statusMessage: "Matchup not found." });
  }

  const now = Date.now();
  if (now < Date.parse(matchup.opensAt) || now > Date.parse(matchup.closesAt)) {
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

  const alreadyVoted = store.votes.find(
    (vote) =>
      vote.voterId === input.voterId && vote.matchupId === ballot.matchupId,
  );
  if (alreadyVoted) {
    throw createError({
      statusCode: 409,
      statusMessage: "You have already voted on this matchup.",
    });
  }

  const winnerPassageId =
    input.choice === "A" ? ballot.optionA : ballot.optionB;
  const vote: Vote = {
    id: `v-${randomUUID()}`,
    eventId: `evt-${randomUUID()}`,
    matchupId: ballot.matchupId,
    ballotId: ballot.id,
    voterId: input.voterId,
    choice: input.choice,
    winnerPassageId,
    feedback: input.feedback.trim(),
    trustWeight: 1,
    createdAt: new Date().toISOString(),
  };

  store.votes.push(vote);
  await writeFileStore(store);
  return vote;
}

export async function buildLeaderboard(
  store?: Store,
): Promise<LeaderboardEntry[]> {
  if (usePostgres) {
    return pgStore.buildLeaderboard();
  }

  const loadedStore = store ?? (await readFileStore());
  return computeLeaderboard(loadedStore);
}

export async function getMatchupResult(matchupId: string): Promise<{
  writerVotes: number;
  aiVotes: number;
  totalVotes: number;
}> {
  if (usePostgres) {
    return pgStore.getMatchupResult(matchupId);
  }

  const store = await readFileStore();
  const matchup = store.matchups.find((item) => item.id === matchupId);
  if (!matchup) {
    throw createError({ statusCode: 404, statusMessage: "Matchup not found." });
  }

  const now = Date.now();
  if (now < Date.parse(matchup.closesAt)) {
    throw createError({
      statusCode: 403,
      statusMessage: "Results are locked until the voting window closes.",
    });
  }

  let writerVotes = 0;
  let aiVotes = 0;

  for (const vote of store.votes.filter(
    (item) => item.matchupId === matchup.id,
  )) {
    if (vote.winnerPassageId === matchup.writerPassageId) writerVotes += 1;
    if (vote.winnerPassageId === matchup.aiPassageId) aiVotes += 1;
  }

  return {
    writerVotes,
    aiVotes,
    totalVotes: writerVotes + aiVotes,
  };
}
