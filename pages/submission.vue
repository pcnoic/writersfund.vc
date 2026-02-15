<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const auth = useAuth()
const { getToken } = useRecaptcha()

const genreOptions = [
  { value: '', label: 'Select a genre' },
  { value: 'Literary Fiction', label: 'Literary Fiction' },
  { value: 'Science Fiction', label: 'Science Fiction' },
  { value: 'Fantasy', label: 'Fantasy' },
  { value: 'Mystery', label: 'Mystery' },
  { value: 'Thriller', label: 'Thriller' },
  { value: 'Romance', label: 'Romance' },
  { value: 'Horror', label: 'Horror' },
  { value: 'Historical Fiction', label: 'Historical Fiction' },
  { value: 'Contemporary Fiction', label: 'Contemporary Fiction' },
  { value: 'Young Adult', label: 'Young Adult' },
  { value: 'Creative Non-Fiction', label: 'Creative Non-Fiction' },
  { value: 'Poetry', label: 'Poetry' },
  { value: 'Other', label: 'Other' }
]

const form = reactive({
  title: '',
  genre: '',
  customGenre: '',
  content: ''
})

const effectiveGenre = computed(() => {
  return form.genre === 'Other' ? form.customGenre : form.genre
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
const draftsKey = 'writersfund_drafts'

const autoSaveStatus = ref<'idle' | 'saving' | 'saved'>('idle')
const lastSaved = ref<Date | null>(null)
const showDraftsPanel = ref(false)

interface Draft {
  id: string
  title: string
  genre: string
  content: string
  savedAt: string
}

const drafts = ref<Draft[]>([])

const tournamentInfo = ref({
  currentWeek: 1,
  totalWeeks: 12
})

interface ExistingSubmission {
  id: string
  title: string
  genre: string
  content: string
  narrative: string | null
  word_count: number | null
  created_at: string
}

const existingSubmission = ref<ExistingSubmission | null>(null)
const checkingSubmission = ref(true)

const wordCount = computed(() => form.content.trim().split(/\s+/).filter(Boolean).length)

async function loadTournamentInfo() {
  try {
    const data = await $fetch<{ currentWeek: number; totalWeeks: number }>('/api/leaderboard')
    tournamentInfo.value = {
      currentWeek: data.currentWeek,
      totalWeeks: data.totalWeeks
    }
  } catch {
    // Use defaults
  }
}

async function checkExistingSubmission() {
  try {
    const data = await $fetch<{ hasSubmission: boolean; submission: ExistingSubmission | null }>('/api/submissions/current-week')
    existingSubmission.value = data.submission
  } catch {
    existingSubmission.value = null
  } finally {
    checkingSubmission.value = false
  }
}

let saveTimeout: ReturnType<typeof setTimeout> | null = null

function debouncedSave() {
  if (saveTimeout) clearTimeout(saveTimeout)
  autoSaveStatus.value = 'saving'
  saveTimeout = setTimeout(() => {
    saveDraft()
    autoSaveStatus.value = 'saved'
    lastSaved.value = new Date()
    setTimeout(() => {
      autoSaveStatus.value = 'idle'
    }, 2000)
  }, 1000)
}

function loadDrafts() {
  const saved = localStorage.getItem(draftsKey)
  if (saved) {
    try {
      drafts.value = JSON.parse(saved)
    } catch {
      drafts.value = []
    }
  }
}

function saveDrafts() {
  localStorage.setItem(draftsKey, JSON.stringify(drafts.value))
}

function saveAsDraft() {
  const draft: Draft = {
    id: `draft-${Date.now()}`,
    title: form.title || 'Untitled',
    genre: form.genre,
    content: form.content,
    savedAt: new Date().toISOString()
  }
  drafts.value.unshift(draft)
  saveDrafts()
  state.message = 'Draft saved.'
}

function loadDraftById(id: string) {
  const draft = drafts.value.find(d => d.id === id)
  if (draft) {
    form.title = draft.title
    form.genre = draft.genre
    form.content = draft.content
    showDraftsPanel.value = false
    state.message = 'Draft loaded.'
  }
}

function deleteDraft(id: string) {
  drafts.value = drafts.value.filter(d => d.id !== id)
  saveDrafts()
}

function clearEditor() {
  form.title = ''
  form.genre = ''
  form.customGenre = ''
  form.content = ''
  state.correctedPreview = ''
  acceptFixes.value = false
  localStorage.removeItem(autoSaveKey)
  state.message = 'Editor cleared.'
}

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
    const recaptchaToken = await getToken('submission')
    if (!recaptchaToken) {
      state.message = 'reCAPTCHA verification failed. Please try again.'
      state.loading = false
      return
    }

    const data = await $fetch('/api/passages', {
      method: 'POST',
      body: {
        title: form.title,
        genre: effectiveGenre.value,
        content: state.correctedPreview || form.content,
        recaptchaToken
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

onMounted(async () => {
  if (process.client) {
    await checkExistingSubmission()
    if (!existingSubmission.value) {
      loadDraft()
      loadDrafts()
    }
    await loadTournamentInfo()
  }
})

watch(() => [form.title, form.genre, form.content], () => {
  debouncedSave()
}, { deep: true })
</script>

<template>
  <div v-if="checkingSubmission" class="card" style="text-align: center; padding: 3rem">
    <p class="muted">Checking submission status...</p>
  </div>

  <div v-else-if="existingSubmission" class="submitted-view">
    <section class="card">
      <div class="submitted-header">
        <h1>Week {{ tournamentInfo.currentWeek }} Submission</h1>
        <span class="submitted-badge">Submitted</span>
      </div>
      <p class="muted">You have already submitted a story for this week. You can submit again next week.</p>
      
      <div class="submitted-meta">
        <div>
          <strong>Title</strong>
          <p>{{ existingSubmission.title }}</p>
        </div>
        <div>
          <strong>Genre</strong>
          <p>{{ existingSubmission.genre }}</p>
        </div>
        <div>
          <strong>Word Count</strong>
          <p>{{ existingSubmission.word_count || 'N/A' }}</p>
        </div>
        <div>
          <strong>Submitted</strong>
          <p>{{ new Date(existingSubmission.created_at).toLocaleString() }}</p>
        </div>
      </div>

      <div class="submitted-content">
        <strong>Your Story</strong>
        <div class="prose story-preview">{{ existingSubmission.content }}</div>
      </div>

      <div v-if="existingSubmission.narrative" class="submitted-narrative">
        <strong>AI Narrative Summary</strong>
        <p class="muted">{{ existingSubmission.narrative }}</p>
      </div>
    </section>
  </div>

  <div v-else class="editor-layout">
    <aside class="editor-sidebar" :class="{ open: showDraftsPanel }">
      <div class="sidebar-header">
        <h3>Drafts</h3>
        <button class="icon-btn" @click="showDraftsPanel = false">×</button>
      </div>
      <div class="drafts-list">
        <div v-if="drafts.length === 0" class="muted" style="padding: 1rem">
          No saved drafts yet.
        </div>
        <div v-for="draft in drafts" :key="draft.id" class="draft-item">
          <div class="draft-info" @click="loadDraftById(draft.id)">
            <strong>{{ draft.title }}</strong>
            <span class="muted">{{ new Date(draft.savedAt).toLocaleDateString() }}</span>
          </div>
          <button class="icon-btn danger" @click.stop="deleteDraft(draft.id)">×</button>
        </div>
      </div>
    </aside>

    <main class="editor-main">
      <header class="editor-header">
        <div class="editor-title-row">
          <div>
            <h1>Writing Submission</h1>
            <p class="week-indicator">Submitting for <strong>Week {{ tournamentInfo.currentWeek }}</strong> of {{ tournamentInfo.totalWeeks }}</p>
          </div>
          <div class="autosave-status">
            <span v-if="autoSaveStatus === 'saving'" class="status-saving">Saving...</span>
            <span v-else-if="autoSaveStatus === 'saved'" class="status-saved">Saved</span>
            <span v-else-if="lastSaved" class="muted">Last saved {{ lastSaved.toLocaleTimeString() }}</span>
          </div>
        </div>
        <div class="editor-toolbar">
          <button class="secondary" @click="showDraftsPanel = !showDraftsPanel">
            Drafts ({{ drafts.length }})
          </button>
          <button class="secondary" @click="saveAsDraft">Save as draft</button>
          <button class="secondary" @click="clearEditor">Clear</button>
          <span class="word-count">{{ wordCount }} / 3000 words</span>
        </div>
      </header>

      <div class="editor-form">
        <div class="editor-meta">
          <input v-model="form.title" class="title-input" placeholder="Story title" />
          <select v-model="form.genre" class="genre-select">
            <option 
              v-for="opt in genreOptions" 
              :key="opt.value" 
              :value="opt.value"
              :disabled="opt.value === ''"
            >{{ opt.label }}</option>
          </select>
          <input 
            v-if="form.genre === 'Other'" 
            v-model="form.customGenre" 
            class="custom-genre-input" 
            placeholder="Specify your genre" 
          />
        </div>
        <textarea
          v-model="form.content"
          class="editor-textarea prose"
          placeholder="Write or paste your story here..."
        />
      </div>

      <footer class="editor-footer">
        <div class="actions">
          <button class="secondary" :disabled="state.loading || !form.content" @click="runSpellcheck">
            Run spellcheck
          </button>
          <label class="checkbox-inline">
            <input v-model="acceptFixes" type="checkbox" :disabled="!state.correctedPreview" />
            Accept fixes
          </label>
          <button
            :disabled="state.loading || !state.correctedPreview || !acceptFixes"
            @click="submit"
          >
            Submit story
          </button>
        </div>
        <p v-if="state.message" class="message">{{ state.message }}</p>
        <p class="muted">Submission cutoff: Saturday 9:00 PM UTC</p>
      </footer>
    </main>
  </div>

  <section v-if="state.correctedPreview" class="card spellcheck-preview">
    <h2>Spellcheck preview</h2>
    <p class="muted">Review changes. Corrections are highlighted.</p>
    <div class="diff-grid">
      <div>
        <h4 class="muted">Original</h4>
        <div class="prose diff-panel" v-html="diff.originalHtml"></div>
      </div>
      <div>
        <h4 class="muted">Corrected</h4>
        <div class="prose diff-panel" v-html="diff.correctedHtml"></div>
      </div>
    </div>
  </section>

  <section v-if="state.narrative" class="card" style="margin-top: 1.5rem">
    <h2>AI mirror disclosure</h2>
    <p class="muted">Narrative summary extracted:</p>
    <p class="prose">{{ state.narrative }}</p>
    <p class="muted">Word count used: {{ state.wordCount }}</p>
  </section>
</template>

<style scoped>
.submitted-view {
  max-width: 800px;
  margin: 0 auto;
}

.submitted-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.submitted-header h1 {
  margin: 0;
}

.submitted-badge {
  background: #2a7;
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 500;
}

.submitted-meta {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin: 1.5rem 0;
  padding: 1rem;
  background: #f9f9f7;
  border-radius: 8px;
}

.submitted-meta strong {
  display: block;
  font-size: 0.85rem;
  color: var(--muted);
  margin-bottom: 0.25rem;
}

.submitted-meta p {
  margin: 0;
}

.submitted-content {
  margin-top: 1.5rem;
}

.submitted-content strong {
  display: block;
  margin-bottom: 0.5rem;
}

.story-preview {
  max-height: 400px;
  overflow-y: auto;
  padding: 1rem;
  background: #fafaf7;
  border-radius: 8px;
  border: 1px solid var(--line);
  white-space: pre-wrap;
}

.submitted-narrative {
  margin-top: 1.5rem;
  padding: 1rem;
  background: #f0efe8;
  border-radius: 8px;
}

.submitted-narrative strong {
  display: block;
  margin-bottom: 0.5rem;
}

.editor-layout {
  display: flex;
  min-height: calc(100vh - 200px);
  margin: -1.75rem -1.5rem;
  position: relative;
}

.editor-sidebar {
  width: 280px;
  background: var(--panel);
  border-right: 1px solid var(--line);
  position: fixed;
  left: -280px;
  top: 60px;
  bottom: 0;
  z-index: 20;
  transition: left 0.2s ease;
  overflow-y: auto;
}

.editor-sidebar.open {
  left: 0;
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid var(--line);
}

.sidebar-header h3 {
  margin: 0;
}

.drafts-list {
  padding: 0.5rem 0;
}

.draft-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--line);
  cursor: pointer;
  transition: background 0.15s;
}

.draft-item:hover {
  background: #f9f9f7;
}

.draft-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.icon-btn {
  background: none;
  border: none;
  padding: 0.25rem 0.5rem;
  font-size: 1.25rem;
  cursor: pointer;
  color: var(--muted);
  border-radius: 4px;
}

.icon-btn:hover {
  background: #f0f0f0;
}

.icon-btn.danger:hover {
  color: #c00;
  background: #fee;
}

.editor-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 1.5rem 2rem;
  max-width: 900px;
  margin: 0 auto;
  width: 100%;
}

.editor-header {
  margin-bottom: 1.5rem;
}

.editor-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.editor-title-row h1 {
  margin: 0;
}

.week-indicator {
  margin: 0.25rem 0 0;
  font-size: 0.9rem;
  color: var(--muted);
}

.week-indicator strong {
  color: var(--accent);
}

.autosave-status {
  font-size: 0.85rem;
}

.status-saving {
  color: var(--muted);
}

.status-saved {
  color: #2a7;
}

.editor-toolbar {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  flex-wrap: wrap;
}

.word-count {
  margin-left: auto;
  font-size: 0.9rem;
  color: var(--muted);
}

.editor-form {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.editor-meta {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.title-input {
  flex: 2;
  min-width: 200px;
}

.genre-select {
  flex: 1;
  min-width: 150px;
}

.custom-genre-input {
  flex: 1;
  min-width: 150px;
  font-size: 1.1rem;
  font-weight: 500;
}

.genre-input {
  flex: 1;
}

.editor-textarea {
  flex: 1;
  min-height: 400px;
  resize: vertical;
  font-size: 1.05rem;
  line-height: 1.8;
  padding: 1.25rem;
}

.editor-footer {
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid var(--line);
}

.editor-footer .actions {
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
}

.checkbox-inline {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-size: 0.9rem;
}

.checkbox-inline input {
  width: auto;
  margin: 0;
}

.message {
  margin-top: 1rem;
  padding: 0.75rem;
  background: #f0efe8;
  border-radius: 8px;
  color: var(--accent);
}

.spellcheck-preview {
  margin: 1.5rem 0;
}

.diff-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  margin-top: 1rem;
}

.diff-panel {
  max-height: 300px;
  overflow-y: auto;
  padding: 1rem;
  background: #fafaf7;
  border-radius: 8px;
  border: 1px solid var(--line);
}

@media (max-width: 768px) {
  .editor-layout {
    flex-direction: column;
  }

  .editor-meta {
    flex-direction: column;
  }

  .diff-grid {
    grid-template-columns: 1fr;
  }

  .editor-main {
    padding: 1rem;
  }
}
</style>
