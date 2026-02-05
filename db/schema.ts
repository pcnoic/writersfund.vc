import {
  index,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  varchar
} from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  name: varchar('name', { length: 120 }).notNull(),
  penName: varchar('pen_name', { length: 120 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  timezone: varchar('timezone', { length: 64 }).notNull().default('UTC'),
  bio: varchar('bio', { length: 280 }),
  passwordHash: text('password_hash'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  usersEmailIdx: uniqueIndex('users_email_idx').on(table.email)
}))

export const authChallenges = pgTable('auth_challenges', {
  id: text('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull(),
  code: varchar('code', { length: 12 }).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  consumedAt: timestamp('consumed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  authChallengesEmailIdx: index('auth_challenges_email_idx').on(table.email)
}))

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  sessionsUserIdx: index('sessions_user_idx').on(table.userId),
  sessionsExpiresIdx: index('sessions_expires_idx').on(table.expiresAt)
}))

export const applications = pgTable('applications', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  goals: text('goals').notNull(),
  projectSummary: text('project_summary').notNull(),
  writingSample: text('writing_sample').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  applicationsUserIdx: index('applications_user_idx').on(table.userId)
}))

export const tournaments = pgTable('tournaments', {
  id: text('id').primaryKey(),
  name: varchar('name', { length: 180 }).notNull(),
  season: varchar('season', { length: 32 }).notNull(),
  status: varchar('status', { length: 32 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
})

export const passages = pgTable('passages', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
  kind: varchar('kind', { length: 32 }).notNull(),
  title: varchar('title', { length: 240 }).notNull(),
  content: text('content').notNull(),
  genre: varchar('genre', { length: 120 }).notNull(),
  status: varchar('status', { length: 32 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  passagesUserIdx: index('passages_user_idx').on(table.userId)
}))

export const matchups = pgTable('matchups', {
  id: text('id').primaryKey(),
  tournamentId: text('tournament_id').notNull().references(() => tournaments.id, { onDelete: 'cascade' }),
  writerPassageId: text('writer_passage_id').notNull().references(() => passages.id),
  aiPassageId: text('ai_passage_id').notNull().references(() => passages.id),
  opensAt: timestamp('opens_at', { withTimezone: true }).notNull(),
  closesAt: timestamp('closes_at', { withTimezone: true }).notNull(),
  status: varchar('status', { length: 32 }).notNull()
}, (table) => ({
  matchupsTournamentIdx: index('matchups_tournament_idx').on(table.tournamentId)
}))

export const ballots = pgTable('ballots', {
  id: text('id').primaryKey(),
  matchupId: text('matchup_id').notNull().references(() => matchups.id, { onDelete: 'cascade' }),
  voterId: text('voter_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  optionA: text('option_a').notNull().references(() => passages.id),
  optionB: text('option_b').notNull().references(() => passages.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  ballotUniqueIdx: uniqueIndex('ballot_unique_idx').on(table.matchupId, table.voterId)
}))

export const votes = pgTable('votes', {
  id: text('id').primaryKey(),
  eventId: text('event_id').notNull(),
  matchupId: text('matchup_id').notNull().references(() => matchups.id, { onDelete: 'cascade' }),
  ballotId: text('ballot_id').notNull().references(() => ballots.id, { onDelete: 'cascade' }),
  voterId: text('voter_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  choice: varchar('choice', { length: 1 }).notNull(),
  winnerPassageId: text('winner_passage_id').notNull().references(() => passages.id),
  feedback: text('feedback').notNull(),
  trustWeight: real('trust_weight').notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  voteUniqueIdx: uniqueIndex('vote_unique_idx').on(table.voterId, table.matchupId),
  voteEventIdx: uniqueIndex('vote_event_idx').on(table.eventId),
  voteMatchupIdx: index('vote_matchup_idx').on(table.matchupId)
}))

export type DbUser = typeof users.$inferSelect
export type DbPassage = typeof passages.$inferSelect
