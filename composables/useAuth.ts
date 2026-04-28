export function useAuth() {
  const user = useState<any>('auth_user', () => null)
  const pending = useState<boolean>('auth_pending', () => false)
  const error = useState<string | null>('auth_error', () => null)

  async function refresh(): Promise<void> {
    try {
      const response = await $fetch('/api/auth/me')
      user.value = response.user
    } catch {
      user.value = null
    }
  }

  async function signUp(input: {
    email: string
    password: string
    name: string
    penName: string
    timezone: string
    bio?: string
    recaptchaToken?: string
  }) {
    pending.value = true
    error.value = null
    try {
      const { user: newUser, token } = await $fetch('/api/auth/signup', {
        method: 'POST',
        body: {
          email: input.email,
          password: input.password,
          name: input.name,
          penName: input.penName,
          timezone: input.timezone,
          bio: input.bio || '',
          recaptchaToken: input.recaptchaToken,
        },
      })

      user.value = newUser
      return { user: newUser, token }
    } catch (err: any) {
      error.value = err.data?.statusMessage || 'Sign-up failed'
      throw err
    } finally {
      pending.value = false
    }
  }

  async function signInWithPassword(email: string, password: string) {
    pending.value = true
    error.value = null
    try {
      const { user: signedInUser, token } = await $fetch('/api/auth/signin', {
        method: 'POST',
        body: { email, password },
      })

      user.value = signedInUser
      return { user: signedInUser, token }
    } catch (err: any) {
      error.value = err.data?.statusMessage || 'Sign-in failed'
      throw err
    } finally {
      pending.value = false
    }
  }

  async function signOut(): Promise<void> {
    try {
      await $fetch('/api/auth/signout', { method: 'POST' })
      user.value = null
    } catch (err) {
      console.error('Sign-out error:', err)
    }
  }

  return {
    user,
    pending,
    error,
    refresh,
    signUp,
    signInWithPassword,
    signOut,
  }
}
