<script setup lang="ts">
definePageMeta({ middleware: 'admin' })

interface AdminUser {
  id: string
  user_id: string
  email: string
  role: string
  created_at: string
}

const admins = ref<AdminUser[]>([])
const loading = ref(true)
const error = ref('')

async function loadAdmins() {
  loading.value = true
  error.value = ''
  try {
    const data = await $fetch<{ admins: AdminUser[] }>('/api/admin/users')
    admins.value = data.admins
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    loading.value = false
  }
}

onMounted(loadAdmins)
</script>

<template>
  <div class="admin-page">
    <header class="admin-header">
      <div>
        <NuxtLink to="/admin" class="back-link">← Back to Dashboard</NuxtLink>
        <h1>Admin Users</h1>
      </div>
    </header>

    <section class="card">
      <div v-if="loading" class="loading">Loading admins...</div>
      <div v-else-if="error" class="error">{{ error }}</div>
      <div v-else-if="admins.length === 0" class="empty">No admin users yet.</div>
      
      <table v-else>
        <thead>
          <tr>
            <th>Email</th>
            <th>Role</th>
            <th>Added</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="admin in admins" :key="admin.id">
            <td>{{ admin.email }}</td>
            <td>
              <span class="role-badge" :class="admin.role">
                {{ admin.role.replace('_', ' ') }}
              </span>
            </td>
            <td>{{ new Date(admin.created_at).toLocaleDateString() }}</td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>

<style scoped>
.admin-page {
  max-width: 900px;
  margin: 0 auto;
  padding: 2rem 1.5rem;
}

.admin-header {
  margin-bottom: 2rem;
}

.back-link {
  font-size: 0.9rem;
  color: var(--muted);
  text-decoration: none;
}

.back-link:hover {
  color: var(--accent);
}

.admin-header h1 {
  margin: 0.5rem 0 0;
}

.loading, .error, .empty {
  padding: 2rem;
  text-align: center;
  color: var(--muted);
}

.error {
  color: #c00;
}

.role-badge {
  display: inline-block;
  padding: 0.2rem 0.6rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
  text-transform: capitalize;
}

.role-badge.super_admin {
  background: #fef3cd;
  color: #856404;
}

.role-badge.admin {
  background: #e8f4fd;
  color: #1a73e8;
}
</style>
