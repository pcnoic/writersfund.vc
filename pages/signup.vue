<script setup lang="ts">
const auth = useAuth()

const form = reactive({
  name: '',
  penName: '',
  email: '',
  password: '',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  bio: ''
})

const agreements = reactive({
  ownership: false,
  tournament: false
})

const state = reactive({
  message: ''
})

const canSubmit = computed(() => {
  return (
    form.name &&
    form.email &&
    form.password &&
    form.timezone &&
    agreements.ownership &&
    agreements.tournament
  )
})

async function submit() {
  state.message = ''
  try {
    const result = await auth.signUp({
      name: form.name,
      penName: form.penName || form.name,
      email: form.email,
      password: form.password,
      timezone: form.timezone,
      bio: form.bio
    })

    if (result.session) {
      state.message = 'Signup complete. Redirecting to your profile.'
      await navigateTo('/profile')
      return
    }

    state.message = 'Signup submitted. Check your email to confirm and then sign in.'
  } catch (error) {
    state.message = (error as Error).message
  }
}
</script>

<template>
  <section class="grid">
    <article class="card prose">
      <h1>Open Signup</h1>
      <p class="muted">Tournament access is open. No credentials required.</p>

      <h2>What to expect</h2>
      <ul>
        <li>Four 12-week tournaments per year.</li>
        <li>Weekly submissions close Saturday 9:00 PM UTC.</li>
        <li>Voting runs Saturday 9:00 PM UTC to Sunday 9:00 PM UTC.</li>
        <li>Leaderboard updates Monday at 6:00 AM UTC.</li>
      </ul>

      <h2>What you get</h2>
      <ul>
        <li>Peer feedback on every matchup.</li>
        <li>Objective ELO score tracking across the batch.</li>
        <li>Eligibility for Writers Fund investment review.</li>
      </ul>

      <h2>What you risk</h2>
      <ul>
        <li>Your ELO score is visible to other writers in the cohort.</li>
        <li>Missing weekly submissions will be visible.</li>
        <li>Feedback is required to vote, so you must engage.</li>
      </ul>
    </article>

    <article class="card">
      <h2>Create your profile</h2>
      <label>
        Name
        <input v-model="form.name" placeholder="Legal name" />
      </label>
      <label>
        Pen name
        <input v-model="form.penName" placeholder="Public pen name" />
      </label>
      <label>
        Email
        <input v-model="form.email" type="email" placeholder="you@example.com" />
      </label>
      <label>
        Password
        <input v-model="form.password" type="password" placeholder="Choose a password" />
      </label>
      <label>
        Timezone
        <input v-model="form.timezone" placeholder="UTC" />
      </label>
      <label>
        Bio (max 280 characters)
        <textarea v-model="form.bio" rows="3" maxlength="280" />
      </label>

      <div class="card" style="margin-top: 1rem">
        <p><strong>Required acknowledgements</strong></p>
        <p class="muted">
          WritersFund does not own, publish, sell, train on, or reuse submissions. Submissions remain fully owned
          by the author. Only voting metadata is WritersFund property.
        </p>
        <label>
          <input v-model="agreements.ownership" type="checkbox" />
          I agree to the ownership and metadata terms above.
        </label>
        <label>
          <input v-model="agreements.tournament" type="checkbox" />
          I agree to participate in the tournament rules and weekly cadence.
        </label>
      </div>

      <button :disabled="!canSubmit || auth.pending" @click="submit">Create account</button>

      <p class="muted">{{ state.message }}</p>
      <p class="muted">Already have an account? <NuxtLink to="/login">Sign in</NuxtLink>.</p>
    </article>
  </section>
</template>
