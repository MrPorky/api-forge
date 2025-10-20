// See https://svelte.dev/docs/kit/types#app.d.ts

import type { User } from '@examples/shared'

// for information about these interfaces
declare global {
  namespace App {
    // interface Error {}
    interface Locals {
      user: {
        token: string
        user: User
      }
    }
    // interface PageData {}
    // interface PageState {}
    // interface Platform {}
  }
}

export {}
