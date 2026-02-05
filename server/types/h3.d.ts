import type { User } from '@supabase/supabase-js'

declare module 'h3' {
  interface H3EventContext {
    authUser?: User
  }
}

export {}
