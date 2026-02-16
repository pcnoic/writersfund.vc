# WritersFund Tournament – Definitive UI/UX Guide

This document defines the **authoritative UI/UX specification** for the WritersFund Tournament platform. It is written to be directly actionable by designers, frontend engineers, and product owners. Decisions are opinionated and intentional.

---

## 1. Product Philosophy (Non‑Negotiable)

1. **Writing comes first**. UI must never distract from reading or writing.
2. **Fairness and trust** are the product. Transparency beats flash.
3. **Competitive but humane**. This is a tournament, not a casino.
4. **Asynchronous by default**. Writers live in different time zones.
5. **Anti‑AI theatre**. AI is an opponent, not a gimmick.

If a design decision conflicts with these principles, it is wrong.

---

## 2. Global Design System

### 2.1 Visual Style

**Tone:** Literary, serious, modern.

- Background: warm off‑white (#FAFAF7)
- Primary text: near‑black (#111111)
- Secondary text: neutral gray (#666666)
- Accent: deep ink blue or burgundy (used sparingly)

Avoid neon, gradients, or playful illustration styles.

### 2.2 Typography

- **Reading & Writing:** Serif (e.g. Literata / Source Serif)
- **UI & Metrics:** Clean sans‑serif (e.g. Inter)

Rules:

- Max line width: **65–75 characters**
- Paragraph spacing > line spacing (readability first)

### 2.3 Layout Grid

- Desktop first, mobile supported
- Single primary column for content
- Secondary column only for metadata (never ads, never noise)

---

## 3. Core User Roles

- **Writer (Participant)** – submits, votes, receives score
- **Voter (Peer)** – always also a writer
- **Admin (Invisible)** – zero UI presence unless necessary

There is **no audience role**. Spectators dilute incentives.

---

## 4. Information Architecture

### Global Navigation (Top Bar)

- Home
- Tournament
- Leaderboard
- Vote (active only during window)
- Submit
- Profile

No dropdowns. No nesting. Flat is intentional.

---

## 5. Open Signup Flow

### Entry Page

Purpose: conversion without hype.

Sections:

1. Tournament explainer (short)
2. Key dates (current batch)
3. What you get / what we expect
4. Signup CTA

### Signup Form

Minimal friction:

- Name / Pen name
- Email
- Password
- Timezone
- Agreement checkboxes

#### Mandatory Legal Copy (Unmissable)

- WritersFund **does not own, publish, sell, train on, or reuse** submissions
- Only **voting metadata** is WritersFund property
- Submissions remain fully owned by the author

These statements must appear **above the submit button**, not hidden.

---

## 6. Profile Page

This is a **competitive identity**, not a social profile.

### Structure

1. Header
   - Name / Pen name
   - Current rank
   - Current ELO
   - Batch progress bar (Week X / 12)

2. Stats Block
   - Total submissions
   - Win rate vs AI
   - Avg peer rating
   - Feedback received count

3. Submission Timeline
   - Vertical timeline per week
   - Status: Submitted / Missed / Pending
   - Score delta (+ / -)

4. Feedback Summary
   - Aggregated themes (no raw voter names)

No avatars. No bios longer than 280 characters.

---

## 7. Writing Submission Page

This is the **most important screen** in the product.

### Editor Requirements

- Distraction‑free editor
- Word count always visible
- Hard cap: **3000 words** (enforced)
- Autosave every 5 seconds

### Spellcheck Flow

- Automatic spellcheck on submit
- Changes shown in a diff preview
- Writer must explicitly accept fixes

No grammar rewriting. Only spelling.

### Submission Timeline

Below the editor:

- Draft created
- Spellcheck applied
- AI opponent generated
- Submitted

Clear timestamps for each step.

---

## 8. AI Opponent Generation (UX)

This must feel fair and explainable.

### Disclosure Panel (Post‑Submit)

- Narrative summary extracted
- Word count used
- Constraint: AI story is equal or shorter

Do **not** show prompt text. Do **not** expose model branding.

---

## 9. Voting Page (Core Competitive Loop)

### Availability

- Opens: Saturday 21:00 UTC
- Closes: Sunday 21:00 UTC
- Locked outside window

### Layout

Side‑by‑side comparison:

- Left: Human submission
- Right: AI submission

Randomized position per voter.

### Reading Mode

- Identical typography
- No labels until after vote
- Scroll synced

### Voting Action

1. Choose winner
2. **Mandatory feedback textbox** (min 50 chars)
3. Submit vote

No vote is counted without feedback.

### Feedback Prompting

Structured prompts:

- What worked better?
- What felt weaker?
- Why did you choose this?

---

## 10. Scoring & ELO Transparency

### Post‑Vote Confirmation

- Your vote impact (small, abstracted)
- Feedback submitted confirmation

### Monday Results Page (06:00 UTC)

- Your match result
- ELO change
- Rank movement
- Selected anonymized feedback

No real‑time updates. Delayed reveals reduce gaming.

---

## 11. Leaderboard Page

This is **serious and restrained**.

### Default View

- Rank
- Name
- ELO
- Matches played
- Win rate vs AI

### Batch Scope

- Scores are **cumulative for the batch**
- Previous batches archived (read‑only)

### Visual Signals

- Rank movement arrows
- No confetti
- No gamified sounds

---

## 12. Tournament Structure UX

- 4 tournaments per year
- Each tournament = 12 weeks

### Batch Home Page

- Countdown to next phase
- Weekly cadence explanation
- Rules refresher

Missed weeks are visible. Consistency matters.

---

## 13. Trust, Safety, and Anti‑Gaming UX

- No public commenting
- No direct messaging
- No follower graphs

Feedback is anonymized and delayed.

### Integrity Signals

- Vote weight normalization
- Repeated low‑effort feedback flagged
- UI communicates enforcement quietly

---

## 14. Accessibility (Mandatory)

- Keyboard‑first editor
- Screen‑reader compatible voting
- High contrast mode

Writers are tired. Design accordingly.

---

## 15. Final Note

This platform succeeds only if writers feel:

> “I am being taken seriously here.”

Any UI element that undermines that feeling must be removed, even if it converts better.

This guide is definitive. Deviations require explicit justification.
