const WEEKDAY_SATURDAY = 6
const WEEKDAY_SUNDAY = 0
const WEEKDAY_MONDAY = 1

function withUtcTime(date: Date, hours: number, minutes: number): Date {
  const copy = new Date(date)
  copy.setUTCHours(hours, minutes, 0, 0)
  return copy
}

export function getCurrentVotingWindow(now = new Date()): {
  opensAt: Date
  closesAt: Date
  isOpen: boolean
} {
  const day = now.getUTCDay()
  const saturday = new Date(now)
  saturday.setUTCDate(now.getUTCDate() - ((day + 1) % 7))

  const opensAt = withUtcTime(saturday, 21, 0)
  const closesAt = withUtcTime(new Date(opensAt), 21, 0)
  closesAt.setUTCDate(opensAt.getUTCDate() + 1)

  const isOpen = now >= opensAt && now < closesAt
  return { opensAt, closesAt, isOpen }
}

export function getNextVotingWindow(now = new Date()): { opensAt: Date; closesAt: Date } {
  const current = getCurrentVotingWindow(now)
  if (now < current.opensAt) {
    return { opensAt: current.opensAt, closesAt: current.closesAt }
  }

  if (current.isOpen) {
    return { opensAt: current.opensAt, closesAt: current.closesAt }
  }

  const nextSaturday = new Date(current.opensAt)
  nextSaturday.setUTCDate(current.opensAt.getUTCDate() + 7)
  const opensAt = withUtcTime(nextSaturday, 21, 0)
  const closesAt = withUtcTime(new Date(opensAt), 21, 0)
  closesAt.setUTCDate(opensAt.getUTCDate() + 1)

  return { opensAt, closesAt }
}

export function canSubmitNow(now = new Date()): { allowed: boolean; nextOpen: Date } {
  const window = getCurrentVotingWindow(now)
  if (window.isOpen) {
    return { allowed: false, nextOpen: window.closesAt }
  }

  return { allowed: true, nextOpen: window.opensAt }
}

export function getNextLeaderboardUpdate(now = new Date()): Date {
  const day = now.getUTCDay()
  const monday = new Date(now)
  monday.setUTCDate(now.getUTCDate() - ((day + 6) % 7))

  const thisMondayUpdate = withUtcTime(monday, 6, 0)
  if (now < thisMondayUpdate) {
    return thisMondayUpdate
  }

  const nextMonday = new Date(monday)
  nextMonday.setUTCDate(monday.getUTCDate() + 7)
  return withUtcTime(nextMonday, 6, 0)
}

export function formatUtc(date: Date): string {
  return date.toISOString().replace('T', ' ').replace(':00.000Z', ' UTC')
}
