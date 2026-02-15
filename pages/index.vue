<script setup lang="ts">
// No auth middleware on landing page
const auth = useAuth()
// Redirect authenticated users to their dashboard if they land here
if (auth.user.value) {
  navigateTo('/tournament')
}
</script>

<template>
  <div class="shell" style="min-height: 100vh; background: var(--bg)">
    <!-- Hero Section -->
    <header class="hero">
      <h1>Writers Fund</h1>
      <p>
        A serious tournament for writers. Compete against an AI mirror in weekly blind matchups.
        Earn your ELO. Get recognized.
      </p>

      <div class="actions">
        <NuxtLink to="/signup">
          <button style="padding: 0.8rem 1.5rem; font-size: 1.1rem">Start Writing</button>
        </NuxtLink>
        <NuxtLink to="/login">
          <button class="secondary" style="padding: 0.8rem 1.5rem; font-size: 1.1rem">Sign In</button>
        </NuxtLink>
      </div>
    </header>

    <!-- Value Props -->
    <section class="content wide features">
      <article class="feature">
        <h3>Write without distraction</h3>
        <p>
          A minimal, focused editor designed for flow. Autosave, spellcheck, and a strict 3000-word cap.
        </p>
      </article>

      <article class="feature">
        <h3>Fair competition</h3>
        <p>
          Your story competes anonymously against an AI-generated version of your own narrative.
          Voters choose the better story without bias.
        </p>
      </article>

      <article class="feature">
        <h3>Transparent Ranking</h3>
        <p>
          Earn an objective ELO score based on your wins. Rise through the ranks and prove your consistency over a
          12-week season.
        </p>
      </article>
    </section>

    <!-- How it works -->
    <section class="content wide" style="margin-top: 4rem; text-align: center">
      <h2 style="font-size: 2rem; margin-bottom: 2rem">The Weekly Cadence</h2>
      <div class="grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); text-align: left">
        <div class="card">
          <span class="badge" style="margin-bottom: 0.5rem">Mon - Sat</span>
          <h3>1. Submit</h3>
          <p class="muted">Write and submit your story before Saturday 9PM UTC.</p>
        </div>
        <div class="card">
          <span class="badge" style="margin-bottom: 0.5rem">Sat - Sun</span>
          <h3>2. Vote</h3>
          <p class="muted">Read blind matchups and vote for the best story.</p>
        </div>
        <div class="card">
          <span class="badge" style="margin-bottom: 0.5rem">Monday</span>
          <h3>3. Results</h3>
          <p class="muted">ELO scores update at 6AM UTC. Leaderboard refreshes.</p>
        </div>
      </div>
    </section>

    <!-- Footer CTA -->
    <section style="text-align: center; padding: 6rem 1rem">
      <h2 style="font-size: 2rem; margin-bottom: 1.5rem">Ready to complete?</h2>
      <NuxtLink to="/signup">
        <button style="font-size: 1.2rem; padding: 1rem 2rem">Join the Tournament</button>
      </NuxtLink>
    </section>
  </div>
</template>

<style scoped>
.hero h1 {
  font-size: 4rem;
  font-family: 'Literata', serif;
  margin-bottom: 1rem;
}
</style>
