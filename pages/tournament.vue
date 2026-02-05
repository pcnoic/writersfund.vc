<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const schedule = ref({ window: '', status: '', isOpen: false })

async function loadSchedule() {
  schedule.value = await $fetch('/api/voting/schedule')
}

onMounted(loadSchedule)
</script>

<template>
  <section class="card prose">
    <h1>Writers vs AI Tournament</h1>
    <p>
      The tournament runs four times a year, each batch lasting 12 weeks.
      Submissions are collected weekly, AI mirror stories are generated from your narrative,
      and blind voting determines the ELO score updates.
    </p>
    <p class="muted">Voting window: {{ schedule.window }} ({{ schedule.status }})</p>
    <p class="muted">Scores update Monday at 6:00 AM UTC.</p>
    <div class="actions">
      <NuxtLink to="/submission"><button>Submit Writing</button></NuxtLink>
      <NuxtLink to="/voting"><button class="secondary">Vote</button></NuxtLink>
      <NuxtLink to="/leaderboard"><button class="secondary">Leaderboard</button></NuxtLink>
    </div>
  </section>
</template>
