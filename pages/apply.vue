<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const auth = useAuth()

const form = reactive({
  goals: '',
  projectSummary: '',
  writingSample: ''
})

const state = reactive({
  message: '',
  loading: false
})

async function submit() {
  state.loading = true
  state.message = ''
  try {
    await $fetch('/api/applications', {
      method: 'POST',
      body: {
        goals: form.goals,
        projectSummary: form.projectSummary,
        writingSample: form.writingSample
      }
    })
    state.message = 'Application submitted. We will review and follow up.'
    form.goals = ''
    form.projectSummary = ''
    form.writingSample = ''
  } catch (error) {
    state.message = (error as Error).message
  } finally {
    state.loading = false
  }
}
</script>

<template>
  <section class="grid">
    <article class="card prose">
      <h1>Apply to Writers Fund</h1>
      <p>Applications are open year-round.</p>
      <p class="muted">Writers Fund does not publish or own your work. You keep full rights.</p>
    </article>

    <article class="card">
      <h2>Application form</h2>
      <label>
        What do you want to build with the Writers Fund?
        <textarea v-model="form.goals" rows="4" />
      </label>

      <label>
        Project summary
        <textarea v-model="form.projectSummary" rows="6" />
      </label>

      <label>
        Writing sample
        <textarea v-model="form.writingSample" rows="8" />
      </label>

      <button :disabled="state.loading" @click="submit">Submit application</button>
      <p class="muted">{{ state.message }}</p>
    </article>
  </section>
</template>
