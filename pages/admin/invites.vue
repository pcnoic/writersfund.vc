<script setup lang="ts">
definePageMeta({ middleware: 'admin' })

interface Invite {
  id: string
  email: string
  token: string
  expires_at: string
  used_at: string | null
  created_at: string
}

const invites = ref<Invite[]>([])
const loading = ref(true)
const error = ref('')
const newEmail = ref('')
const creating = ref(false)
const createMessage = ref('')

async function loadInvites() {
  loading.value = true
  error.value = ''
  try {
    const data = await $fetch<{ invites: Invite[] }>('/api/admin/invites')
    invites.value = data.invites
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    loading.value = false
  }
}

async function createInvite() {
  if (!newEmail.value) return
  creating.value = true
  createMessage.value = ''
  try {
    const data = await $fetch<{ invite: Invite; inviteUrl: string }>('/api/admin/invites', {
      method: 'POST',
      body: { email: newEmail.value }
    })
    createMessage.value = `Invite created! URL: ${window.location.origin}${data.inviteUrl}`
    newEmail.value = ''
    await loadInvites()
  } catch (e) {
    createMessage.value = (e as Error).message
  } finally {
    creating.value = false
  }
}

function isExpired(invite: Invite): boolean {
  return new Date(invite.expires_at) < new Date()
}

function getStatus(invite: Invite): string {
  if (invite.used_at) return 'Used'
  if (isExpired(invite)) return 'Expired'
  return 'Pending'
}

onMounted(loadInvites)
</script>

<template>
  <div class="admin-page">
    <header class="admin-header">
      <div>
        <NuxtLink to="/admin" class="back-link">← Back to Dashboard</NuxtLink>
        <h1>Admin Invites</h1>
      </div>
    </header>

    <section class="card create-section">
      <h2>Create New Invite</h2>
      <div class="create-form">
        <input 
          v-model="newEmail" 
          type="email" 
          placeholder="Email address" 
          :disabled="creating"
        />
        <button :disabled="creating || !newEmail" @click="createInvite">
          {{ creating ? 'Creating...' : 'Create Invite' }}
        </button>
      </div>
      <p v-if="createMessage" class="message">{{ createMessage }}</p>
    </section>

    <section class="card">
      <h2>Existing Invites</h2>
      
      <div v-if="loading" class="loading">Loading invites...</div>
      <div v-else-if="error" class="error">{{ error }}</div>
      <div v-else-if="invites.length === 0" class="empty">No invites yet.</div>
      
      <table v-else>
        <thead>
          <tr>
            <th>Email</th>
            <th>Status</th>
            <th>Created</th>
            <th>Expires</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="invite in invites" :key="invite.id">
            <td>{{ invite.email }}</td>
            <td>
              <span 
                class="status-badge" 
                :class="{
                  'status-used': invite.used_at,
                  'status-expired': isExpired(invite) && !invite.used_at,
                  'status-pending': !invite.used_at && !isExpired(invite)
                }"
              >
                {{ getStatus(invite) }}
              </span>
            </td>
            <td>{{ new Date(invite.created_at).toLocaleDateString() }}</td>
            <td>{{ new Date(invite.expires_at).toLocaleDateString() }}</td>
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

.create-section {
  margin-bottom: 1.5rem;
}

.create-form {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
}

.create-form input {
  flex: 1;
  margin: 0;
}

.create-form button {
  white-space: nowrap;
}

.message {
  margin-top: 1rem;
  padding: 0.75rem;
  background: #f0efe8;
  border-radius: 8px;
  word-break: break-all;
}

.loading, .error, .empty {
  padding: 2rem;
  text-align: center;
  color: var(--muted);
}

.error {
  color: #c00;
}

.status-badge {
  display: inline-block;
  padding: 0.2rem 0.6rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
}

.status-pending {
  background: #e8f4fd;
  color: #1a73e8;
}

.status-used {
  background: #e6f4ea;
  color: #1e8e3e;
}

.status-expired {
  background: #fce8e6;
  color: #c5221f;
}
</style>
