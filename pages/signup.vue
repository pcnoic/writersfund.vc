<script setup lang="ts">
const auth = useAuth()
const { getToken } = useRecaptcha()

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

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

function validate() {
  if (!form.name) return 'Name is required.'
  if (!form.email) return 'Email is required.'
  if (!isValidEmail(form.email)) return 'Please enter a valid email address.'
  if (!form.password) return 'Password is required.'
  if (form.password.length < 6) return 'Password must be at least 6 characters.'
  if (!agreements.ownership) return 'You must agree to the ownership terms.'
  if (!agreements.tournament) return 'You must agree to the tournament rules.'
  return ''
}

async function submit() {
  state.message = ''

  const error = validate()
  if (error) {
    state.message = error
    return
  }

  try {
    const recaptchaToken = await getToken('signup')
    if (!recaptchaToken) {
      state.message = 'reCAPTCHA verification failed. Please try again.'
      return
    }

    const result = await auth.signUp({
      name: form.name,
      penName: form.penName || form.name,
      email: form.email,
      password: form.password,
      timezone: form.timezone,
      bio: form.bio,
      recaptchaToken
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
  <div class="auth-container">
    <article class="card">
      <h1 style="margin-bottom: 0.5rem">Create your profile</h1>
      <p class="muted" style="margin-bottom: 2rem">Join the weekly writing tournament.</p>

      <label>
        Name
        <input v-model="form.name" placeholder="Legal name" />
      </label>
      <label>
        Pen name (Optional)
        <input v-model="form.penName" placeholder="Public pen name (defaults to Name)" />
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
        <textarea v-model="form.bio" rows="3" maxlength="280" placeholder="Tell us a bit about yourself..." />
      </label>

      <div class="card" style="margin-top: 1rem; background: var(--bg); border: none;">
        <p><strong>Required acknowledgements</strong></p>
        <p class="muted" style="font-size: 0.9rem">
          WritersFund does not own, publish, sell, train on, or reuse submissions. Submissions remain fully owned
          by the author. Only voting metadata is WritersFund property.
        </p>
        <label class="checkbox-label">
          <input v-model="agreements.ownership" type="checkbox" />
          <span>I agree to the ownership and metadata terms above.</span>
        </label>
        <label class="checkbox-label">
          <input v-model="agreements.tournament" type="checkbox" />
          <span>I agree to participate in the tournament rules and weekly cadence.</span>
        </label>
      </div>

      <button @click="submit" style="width: 100%; margin-top: 1.5rem">Create account</button>

      <p v-if="state.message" class="message">{{ state.message }}</p>
      <p class="muted" style="text-align: center; margin-top: 1.5rem">
        Already have an account? <NuxtLink to="/login">Sign in</NuxtLink>.
      </p>
    </article>

    <div class="info-section">
      <div class="info-block">
        <h3>What to expect</h3>
        <ul>
          <li>Four 12-week tournaments per year.</li>
          <li>Weekly submissions close Saturday 9:00 PM UTC.</li>
          <li>Voting runs Saturday 9:00 PM UTC to Sunday 9:00 PM UTC.</li>
          <li>Leaderboard updates Monday at 6:00 AM UTC.</li>
        </ul>
      </div>

      <div class="info-block">
        <h3>What you get</h3>
        <ul>
          <li>Peer feedback on every matchup.</li>
          <li>Objective ELO score tracking across the batch.</li>
          <li>Eligibility for Writers Fund investment review.</li>
        </ul>
      </div>

      <div class="info-block">
        <h3>What you risk</h3>
        <ul>
          <li>Your ELO score is visible to other writers in the cohort.</li>
          <li>Missing weekly submissions will be visible.</li>
          <li>Feedback is required to vote, so you must engage.</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-container {
  max-width: 500px;
  margin: 0 auto;
}

.checkbox-label {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  cursor: pointer;
}

.checkbox-label input {
  margin-top: 0.25rem;
  width: auto;
}

.message {
  color: var(--accent);
  margin-top: 1rem;
  padding: 0.75rem;
  background: #f0efe8;
  border-radius: 8px;
  text-align: center;
}

.info-section {
  margin-top: 3rem;
  border-top: 1px solid var(--line);
  padding-top: 2rem;
  color: var(--muted);
}

.info-block {
  margin-bottom: 1.5rem;
}

.info-block h3 {
  font-size: 1.1rem;
  color: var(--text);
  margin-bottom: 0.5rem;
}

.info-block ul {
  padding-left: 1.25rem;
  margin: 0;
}

.info-block li {
  margin-bottom: 0.25rem;
}
</style>
