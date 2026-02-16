<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const auth = useAuth()
const dataState = reactive({
  loading: false,
  error: ''
})

const profile = ref<{
  user: { id: string; name: string; penName: string; email: string; timezone: string; bio: string }
  competitive: { rank: number | null; elo: number; week: number; totalWeeks: number }
  stats: {
    submissions: number
    winRate: number
    averagePeerRating: number
    feedbackReceived: number
    votesCast: number
  }
  timeline: Array<{ week: number; status: string; delta: string }>
  passages: Array<{ id: string; title: string; created_at: string }>
  feedback: string[]
} | null>(null)

async function loadProfile() {
  if (!auth.user.value) {
    profile.value = null
    return
  }
  dataState.loading = true
  dataState.error = ''
  try {
    profile.value = await $fetch('/api/profile')
  } catch (error) {
    dataState.error = (error as Error).message
  } finally {
    dataState.loading = false
  }
}

onMounted(async () => {
  await auth.refresh()
  await loadProfile()
})
</script>

<template>
  <section class="grid">
    <article class="card">
      <h1>Profile</h1>
      <template v-if="profile">
        <p><strong>{{ profile.user.penName || profile.user.name }}</strong></p>
        <p class="muted">{{ profile.user.email }}</p>
        <p class="muted">Timezone: {{ profile.user.timezone }}</p>
        <p class="muted">{{ profile.user.bio }}</p>
      </template>
      <p class="muted">{{ dataState.error }}</p>
    </article>

    <article class="card" v-if="profile">
      <h2>Competitive snapshot</h2>
      <p>Rank: {{ profile.competitive.rank || '—' }}</p>
      <p>ELO: {{ profile.competitive.elo }}</p>
      <p>Batch progress: Week {{ profile.competitive.week }} / {{ profile.competitive.totalWeeks }}</p>
      <div style="margin-top: 0.5rem; background: #f0efe8; border-radius: 999px; height: 10px; overflow: hidden">
        <div
          :style="{ width: `${(profile.competitive.week / profile.competitive.totalWeeks) * 100}%`, height: '100%', background: 'var(--accent)' }"
        ></div>
      </div>
    </article>

    <article class="card" v-if="profile">
      <h2>Stats</h2>
      <ul>
        <li>Total submissions: {{ profile.stats.submissions }}</li>
        <li>Win rate vs AI: {{ profile.stats.winRate }}%</li>
        <li>Avg peer rating: {{ profile.stats.averagePeerRating }}%</li>
        <li>Feedback received: {{ profile.stats.feedbackReceived }}</li>
        <li>Votes cast: {{ profile.stats.votesCast }}</li>
      </ul>
    </article>
  </section>

  <section class="card" v-if="profile" style="margin-top: 1.5rem">
    <h2>Submission timeline</h2>
    <div class="timeline">
      <div v-for="item in profile.timeline" :key="item.week" class="timeline-item">
        <strong>Week {{ item.week }}</strong>
        <p class="muted">Status: {{ item.status }} · Score delta: {{ item.delta }}</p>
      </div>
    </div>
  </section>

  <section class="card" v-if="profile" style="margin-top: 1.5rem">
    <h2>Recent submissions</h2>
    <ul>
      <li v-for="passage in profile.passages" :key="passage.id">
        {{ passage.title }} <span class="muted">({{ passage.created_at }})</span>
      </li>
    </ul>
  </section>

  <section class="card" v-if="profile" style="margin-top: 1.5rem">
    <h2>Feedback received</h2>
    <p class="muted">Anonymous feedback from peers on your submissions.</p>
    <ul v-if="profile.feedback && profile.feedback.length > 0">
      <li v-for="(fb, index) in profile.feedback" :key="index" class="feedback-item">
        {{ fb }}
      </li>
    </ul>
    <p v-else class="muted">No feedback received yet.</p>
  </section>
</template>
