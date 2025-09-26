// See https://svelte.dev/docs/kit/types#app.d.ts

import type { User } from '$lib/models/user'

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
