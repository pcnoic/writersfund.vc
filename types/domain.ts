export type PassageKind = 'writer' | 'ai'
export type MatchupStatus = 'open' | 'closed'
export type PassageStatus = 'approved' | 'pending_review' | 'rejected'

export interface User {
  id: string
  name: string
  penName: string
  email: string
  timezone: string
  bio?: string
  passwordHash?: string
}

export interface Application {
  id: string
  userId: string
  goals: string
  projectSummary: string
  writingSample: string
  createdAt: string
}

export interface AuthChallenge {
  id: string
  email: string
  code: string
  expiresAt: string
  consumedAt: string | null
  createdAt: string
}

export interface Session {
  id: string
  userId: string
  expiresAt: string
  createdAt: string
}

export interface Passage {
  id: string
  userId: string | null
  kind: PassageKind
  title: string
  content: string
  genre: string
  status: PassageStatus
  createdAt: string
}

export interface Matchup {
  id: string
  tournamentId: string
  writerPassageId: string
  aiPassageId: string
  opensAt: string
  closesAt: string
  status: MatchupStatus
}

export interface Ballot {
  id: string
  matchupId: string
  voterId: string
  optionA: string
  optionB: string
  createdAt: string
}

export type VoteChoice = 'A' | 'B'

export interface Vote {
  id: string
  eventId: string
  matchupId: string
  ballotId: string
  voterId: string
  choice: VoteChoice
  winnerPassageId: string
  feedback: string
  trustWeight: number
  createdAt: string
}

export interface Tournament {
  id: string
  name: string
  season: string
  status: 'active' | 'closed'
  createdAt: string
}

export interface LeaderboardEntry {
  writerId: string
  writerName: string
  rating: number
  wins: number
  losses: number
  matches: number
  votesReceived: number
}

export interface Store {
  users: User[]
  authChallenges: AuthChallenge[]
  sessions: Session[]
  applications: Application[]
  passages: Passage[]
  matchups: Matchup[]
  ballots: Ballot[]
  votes: Vote[]
  tournaments: Tournament[]
}
