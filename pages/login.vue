<script setup lang="ts">
const auth = useAuth()
const route = useRoute()

const form = reactive({
  email: '',
  password: ''
})

const state = reactive({
  message: ''
})

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

async function signIn() {
  state.message = ''

  if (!form.email) {
    state.message = 'Email is required.'
    return
  }
  if (!isValidEmail(form.email)) {
    state.message = 'Please enter a valid email address.'
    return
  }
  if (!form.password) {
    state.message = 'Password is required.'
    return
  }

  try {
    await auth.signInWithPassword(form.email, form.password)
    state.message = 'Signed in.'
    const next = route.query.next?.toString()
    await navigateTo(next || '/profile')
  } catch (error) {
    state.message = (error as Error).message
  }
}

async function signOut() {
  await auth.signOut()
  state.message = 'Signed out.'
}
</script>

<template>
  <div class="auth-container">
    <article class="card">
      <h1 style="margin-bottom: 0.5rem">Sign in</h1>
      <p class="muted" style="margin-bottom: 2rem">Welcome back.</p>

      <label>
        Email
        <input v-model="form.email" type="email" placeholder="you@example.com" />
      </label>
      <label>
        Password
        <input v-model="form.password" type="password" placeholder="Your password" />
      </label>

      <button @click="signIn" style="width: 100%; margin-top: 1rem">Sign in</button>

      <div v-if="auth.user.value" style="text-align: center; margin-top: 1rem">
        <button class="secondary" @click="signOut">Sign out</button>
      </div>

      <p v-if="state.message" class="message">{{ state.message }}</p>

      <p class="muted" style="text-align: center; margin-top: 1.5rem">
        New here? <NuxtLink to="/signup">Open Signup</NuxtLink>.
      </p>
    </article>
  </div>
</template>

<style scoped>
.auth-container {
  max-width: 400px;
  margin: 0 auto;
  padding-top: 2rem;
}

.social-buttons {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 2rem;
}

.social-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.8rem;
  border-radius: 8px;
  border: 1px solid var(--line);
  background: #fff;
  color: var(--text);
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.social-btn:hover {
  background-color: #f9f9f9;
}

.social-btn.google {
  color: #3c4043;
}

.social-btn.apple {
  background: #000;
  color: #fff;
  border-color: #000;
}

.social-btn.apple:hover {
  background: #333;
}

.divider {
  display: flex;
  align-items: center;
  text-align: center;
  margin-bottom: 2rem;
  color: var(--muted);
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  border-bottom: 1px solid var(--line);
}

.divider span {
  padding: 0 1rem;
  font-size: 0.9rem;
}

.message {
  color: var(--accent);
  margin-top: 1rem;
  padding: 0.75rem;
  background: #f0efe8;
  border-radius: 8px;
  text-align: center;
}
</style>
