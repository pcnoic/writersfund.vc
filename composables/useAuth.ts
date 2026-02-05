export function useAuth() {
  const user = useSupabaseUser()
  const client = useSupabaseClient()
  const pending = useState<boolean>('auth_pending', () => false)

  async function refresh(): Promise<void> {
    await client.auth.getUser()
  }

  async function signUp(input: {
    email: string
    password: string
    name: string
    penName: string
    timezone: string
    bio?: string
  }) {
    pending.value = true
    try {
      const { data, error } = await client.auth.signUp({
        email: input.email,
        password: input.password,
        options: {
          data: {
            name: input.name,
            pen_name: input.penName,
            timezone: input.timezone,
            bio: input.bio || ''
          }
        }
      })

      if (error) throw error
      return data
    } finally {
      pending.value = false
    }
  }

  async function signInWithPassword(email: string, password: string) {
    pending.value = true
    try {
      const { data, error } = await client.auth.signInWithPassword({ email, password })
      if (error) throw error
      return data
    } finally {
      pending.value = false
    }
  }

  async function signOut(): Promise<void> {
    await client.auth.signOut()
  }

  return {
    user,
    pending,
    refresh,
    signUp,
    signInWithPassword,
    signOut
  }
}
