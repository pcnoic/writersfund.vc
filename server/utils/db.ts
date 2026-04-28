import { Pool, PoolClient } from 'pg'

let pool: Pool | null = null

export function getPool(): Pool {
  if (!pool) {
    const databaseUrl = process.env.DATABASE_URL

    if (!databaseUrl) {
      throw new Error(
        'DATABASE_URL environment variable is not set. ' +
        'Configure it as: postgresql://user:password@host:port/database'
      )
    }

    pool = new Pool({
      connectionString: databaseUrl,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    })

    pool.on('error', (err) => {
      console.error('[DB] Unexpected error on idle client:', err)
    })
  }

  return pool
}

export async function query<T = any>(
  text: string,
  values?: any[]
): Promise<{ rows: T[]; rowCount: number | null }> {
  const client = await getPool().connect()
  try {
    const result = await client.query(text, values)
    return { rows: result.rows, rowCount: result.rowCount }
  } finally {
    client.release()
  }
}

export async function queryOne<T = any>(
  text: string,
  values?: any[]
): Promise<T | null> {
  const { rows } = await query<T>(text, values)
  return rows.length > 0 ? rows[0] : null
}

export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getPool().connect()
  try {
    await client.query('BEGIN')
    const result = await callback(client)
    await client.query('COMMIT')
    return result
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

export async function close(): Promise<void> {
  if (pool) {
    await pool.end()
    pool = null
  }
}
