<script setup lang="ts">
definePageMeta({ middleware: 'admin' })

interface Stats {
  overview: {
    totalUsers: number
    totalSubmissions: number
    totalVotes: number
    totalMatchups: number
  }
  statusBreakdown: Record<string, number>
  genreBreakdown: Record<string, number>
  trends: {
    submissionsByDay: Record<string, number>
    signupsByDay: Record<string, number>
  }
  recentSubmissions: Array<{
    id: string
    title: string
    genre: string
    status: string
    word_count: number
    created_at: string
  }>
  recentUsers: Array<{
    id: string
    name: string
    pen_name: string
    email: string
    created_at: string
  }>
}

const stats = ref<Stats | null>(null)
const loading = ref(true)
const error = ref('')

async function loadStats() {
  loading.value = true
  error.value = ''
  try {
    stats.value = await $fetch<Stats>('/api/admin/stats')
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    loading.value = false
  }
}

onMounted(loadStats)
</script>

<template>
  <div class="admin-dashboard">
    <header class="admin-header">
      <h1>Admin Dashboard</h1>
      <div class="admin-actions">
        <NuxtLink to="/admin/invites">
          <button class="secondary">Manage Invites</button>
        </NuxtLink>
        <NuxtLink to="/admin/users">
          <button class="secondary">Admin Users</button>
        </NuxtLink>
      </div>
    </header>

    <div v-if="loading" class="loading">Loading stats...</div>
    <div v-else-if="error" class="error">{{ error }}</div>

    <template v-else-if="stats">
      <section class="stats-grid">
        <div class="stat-card">
          <span class="stat-value">{{ stats.overview.totalUsers }}</span>
          <span class="stat-label">Total Users</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">{{ stats.overview.totalSubmissions }}</span>
          <span class="stat-label">Submissions</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">{{ stats.overview.totalVotes }}</span>
          <span class="stat-label">Votes Cast</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">{{ stats.overview.totalMatchups }}</span>
          <span class="stat-label">Matchups</span>
        </div>
      </section>

      <div class="dashboard-grid">
        <section class="card">
          <h2>Submissions by Status</h2>
          <div class="breakdown-list">
            <div v-for="(count, status) in stats.statusBreakdown" :key="status" class="breakdown-item">
              <span class="breakdown-label">{{ status }}</span>
              <span class="breakdown-value">{{ count }}</span>
            </div>
          </div>
        </section>

        <section class="card">
          <h2>Submissions by Genre</h2>
          <div class="breakdown-list">
            <div v-for="(count, genre) in stats.genreBreakdown" :key="genre" class="breakdown-item">
              <span class="breakdown-label">{{ genre }}</span>
              <span class="breakdown-value">{{ count }}</span>
            </div>
          </div>
        </section>
      </div>

      <div class="dashboard-grid">
        <section class="card">
          <h2>Submissions (Last 7 Days)</h2>
          <div class="trend-list">
            <div v-for="(count, day) in stats.trends.submissionsByDay" :key="day" class="trend-item">
              <span class="trend-day">{{ day }}</span>
              <span class="trend-bar" :style="{ width: `${Math.min(count * 20, 100)}%` }"></span>
              <span class="trend-count">{{ count }}</span>
            </div>
          </div>
        </section>

        <section class="card">
          <h2>Signups (Last 7 Days)</h2>
          <div class="trend-list">
            <div v-for="(count, day) in stats.trends.signupsByDay" :key="day" class="trend-item">
              <span class="trend-day">{{ day }}</span>
              <span class="trend-bar" :style="{ width: `${Math.min(count * 20, 100)}%` }"></span>
              <span class="trend-count">{{ count }}</span>
            </div>
          </div>
        </section>
      </div>

      <section class="card">
        <h2>Recent Submissions</h2>
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Genre</th>
              <th>Status</th>
              <th>Words</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="sub in stats.recentSubmissions" :key="sub.id">
              <td>{{ sub.title }}</td>
              <td>{{ sub.genre }}</td>
              <td><span class="badge">{{ sub.status }}</span></td>
              <td>{{ sub.word_count }}</td>
              <td>{{ new Date(sub.created_at).toLocaleDateString() }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="card">
        <h2>Recent Users</h2>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Pen Name</th>
              <th>Email</th>
              <th>Joined</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in stats.recentUsers" :key="user.id">
              <td>{{ user.name }}</td>
              <td>{{ user.pen_name }}</td>
              <td>{{ user.email }}</td>
              <td>{{ new Date(user.created_at).toLocaleDateString() }}</td>
            </tr>
          </tbody>
        </table>
      </section>
    </template>
  </div>
</template>

<style scoped>
.admin-dashboard {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 1.5rem;
}

.admin-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.admin-header h1 {
  margin: 0;
}

.admin-actions {
  display: flex;
  gap: 0.75rem;
}

.loading, .error {
  text-align: center;
  padding: 3rem;
  color: var(--muted);
}

.error {
  color: #c00;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 1.5rem;
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 2.5rem;
  font-weight: 700;
  font-family: 'Literata', serif;
  color: var(--accent);
}

.stat-label {
  font-size: 0.9rem;
  color: var(--muted);
}

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.breakdown-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.breakdown-item {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--line);
}

.breakdown-label {
  text-transform: capitalize;
}

.breakdown-value {
  font-weight: 600;
}

.trend-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.trend-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.trend-day {
  width: 90px;
  font-size: 0.85rem;
  color: var(--muted);
}

.trend-bar {
  height: 8px;
  background: var(--accent);
  border-radius: 4px;
  min-width: 4px;
}

.trend-count {
  font-weight: 600;
  min-width: 30px;
}

@media (max-width: 900px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .dashboard-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 600px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>
