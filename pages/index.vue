<script setup lang="ts">
const auth = useAuth()
const isLoggedIn = computed(() => !!auth.user.value)
</script>

<template>
  <div class="landing-page">
    <!-- Hero Section -->
    <header class="hero">
      <div class="hero-content">
        <span class="hero-badge">Season 1 Now Live</span>
        <h1>Writers Fund</h1>
        <p class="hero-tagline">
          The competitive accelerator for writers. Submit weekly stories, 
          compete in blind matchups against AI, and climb the leaderboard.
        </p>

        <div class="hero-stats">
          <div class="stat">
            <span class="stat-value">12</span>
            <span class="stat-label">Week Season</span>
          </div>
          <div class="stat">
            <span class="stat-value">3000</span>
            <span class="stat-label">Max Words</span>
          </div>
          <div class="stat">
            <span class="stat-value">ELO</span>
            <span class="stat-label">Ranking System</span>
          </div>
        </div>

      </div>
    </header>

    <!-- The Concept -->
    <section class="concept-section">
      <div class="concept-grid">
        <div class="concept-main">
          <h2>Human vs. Machine</h2>
          <p>
            Every story you submit is analyzed by AI. We extract the narrative essence and generate 
            a competing version. Then voters—who don't know which is which—choose the better story.
          </p>
          <p>
            If you win, your ELO rises. If the AI wins, it falls. Over 12 weeks, the best writers 
            separate from the rest. No networking. No politics. Just the work.
          </p>
        </div>
        <div class="concept-sidebar">
          <div class="concept-card">
            <h4>Why AI?</h4>
            <p>AI provides a consistent, unbiased opponent. It can mimic narrative structure but struggles with voice, nuance, and genuine insight.</p>
          </div>
          <div class="concept-card">
            <h4>Why Blind?</h4>
            <p>Voters see only the text. No names, no bios, no reputation. The story speaks for itself.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Features Grid -->
    <section class="features-section">
      <h2>Built for Writers</h2>
      <div class="features-grid">
        <article class="feature-card">
          <div class="feature-icon">✍️</div>
          <h3>Focused Editor</h3>
          <p>Minimal interface. Autosave. Spellcheck. Draft management. Everything you need, nothing you don't.</p>
        </article>

        <article class="feature-card">
          <div class="feature-icon">⚖️</div>
          <h3>Fair Competition</h3>
          <p>Anonymous matchups eliminate bias. Your story competes on merit alone.</p>
        </article>

        <article class="feature-card">
          <div class="feature-icon">📊</div>
          <h3>ELO Rankings</h3>
          <p>The same system used in chess. Objective, mathematical, impossible to game.</p>
        </article>

        <article class="feature-card">
          <div class="feature-icon">🎯</div>
          <h3>Weekly Deadlines</h3>
          <p>Structure breeds productivity. Submit by Saturday, vote on Sunday, results on Monday.</p>
        </article>

        <article class="feature-card">
          <div class="feature-icon">📚</div>
          <h3>Any Genre</h3>
          <p>Literary fiction, sci-fi, fantasy, horror, romance—write what moves you.</p>
        </article>

        <article class="feature-card">
          <div class="feature-icon">🏆</div>
          <h3>Season Champions</h3>
          <p>Top performers at season end get recognized. Build a track record that matters.</p>
        </article>
      </div>
    </section>

    <!-- How it works -->
    <section class="cadence-section">
      <h2>The Weekly Rhythm</h2>
      <div class="cadence-timeline">
        <div class="cadence-step">
          <div class="step-marker">1</div>
          <div class="step-content">
            <span class="step-time">Monday → Saturday 9PM UTC</span>
            <h3>Write & Submit</h3>
            <p>Craft your story in our focused editor. Save drafts, refine, and submit when ready. One submission per week.</p>
          </div>
        </div>
        <div class="cadence-step">
          <div class="step-marker">2</div>
          <div class="step-content">
            <span class="step-time">Saturday 9PM → Sunday 11PM UTC</span>
            <h3>Vote on Matchups</h3>
            <p>Read anonymous story pairs and vote for the better one. Your votes help determine rankings.</p>
          </div>
        </div>
        <div class="cadence-step">
          <div class="step-marker">3</div>
          <div class="step-content">
            <span class="step-time">Monday 6AM UTC</span>
            <h3>Results & Rankings</h3>
            <p>ELO scores update based on matchup results. See where you stand on the leaderboard.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- FAQ Section -->
    <section class="faq-section">
      <h2>Common Questions</h2>
      <div class="faq-grid">
        <div class="faq-item">
          <h4>How does the AI mirror work?</h4>
          <p>We extract the core narrative from your story—plot points, character arcs, themes—and generate a new story with the same structure but different execution.</p>
        </div>
        <div class="faq-item">
          <h4>Is this free?</h4>
          <p>Always. We're focused on building a community of serious writers before introducing any paid features.</p>
        </div>
        <div class="faq-item">
          <h4>What if I miss a week?</h4>
          <p>No penalty. Your ELO stays the same. But consistency matters—the more you compete, the more accurate your ranking.</p>
        </div>
        <div class="faq-item">
          <h4>Can I see my AI opponent's story?</h4>
          <p>After voting closes, you can see both stories and the results. Learn from what worked and what didn't.</p>
        </div>
      </div>
    </section>

    <!-- Footer CTA -->
    <section class="cta-section">
      <h2>Ready to prove yourself?</h2>
      <p>Join writers who take their craft seriously. No excuses. Just weekly competition.</p>
      <div class="cta-actions">
        <template v-if="isLoggedIn">
          <NuxtLink to="/submission">
            <button class="btn-primary btn-large">Submit This Week's Story</button>
          </NuxtLink>
        </template>
        <template v-else>
          <NuxtLink to="/signup">
            <button class="btn-primary btn-large">Join the Tournament</button>
          </NuxtLink>
        </template>
      </div>
    </section>

    <!-- Footer -->
    <footer class="landing-footer">
      <p>&copy; 2026 Writers Fund. Built for writers, by writers.</p>
    </footer>
  </div>
</template>

<style scoped>
.landing-page {
  min-height: 100vh;
  background: var(--bg);
}

.hero {
  padding: 6rem 2rem 4rem;
  text-align: center;
  max-width: 900px;
  margin: 0 auto;
}

.hero-badge {
  display: inline-block;
  background: #2a7;
  color: white;
  padding: 0.35rem 1rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 500;
  margin-bottom: 1.5rem;
}

.hero h1 {
  font-size: 4rem;
  font-family: 'Literata', serif;
  margin-bottom: 1.5rem;
  line-height: 1.1;
}

.hero-tagline {
  font-size: 1.25rem;
  color: var(--fg);
  max-width: 650px;
  margin: 0 auto 2rem;
  line-height: 1.6;
}

.hero-stats {
  display: flex;
  justify-content: center;
  gap: 3rem;
  margin-bottom: 2.5rem;
  padding: 1.5rem 0;
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
}

.stat {
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 1.75rem;
  font-weight: 700;
  font-family: 'Literata', serif;
}

.stat-label {
  font-size: 0.85rem;
  color: var(--muted);
}

.actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

.actions a {
  display: inline-flex;
}

.btn-primary, .btn-secondary {
  padding: 0.9rem 1.75rem;
  font-size: 1.05rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-primary {
  background: var(--fg);
  color: var(--bg);
  border: none;
}

.btn-primary:hover {
  opacity: 0.9;
}

.btn-secondary {
  background: transparent;
  border: 1px solid var(--line);
  color: var(--fg);
}

.btn-secondary:hover {
  background: var(--panel);
}

.btn-large {
  padding: 1.1rem 2.5rem;
  font-size: 1.15rem;
}

/* Concept Section */
.concept-section {
  background: var(--panel);
  padding: 4rem 2rem;
}

.concept-grid {
  max-width: 1100px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1.5fr 1fr;
  gap: 3rem;
  align-items: start;
}

.concept-main h2 {
  font-size: 2rem;
  margin-bottom: 1.5rem;
  font-family: 'Literata', serif;
}

.concept-main p {
  font-size: 1.1rem;
  line-height: 1.7;
  margin-bottom: 1rem;
}

.concept-sidebar {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.concept-card {
  background: var(--bg);
  padding: 1.25rem;
  border-radius: 8px;
  border: 1px solid var(--line);
}

.concept-card h4 {
  margin-bottom: 0.5rem;
  font-size: 1rem;
}

.concept-card p {
  font-size: 0.9rem;
  color: var(--muted);
  margin: 0;
  line-height: 1.5;
}

/* Features Section */
.features-section {
  padding: 4rem 2rem;
  max-width: 1100px;
  margin: 0 auto;
}

.features-section h2 {
  text-align: center;
  font-size: 2rem;
  margin-bottom: 2.5rem;
  font-family: 'Literata', serif;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
}

.feature-card {
  padding: 1.5rem;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--bg);
}

.feature-icon {
  font-size: 1.5rem;
  margin-bottom: 0.75rem;
}

.feature-card h3 {
  font-size: 1.1rem;
  margin-bottom: 0.5rem;
}

.feature-card p {
  font-size: 0.9rem;
  color: var(--muted);
  margin: 0;
  line-height: 1.5;
}

/* Cadence Section */
.cadence-section {
  background: var(--panel);
  padding: 4rem 2rem;
}

.cadence-section h2 {
  text-align: center;
  font-size: 2rem;
  margin-bottom: 3rem;
  font-family: 'Literata', serif;
}

.cadence-timeline {
  max-width: 700px;
  margin: 0 auto;
}

.cadence-step {
  display: flex;
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.step-marker {
  width: 40px;
  height: 40px;
  background: var(--fg);
  color: var(--bg);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  flex-shrink: 0;
}

.step-content {
  flex: 1;
}

.step-time {
  font-size: 0.8rem;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.step-content h3 {
  margin: 0.25rem 0 0.5rem;
  font-size: 1.2rem;
}

.step-content p {
  margin: 0;
  color: var(--muted);
  line-height: 1.5;
}

/* FAQ Section */
.faq-section {
  padding: 4rem 2rem;
  max-width: 900px;
  margin: 0 auto;
}

.faq-section h2 {
  text-align: center;
  font-size: 2rem;
  margin-bottom: 2.5rem;
  font-family: 'Literata', serif;
}

.faq-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 2rem;
}

.faq-item h4 {
  font-size: 1rem;
  margin-bottom: 0.5rem;
}

.faq-item p {
  font-size: 0.95rem;
  color: var(--muted);
  margin: 0;
  line-height: 1.6;
}

/* CTA Section */
.cta-section {
  text-align: center;
  padding: 5rem 2rem;
  background: var(--panel);
}

.cta-section h2 {
  font-size: 2rem;
  margin-bottom: 1rem;
  font-family: 'Literata', serif;
}

.cta-section > p {
  color: var(--muted);
  margin-bottom: 2rem;
  font-size: 1.1rem;
}

/* Footer */
.landing-footer {
  text-align: center;
  padding: 2rem;
  border-top: 1px solid var(--line);
}

.landing-footer p {
  color: var(--muted);
  font-size: 0.9rem;
  margin: 0;
}

/* Responsive */
@media (max-width: 768px) {
  .hero h1 {
    font-size: 2.5rem;
  }

  .hero-stats {
    gap: 1.5rem;
  }

  .concept-grid {
    grid-template-columns: 1fr;
  }

  .features-grid {
    grid-template-columns: 1fr;
  }

  .faq-grid {
    grid-template-columns: 1fr;
  }
}
</style>
