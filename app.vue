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

const showUserMenu = ref(false)

async function handleSignOut() {
  await auth.signOut()
  showUserMenu.value = false
  await navigateTo('/')
}
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
          <div class="user-menu">
            <button class="user-menu-trigger" @click="showUserMenu = !showUserMenu">
              {{ displayName }}
            </button>
            <div v-if="showUserMenu" class="user-menu-dropdown">
              <button class="user-menu-item" @click="handleSignOut">Sign out</button>
            </div>
          </div>
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
