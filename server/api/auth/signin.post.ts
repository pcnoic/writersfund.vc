import { queryOne } from '~/server/utils/db'
import { comparePassword } from '~/server/utils/password'
import { generateToken } from '~/server/utils/jwt'

interface SignInBody {
  email: string
  password: string
}

export default defineEventHandler(async (event) => {
  const body = await readBody<SignInBody>(event)

  if (!body.email || !body.password) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Email and password are required',
    })
  }

  // Find user
  const user = await queryOne<{
    id: string
    email: string
    name: string
    pen_name: string
    password_hash: string
    is_admin: boolean
  }>(
    'SELECT id, email, name, pen_name, password_hash, is_admin FROM users WHERE email = $1',
    [body.email]
  )

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Invalid email or password',
    })
  }

  // Verify password
  const isValid = await comparePassword(body.password, user.password_hash)

  if (!isValid) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Invalid email or password',
    })
  }

  // Generate token
  const token = generateToken({
    userId: user.id,
    email: user.email,
    isAdmin: user.is_admin,
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
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      pen_name: user.pen_name,
      is_admin: user.is_admin,
    },
    token,
  }
})
