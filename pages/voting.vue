<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

import type { VoteChoice } from '~/types/domain'

interface PassageView {
  id: string
  kind: 'writer' | 'ai'
  title: string
  content: string
  genre: string
}

interface BallotResponse {
  ballot: {
    id: string
    matchupId: string
  } | null
  passages?: {
    A: PassageView
    B: PassageView
  }
}

const auth = useAuth()
const ballot = ref<BallotResponse['ballot']>(null)
const passages = ref<BallotResponse['passages']>()
const feedback = ref('')
const voteState = reactive({ loading: false, message: '' })

const schedule = ref({ window: '', status: '', isOpen: false })

const leftRef = ref<HTMLElement | null>(null)
const rightRef = ref<HTMLElement | null>(null)
let syncing = false

function syncScroll(source: 'left' | 'right') {
  if (syncing) return
  syncing = true
  const left = leftRef.value
  const right = rightRef.value
  if (!left || !right) {
    syncing = false
    return
  }

  if (source === 'left') {
    const ratio = left.scrollTop / (left.scrollHeight - left.clientHeight || 1)
    right.scrollTop = ratio * (right.scrollHeight - right.clientHeight)
  } else {
    const ratio = right.scrollTop / (right.scrollHeight - right.clientHeight || 1)
    left.scrollTop = ratio * (left.scrollHeight - left.clientHeight)
  }

  setTimeout(() => {
    syncing = false
  }, 0)
}

async function loadBallot() {
  if (!auth.user.value) {
    ballot.value = null
    passages.value = undefined
    return
  }

  const data = await $fetch<BallotResponse>('/api/ballots/next')
  ballot.value = data.ballot
  passages.value = data.passages
}

async function vote(choice: VoteChoice) {
  if (!ballot.value) return
  voteState.loading = true
  voteState.message = ''

  try {
    await $fetch('/api/votes', {
      method: 'POST',
      body: {
        ballotId: ballot.value.id,
        choice,
        feedback: feedback.value
      }
    })
    voteState.message = 'Vote recorded. Feedback submitted.'
    feedback.value = ''
    await loadBallot()
  } catch (error) {
    voteState.message = (error as Error).message
  } finally {
    voteState.loading = false
  }
}

async function loadSchedule() {
  const data = await $fetch<{ window: string; status: string; isOpen: boolean }>('/api/voting/schedule')
  schedule.value = data
}

onMounted(async () => {
  await auth.refresh()
  await Promise.all([loadBallot(), loadSchedule()])
})
</script>

<template>
  <section class="grid">
    <article class="card">
      <h1>Weekly Voting</h1>
      <p class="muted">Voting window: {{ schedule.window }}</p>
      <p class="muted">Status: {{ schedule.status }}</p>

      <p v-if="!auth.user">
        Please <NuxtLink to="/login">sign in</NuxtLink> to vote.
      </p>
      <p v-else class="muted">
        Signed in as {{ auth.user.user_metadata?.pen_name || auth.user.user_metadata?.name || auth.user.email }}.
      </p>

      <label>
        What worked better?
        <textarea v-model="feedback" rows="5" placeholder="Explain your decision (min 50 characters)." :disabled="!auth.user" />
      </label>
      <ul class="muted">
        <li>What worked better?</li>
        <li>What felt weaker?</li>
        <li>Why did you choose this?</li>
      </ul>
      <p class="muted">Votes without feedback do not count.</p>
    </article>

    <article class="card">
      <h2>Blind Ballot</h2>
      <p v-if="!auth.user">Sign in to get your next ballot.</p>
      <p v-else-if="!schedule.isOpen">Voting is closed. Come back during the window.</p>
      <p v-else-if="!ballot">No available matchup right now.</p>

      <template v-else>
        <div class="grid" style="grid-template-columns: repeat(auto-fit, minmax(260px, 1fr))">
          <div>
            <span class="badge">Option A</span>
            <div
              ref="leftRef"
              class="prose"
              style="max-height: 360px; overflow-y: auto; padding-right: 0.5rem"
              @scroll="syncScroll('left')"
            >
              <h3>{{ passages?.A.title }}</h3>
              <p class="muted">{{ passages?.A.genre }}</p>
              <p>{{ passages?.A.content }}</p>
            </div>
            <button :disabled="voteState.loading || feedback.trim().length < 50" @click="vote('A')">Vote A</button>
          </div>
          <div>
            <span class="badge">Option B</span>
            <div
              ref="rightRef"
              class="prose"
              style="max-height: 360px; overflow-y: auto; padding-right: 0.5rem"
              @scroll="syncScroll('right')"
            >
              <h3>{{ passages?.B.title }}</h3>
              <p class="muted">{{ passages?.B.genre }}</p>
              <p>{{ passages?.B.content }}</p>
            </div>
            <button :disabled="voteState.loading || feedback.trim().length < 50" @click="vote('B')">Vote B</button>
          </div>
        </div>
      </template>
      <p class="muted">{{ voteState.message }}</p>
    </article>
  </section>
</template>
