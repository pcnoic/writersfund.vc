<script setup lang="ts">
const auth = useAuth()
await useAsyncData('bootstrap-auth', () => auth.refresh())

const { data: votingSchedule } = await useAsyncData('voting-schedule', () =>
  $fetch<{ isOpen: boolean; status: string }>('/api/voting/schedule')
)

const isAuthed = computed(() => Boolean(auth.user.value?.id))
const displayName = computed(() => {
  const metadata = auth.user.value?.user_metadata as Record<string, string> | undefined
  return metadata?.pen_name || metadata?.name || auth.user.value?.email || 'Account'
})
</script>

<template>
  <div class="shell">
    <header class="topbar">
      <NuxtLink to="/" class="brand">Writers Fund</NuxtLink>
      <nav class="nav">
        <template v-if="isAuthed">
          <NuxtLink to="/">Home</NuxtLink>
          <NuxtLink to="/tournament">Tournament</NuxtLink>
          <NuxtLink to="/leaderboard">Leaderboard</NuxtLink>
          <NuxtLink v-if="votingSchedule?.isOpen" to="/voting">Vote</NuxtLink>
          <span v-else class="muted">Vote (closed)</span>
          <NuxtLink to="/submission">Submit</NuxtLink>
          <NuxtLink to="/profile">Profile</NuxtLink>
          <NuxtLink to="/apply">Apply</NuxtLink>
          <span class="muted">{{ displayName }}</span>
          <button
            class="secondary"
            @click="
              async () => {
                await auth.signOut()
                await navigateTo('/')
              }
            "
          >
            Sign out
          </button>
        </template>
        <template v-else>
          <NuxtLink to="/">Home</NuxtLink>
          <NuxtLink to="/signup">Signup</NuxtLink>
          <NuxtLink to="/login">Sign in</NuxtLink>
        </template>
      </nav>
    </header>
    <main class="content">
      <NuxtPage />
    </main>
    <footer class="footer">
      <NuxtLink to="/terms">Terms</NuxtLink> · <NuxtLink to="/privacy">Privacy</NuxtLink>
    </footer>
  </div>
</template>
