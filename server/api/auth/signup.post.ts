import { query, queryOne } from '~/server/utils/db'
import { hashPassword, comparePassword } from '~/server/utils/password'
import { generateToken } from '~/server/utils/jwt'

interface SignUpBody {
  email: string
  password: string
  name: string
  penName: string
  timezone: string
  bio?: string
}

export default defineEventHandler(async (event) => {
  const body = await readBody<SignUpBody>(event)

  // Validate input
  if (!body.email || !body.password || !body.name || !body.penName) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing required fields: email, password, name, penName',
    })
  }

  // Check if user exists
  const existing = await queryOne(
    'SELECT id FROM users WHERE email = $1',
    [body.email]
  )

  if (existing) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Email already registered',
    })
  }

  // Hash password
  const passwordHash = await hashPassword(body.password)

  // Create user
  const result = await queryOne<{ id: string }>(
    `INSERT INTO users (email, password_hash, name, pen_name, timezone, bio)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, email, name, pen_name, is_admin`,
    [
      body.email,
      passwordHash,
      body.name,
      body.penName,
      body.timezone || 'UTC',
      body.bio || null,
    ]
  )

  if (!result) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to create user',
    })
  }

  // Generate token
  const token = generateToken({
    userId: result.id,
    email: body.email,
    isAdmin: false,
  })

  // Set secure cookie
  setCookie(event, 'auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  })

  return {
    success: true,
    user: result,
    token,
  }
})
