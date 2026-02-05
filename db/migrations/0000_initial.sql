CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY,
  name varchar(120) NOT NULL,
  pen_name varchar(120) NOT NULL,
  email varchar(255) NOT NULL UNIQUE,
  timezone varchar(64) NOT NULL DEFAULT 'UTC',
  bio varchar(280),
  password_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS auth_challenges (
  id text PRIMARY KEY,
  email varchar(255) NOT NULL,
  code varchar(12) NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS auth_challenges_email_idx ON auth_challenges (email);

CREATE TABLE IF NOT EXISTS sessions (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions (user_id);
CREATE INDEX IF NOT EXISTS sessions_expires_idx ON sessions (expires_at);

CREATE TABLE IF NOT EXISTS applications (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  goals text NOT NULL,
  project_summary text NOT NULL,
  writing_sample text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS applications_user_idx ON applications (user_id);

CREATE TABLE IF NOT EXISTS tournaments (
  id text PRIMARY KEY,
  name varchar(180) NOT NULL,
  season varchar(32) NOT NULL,
  status varchar(32) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS passages (
  id text PRIMARY KEY,
  user_id text REFERENCES users(id) ON DELETE SET NULL,
  kind varchar(32) NOT NULL,
  title varchar(240) NOT NULL,
  content text NOT NULL,
  genre varchar(120) NOT NULL,
  status varchar(32) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS passages_user_idx ON passages (user_id);

CREATE TABLE IF NOT EXISTS matchups (
  id text PRIMARY KEY,
  tournament_id text NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  writer_passage_id text NOT NULL REFERENCES passages(id),
  ai_passage_id text NOT NULL REFERENCES passages(id),
  opens_at timestamptz NOT NULL,
  closes_at timestamptz NOT NULL,
  status varchar(32) NOT NULL
);

CREATE INDEX IF NOT EXISTS matchups_tournament_idx ON matchups (tournament_id);

CREATE TABLE IF NOT EXISTS ballots (
  id text PRIMARY KEY,
  matchup_id text NOT NULL REFERENCES matchups(id) ON DELETE CASCADE,
  voter_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  option_a text NOT NULL REFERENCES passages(id),
  option_b text NOT NULL REFERENCES passages(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (matchup_id, voter_id)
);

CREATE TABLE IF NOT EXISTS votes (
  id text PRIMARY KEY,
  event_id text NOT NULL UNIQUE,
  matchup_id text NOT NULL REFERENCES matchups(id) ON DELETE CASCADE,
  ballot_id text NOT NULL REFERENCES ballots(id) ON DELETE CASCADE,
  voter_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  choice varchar(1) NOT NULL,
  winner_passage_id text NOT NULL REFERENCES passages(id),
  feedback text NOT NULL,
  trust_weight real NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (voter_id, matchup_id)
);

CREATE INDEX IF NOT EXISTS vote_matchup_idx ON votes (matchup_id);
