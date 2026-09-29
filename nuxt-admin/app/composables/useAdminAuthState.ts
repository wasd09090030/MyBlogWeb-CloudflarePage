export type AdminAuthState = {
  authenticated: boolean
  checkedAt: number
}

const sessionCacheTtl = 30_000

export function useAdminAuthState() {
  const state = useState<AdminAuthState>('admin-auth-state', () => ({
    authenticated: false,
    checkedAt: 0
  }))

  return {
    state,
    isFresh: () => Date.now() - state.value.checkedAt < sessionCacheTtl,
    markAuthenticated: () => {
      state.value = { authenticated: true, checkedAt: Date.now() }
    },
    clear: () => {
      state.value = { authenticated: false, checkedAt: 0 }
    }
  }
}
