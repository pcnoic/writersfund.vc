<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const leaderboard = ref<Array<{
  writerId: string
  writerName: string
  rating: number
  wins: number
  losses: number
  matches: number
  votesReceived: number
}>>([])

const meta = ref({ updatedAt: '', nextUpdateAt: '' })

async function loadLeaderboard() {
  const data = await $fetch<{ entries: typeof leaderboard.value; updatedAt: string; nextUpdateAt: string }>(
    '/api/leaderboard'
  )
  leaderboard.value = data.entries
  meta.value = { updatedAt: data.updatedAt, nextUpdateAt: data.nextUpdateAt }
}

function winRate(entry: (typeof leaderboard.value)[number]): string {
  if (!entry.matches) return '0%'
  return `${Math.round((entry.wins / entry.matches) * 100)}%`
}

onMounted(loadLeaderboard)
</script>

<template>
  <section class="card">
    <h1>Leaderboard</h1>
    <p class="muted">Scores are cumulative for the current 12-week batch.</p>
    <p class="muted">Last computed: {{ meta.updatedAt }}</p>
    <p class="muted">Next scheduled update: {{ meta.nextUpdateAt }}</p>

    <div class="wide" style="padding: 0">
      <table>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Name</th>
            <th>ELO</th>
            <th>Matches</th>
            <th>Win rate vs AI</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(entry, index) in leaderboard" :key="entry.writerId">
            <td>{{ index + 1 }}</td>
            <td>{{ entry.writerName }}</td>
            <td>{{ entry.rating }}</td>
            <td>{{ entry.matches }}</td>
            <td>{{ winRate(entry) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
