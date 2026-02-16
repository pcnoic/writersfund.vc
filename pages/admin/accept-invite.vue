<script setup lang="ts">
const route = useRoute()
const auth = useAuth()

const token = computed(() => route.query.token as string || '')
const status = ref<'loading' | 'success' | 'error'>('loading')
const message = ref('')

async function acceptInvite() {
  if (!token.value) {
    status.value = 'error'
    message.value = 'No invite token provided.'
    return
  }

  if (!auth.user.value) {
    status.value = 'error'
    message.value = 'Please sign in first, then return to this page.'
    return
  }

  try {
    await $fetch('/api/admin/invites/accept', {
      method: 'POST',
      body: { token: token.value }
    })
    status.value = 'success'
    message.value = 'You are now an admin! Redirecting to dashboard...'
    setTimeout(() => {
      navigateTo('/admin')
    }, 2000)
  } catch (e) {
    status.value = 'error'
    message.value = (e as Error).message
  }
}

onMounted(acceptInvite)
</script>

<template>
  <div class="accept-invite-page">
    <div class="card accept-card">
      <template v-if="status === 'loading'">
        <h1>Accepting Invite...</h1>
        <p class="muted">Please wait while we process your admin invite.</p>
      </template>

      <template v-else-if="status === 'success'">
        <h1>Welcome, Admin!</h1>
        <p class="success-message">{{ message }}</p>
      </template>

      <template v-else>
        <h1>Invite Error</h1>
        <p class="error-message">{{ message }}</p>
        <div class="actions">
          <NuxtLink v-if="!auth.user.value" to="/login?next=/admin/accept-invite">
            <button>Sign In</button>
          </NuxtLink>
          <NuxtLink to="/">
            <button class="secondary">Go Home</button>
          </NuxtLink>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.accept-invite-page {
  min-height: 60vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.accept-card {
  max-width: 450px;
  text-align: center;
  padding: 3rem 2rem;
}

.accept-card h1 {
  margin-bottom: 1rem;
}

.success-message {
  color: #1e8e3e;
  font-size: 1.1rem;
}

.error-message {
  color: #c5221f;
  font-size: 1.1rem;
  margin-bottom: 1.5rem;
}

.actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-top: 1rem;
}
</style>
