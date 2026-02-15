# Writers Fund Nuxt Monolith

A single Nuxt application serving both frontend and backend APIs for the Writers vs AI tournament.

## Run locally

```bash
npm install
npm run dev
```

## Supabase integration

This app uses Supabase for auth + data storage.

1. Create a Supabase project.
2. Apply the SQL in `supabase/schema.sql`.
3. Set environment variables:

```bash
cp .env.example .env
```

```
SUPABASE_URL=your-supabase-url
SUPABASE_KEY=your-anon-public-key
```

## Auth flow

- Signup creates a profile via a Supabase trigger.
- Login uses email + password.
- Tournament pages are protected by route middleware.

## Pages

- `/` public homepage
- `/signup` open signup
- `/login` sign in
- `/tournament` (auth)
- `/submission` (auth)
- `/voting` (auth)
- `/leaderboard` (auth)
- `/profile` (auth)
- `/terms` and `/privacy`

## API surface

- `GET /api/me`
- `GET /api/profile` (auth)
- `GET /api/tournaments/current`
- `GET /api/leaderboard` (auth)
- `POST /api/passages` (auth)
- `GET /api/passages/me` (auth)
- `GET /api/ballots/next` (auth)
- `POST /api/votes` (auth, feedback required)
- `GET /api/matchups/:id/result`
- `GET /api/voting/schedule`

## Postgres + Drizzle (optional)

The repo includes Drizzle config from earlier iterations. Supabase is the primary storage now.
