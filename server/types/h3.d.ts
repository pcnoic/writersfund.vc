import type { AuthUser } from '~/server/utils/auth'

declare module 'h3' {
  interface H3EventContext {
    authUser?: AuthUser
  }
}

export {}
