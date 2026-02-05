<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const auth = useAuth()

const form = reactive({
  title: '',
  genre: 'literary fiction',
  content: ''
})

const state = reactive({
  message: '',
  loading: false,
  correctedPreview: '',
  narrative: '',
  wordCount: 0
})

const acceptFixes = ref(false)
const autoSaveKey = 'writersfund_submission_draft'

const wordCount = computed(() => form.content.trim().split(/\s+/).filter(Boolean).length)

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function diffMarkup(original: string, corrected: string): { originalHtml: string; correctedHtml: string } {
  const oWords = original.split(/\s+/)
  const cWords = corrected.split(/\s+/)
  const length = Math.max(oWords.length, cWords.length)
  const originalHtml: string[] = []
  const correctedHtml: string[] = []

  for (let i = 0; i < length; i += 1) {
    const o = oWords[i] ?? ''
    const c = cWords[i] ?? ''
    if (o !== c) {
      originalHtml.push(`<mark>${escapeHtml(o)}</mark>`)
      correctedHtml.push(`<mark>${escapeHtml(c)}</mark>`)
    } else {
      originalHtml.push(escapeHtml(o))
      correctedHtml.push(escapeHtml(c))
    }
  }

  return {
    originalHtml: originalHtml.join(' '),
    correctedHtml: correctedHtml.join(' ')
  }
}

const diff = computed(() => {
  if (!state.correctedPreview) {
    return { originalHtml: '', correctedHtml: '' }
  }
  return diffMarkup(form.content, state.correctedPreview)
})

function loadDraft() {
  const saved = localStorage.getItem(autoSaveKey)
  if (!saved) return
  try {
    const parsed = JSON.parse(saved)
    form.title = parsed.title || ''
    form.genre = parsed.genre || 'literary fiction'
    form.content = parsed.content || ''
  } catch {
    // ignore
  }
}

function saveDraft() {
  localStorage.setItem(autoSaveKey, JSON.stringify(form))
}

async function runSpellcheck() {
  state.loading = true
  state.message = ''
  state.correctedPreview = ''
  acceptFixes.value = false
  try {
    const data = await $fetch<{ corrected: string; wordCount: number }>('/api/spellcheck', {
      method: 'POST',
      body: { content: form.content }
    })
    state.correctedPreview = data.corrected
    state.wordCount = data.wordCount
    state.message = 'Spellcheck complete. Review and accept fixes before submitting.'
  } catch (error) {
    state.message = (error as Error).message
  } finally {
    state.loading = false
  }
}

async function submit() {
  state.loading = true
  state.message = ''
  state.narrative = ''
  try {
    const data = await $fetch('/api/passages', {
      method: 'POST',
      body: {
        title: form.title,
        genre: form.genre,
        content: state.correctedPreview || form.content
      }
    })

    state.message = 'Submission received. AI mirror story created for the next voting window.'
    state.narrative = data.narrative
    state.wordCount = data.wordCount
    form.title = ''
    form.content = ''
    state.correctedPreview = ''
    acceptFixes.value = false
    localStorage.removeItem(autoSaveKey)
  } catch (error) {
    state.message = (error as Error).message
  } finally {
    state.loading = false
  }
}

onMounted(() => {
  if (process.client) {
    loadDraft()
    setInterval(saveDraft, 5000)
  }
})
</script>

<template>
  <section class="grid">
    <article class="card">
      <h1>Writing Submission</h1>
      <p class="muted">Distraction-free editor. Submission cutoff is Saturday 9:00 PM UTC.</p>
      <p class="muted">Hard cap: 3000 words. Autosave every 5 seconds.</p>

      <label>
        Title
        <input v-model="form.title" placeholder="Story title" />
      </label>
      <label>
        Genre
        <input v-model="form.genre" placeholder="Genre" />
      </label>
      <label>
        Story ({{ wordCount }} words)
        <textarea
          v-model="form.content"
          rows="14"
          class="prose"
          placeholder="Write or paste your story"
        />
      </label>

      <div class="actions">
        <button class="secondary" :disabled="state.loading" @click="runSpellcheck">
          Run spellcheck
        </button>
        <button
          :disabled="state.loading || !state.correctedPreview || !acceptFixes"
          @click="submit"
        >
          Accept fixes & submit
        </button>
      </div>

      <label>
        <input v-model="acceptFixes" type="checkbox" :disabled="!state.correctedPreview" />
        I accept the spelling fixes shown below.
      </label>

      <p class="muted">{{ state.message }}</p>
    </article>

    <article class="card">
      <h2>Submission timeline</h2>
      <div class="timeline">
        <div class="timeline-item">
          <strong>Draft created</strong>
          <p class="muted">Autosaved as you write.</p>
        </div>
        <div class="timeline-item">
          <strong>Spellcheck applied</strong>
          <p class="muted">You must accept fixes to continue.</p>
        </div>
        <div class="timeline-item">
          <strong>AI opponent generated</strong>
          <p class="muted">Narrative summary extracted, mirror story created.</p>
        </div>
        <div class="timeline-item">
          <strong>Submitted</strong>
          <p class="muted">Queued for the next voting window.</p>
        </div>
      </div>
    </article>
  </section>

  <section v-if="state.correctedPreview" class="card" style="margin-top: 1.5rem">
    <h2>Spellcheck preview</h2>
    <p class="muted">Review changes. Only spelling corrections are applied.</p>
    <div class="grid" style="grid-template-columns: repeat(auto-fit, minmax(260px, 1fr))">
      <div class="prose" v-html="diff.originalHtml"></div>
      <div class="prose" v-html="diff.correctedHtml"></div>
    </div>
  </section>

  <section v-if="state.narrative" class="card" style="margin-top: 1.5rem">
    <h2>AI mirror disclosure</h2>
    <p class="muted">Narrative summary extracted:</p>
    <p class="prose">{{ state.narrative }}</p>
    <p class="muted">Word count used: {{ state.wordCount }}</p>
  </section>
</template>
