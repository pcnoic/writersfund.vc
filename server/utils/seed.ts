import type { Store } from '~/types/domain'

function isoNow(offsetMinutes = 0): string {
  return new Date(Date.now() + offsetMinutes * 60_000).toISOString()
}

export function createSeedStore(): Store {
  const tournamentId = 't-season-2026-01'

  return {
    users: [
      {
        id: 'u-1',
        name: 'Amina West',
        penName: 'Amina West',
        email: 'amina@example.com',
        timezone: 'UTC'
      },
      {
        id: 'u-2',
        name: 'Dylan Brooks',
        penName: 'Dylan Brooks',
        email: 'dylan@example.com',
        timezone: 'UTC'
      },
      {
        id: 'u-3',
        name: 'Mina Shah',
        penName: 'Mina Shah',
        email: 'mina@example.com',
        timezone: 'UTC'
      }
    ],
    authChallenges: [],
    sessions: [],
    applications: [],
    passages: [
      {
        id: 'p-w-1',
        userId: 'u-1',
        kind: 'writer',
        title: 'The Salt Orchard',
        content:
          'By dusk, the orchard shimmered white, and Ida realized each branch was carrying the memory of a winter that had not happened yet.',
        genre: 'literary fiction',
        status: 'approved',
        createdAt: isoNow(-3000)
      },
      {
        id: 'p-ai-1',
        userId: null,
        kind: 'ai',
        title: 'The Orchard Predicts',
        content:
          'The orchard refused the season and crystalized in summer heat, as if tomorrow had leaked backwards and salted every leaf with future frost.',
        genre: 'literary fiction',
        status: 'approved',
        createdAt: isoNow(-2999)
      },
      {
        id: 'p-w-2',
        userId: 'u-2',
        kind: 'writer',
        title: 'Clockmaker Bay',
        content:
          'Every hour, the tide pushed ashore a broken clock, and Mara repaired them only to hear each one counting down from different years.',
        genre: 'speculative',
        status: 'approved',
        createdAt: isoNow(-2800)
      },
      {
        id: 'p-ai-2',
        userId: null,
        kind: 'ai',
        title: 'Tide of Hours',
        content:
          'The harbor worked like a lung and exhaled clockworks at noon; when Mara wound the springs, the town briefly remembered futures it never chose.',
        genre: 'speculative',
        status: 'approved',
        createdAt: isoNow(-2799)
      }
    ],
    matchups: [
      {
        id: 'm-1',
        tournamentId,
        writerPassageId: 'p-w-1',
        aiPassageId: 'p-ai-1',
        opensAt: isoNow(-120),
        closesAt: isoNow(24 * 60),
        status: 'open'
      },
      {
        id: 'm-2',
        tournamentId,
        writerPassageId: 'p-w-2',
        aiPassageId: 'p-ai-2',
        opensAt: isoNow(-120),
        closesAt: isoNow(24 * 60),
        status: 'open'
      }
    ],
    ballots: [],
    votes: [],
    tournaments: [
      {
        id: tournamentId,
        name: 'Writers vs AI - Season 2026.1',
        season: '2026.1',
        status: 'active',
        createdAt: isoNow(-3500)
      }
    ]
  }
}
