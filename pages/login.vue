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

async function signIn() {
  state.message = ''
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
  <section class="card prose">
    <h1>Sign in</h1>
    <p>Use your email and password to access the tournament.</p>
    <p class="muted">New here? Start at <NuxtLink to="/signup">Open Signup</NuxtLink>.</p>

    <label>
      Email
      <input v-model="form.email" type="email" placeholder="you@example.com" />
    </label>
    <label>
      Password
      <input v-model="form.password" type="password" placeholder="Your password" />
    </label>
    <button :disabled="auth.pending" @click="signIn">Sign in</button>

    <button v-if="auth.user" class="secondary" style="margin-left: 0.5rem" @click="signOut">Sign out</button>

    <p class="muted">{{ state.message }}</p>
  </section>
</template>
