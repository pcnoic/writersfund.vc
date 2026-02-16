import { getCurrentVotingWindow, formatUtc } from '~/server/utils/schedule'

export default defineEventHandler(() => {
  const window = getCurrentVotingWindow()
  return {
    window: `${formatUtc(window.opensAt)} to ${formatUtc(window.closesAt)}`,
    status: window.isOpen ? 'Open for voting' : 'Closed',
    isOpen: window.isOpen
  }
})
