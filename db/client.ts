import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const globalForDb = globalThis as unknown as {
  sql?: ReturnType<typeof postgres>
}

export function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set. Falling back to file store.')
  }

  if (!globalForDb.sql) {
    globalForDb.sql = postgres(process.env.DATABASE_URL, {
      max: 5,
      idle_timeout: 20
    })
  }

  return drizzle(globalForDb.sql, { schema })
}
