import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Ref } from 'vue'
import { createApiClient } from '~/shared/api/client'

// 用户角色枚举
export const UserRoles = {
  GUEST: 'guest',
  ADMIN: 'admin'
} as const

export type UserRole = typeof UserRoles[keyof typeof UserRoles]

type AuthHeaders = Record<string, string>

type AuthApiResponse = {
  success: boolean
  message?: string
  token?: string
  refreshToken?: string
  expiresAt?: string
}

type LogoutResponse = {
  success: boolean
  message?: string
}

type ChangePasswordResponse = {
  success: boolean
  message?: string
}

type CookieRef = Ref<string | null>

type AuthCookies = {
  token: CookieRef
  refreshToken: CookieRef
  tokenExpires: CookieRef
  userRole: CookieRef
  isAuthenticated: CookieRef
  loginTime: CookieRef
}

type AuthFetchOptions = {
} & NonNullable<Parameters<typeof $fetch>[1]>

type FetchErrorLike = {
  response?: { status?: number }
  data?: { message?: string }
}

function getErrorMessage(error: unknown, fallback = '请求失败'): string {
  if (error instanceof Error && error.message) {
    return error.message
  }
  return fallback
}

function isFetchErrorLike(error: unknown): error is FetchErrorLike {
  return typeof error === 'object' && error !== null
}

// Cookie 键名
const TOKEN_KEY = 'auth_token'
const REFRESH_TOKEN_KEY = 'auth_refresh_token'
const TOKEN_EXPIRES_KEY = 'auth_token_expires'
const USER_ROLE_KEY = 'user_role'
const IS_AUTHENTICATED_KEY = 'is_authenticated'
const LOGIN_TIME_KEY = 'login_time'

export const useAuthStore = defineStore('auth', () => {
  // --- State ---
  const userRole = ref<UserRole>(UserRoles.GUEST)
  const isAuthenticated = ref(false)
  const loginAttempts = ref(0)
  const lockoutUntil = ref(0)
  const token = ref<string | null>(null)
  const refreshToken = ref<string | null>(null)
  const tokenExpiresAt = ref<string | null>(null)
  const tokenRefreshTimer = ref<ReturnType<typeof setInterval> | null>(null)

  // --- Getters ---
  const isAdmin = computed(() => userRole.value === UserRoles.ADMIN && isAuthenticated.value)
  const isGuest = computed(() => userRole.value === UserRoles.GUEST)
  const isLocked = computed(() => lockoutUntil.value > Date.now())
  
  const authHeaders = computed((): AuthHeaders => {
    if (token.value) {
      return { Authorization: `Bearer ${token.value}` }
    }
    return {}
  })

  const isTokenExpiringSoon = computed(() => {
    if (!tokenExpiresAt.value) return false
    return new Date(tokenExpiresAt.value).getTime() - Date.now() < 30 * 60 * 1000
  })

  const isTokenExpired = computed(() => {
    if (!tokenExpiresAt.value) return true
    return new Date(tokenExpiresAt.value).getTime() < Date.now()
  })

  // --- Actions ---

  // 获取 Cookie 实例
  function _getCookies(): AuthCookies {
    if (!import.meta.client) {
      throw new Error('Cookies 仅在客户端可用')
    }
    // 注意：禁用自动 decode，避免 destr 将字符串转换为其他类型
    const cookieOpts = (maxAge: number) => ({ maxAge, decode: (v: string) => v, encode: (v: string) => v })
    return {
      token: useCookie(TOKEN_KEY, cookieOpts(60 * 60 * 24 * 7)),
      refreshToken: useCookie(REFRESH_TOKEN_KEY, cookieOpts(60 * 60 * 24 * 30)),
      tokenExpires: useCookie(TOKEN_EXPIRES_KEY, cookieOpts(60 * 60 * 24 * 7)),
      userRole: useCookie(USER_ROLE_KEY, cookieOpts(60 * 60 * 24 * 7)),
      isAuthenticated: useCookie(IS_AUTHENTICATED_KEY, cookieOpts(60 * 60 * 24 * 7)),
      loginTime: useCookie(LOGIN_TIME_KEY, cookieOpts(60 * 60 * 24 * 7))
    }
  }

  // 停止后台定时器
  function stopTokenRefreshTimer(): void {
    if (tokenRefreshTimer.value) {
      clearInterval(tokenRefreshTimer.value)
      tokenRefreshTimer.value = null
      console.log('[Auth] Token 刷新定时器已停止')
    }
  }

  // 退出登录
  async function logout(): Promise<LogoutResponse> {
    const config = useRuntimeConfig()
    const baseURL = config.public.apiBase

    // 停止后台定时器
    stopTokenRefreshTimer()

    // 调用后端登出接口（使 RefreshToken 失效）
    if (token.value) {
      try {
        await $fetch(`${baseURL}/auth/logout`, {
          method: 'POST',
          headers: authHeaders.value
        })
      } catch (error) {
        console.error('登出请求失败:', error)
      }
    }

    userRole.value = UserRoles.GUEST
    isAuthenticated.value = false
    loginAttempts.value = 0
    lockoutUntil.value = 0
    token.value = null
    refreshToken.value = null
    tokenExpiresAt.value = null

    if (import.meta.client) {
      const cookies = _getCookies()
      cookies.userRole.value = UserRoles.GUEST
      cookies.isAuthenticated.value = null
      cookies.loginTime.value = null
      cookies.token.value = null
      cookies.refreshToken.value = null
      cookies.tokenExpires.value = null
    }

    return {
      success: true
    }
  }

  // 刷新 Token
  async function refreshAccessToken(): Promise<boolean> {
    if (!refreshToken.value) {
      console.log('[Auth] 没有 RefreshToken，无法刷新')
      return false
    }

    const api = createApiClient()

    try {
      console.log('[Auth] 正在刷新 Token...')
      const result = await api.post<AuthApiResponse>('/auth/refresh', { refreshToken: refreshToken.value })

      if (result.success) {
        console.log('[Auth] Token 刷新成功，新过期时间:', result.expiresAt)
        token.value = result.token ?? null
        refreshToken.value = result.refreshToken ?? null
        tokenExpiresAt.value = result.expiresAt ?? null

        if (import.meta.client) {
          const cookies = _getCookies()
          cookies.token.value = result.token ?? null
          cookies.refreshToken.value = result.refreshToken ?? null
          cookies.tokenExpires.value = result.expiresAt ?? null
        }
        return true
      }
      console.log('[Auth] Token 刷新失败:', result.message)
      return false
    } catch (error: unknown) {
      console.error('[Auth] Token 刷新失败:', error)
      // 如果是 401 错误，说明 RefreshToken 也过期了，需要重新登录
      if (isFetchErrorLike(error) && error.response?.status === 401) {
        await logout()
      }
      return false
    }
  }

  // 启动后台 Token 检查定时器
  function startTokenRefreshTimer(): void {
    if (!import.meta.client) return

    // 清除旧的定时器
    stopTokenRefreshTimer()

    // 每 10 分钟检查一次 Token 状态
    tokenRefreshTimer.value = setInterval(async () => {
      if (!isAuthenticated.value || !token.value) {
        stopTokenRefreshTimer()
        return
      }

      // 如果 Token 已过期，尝试刷新
      if (isTokenExpired.value) {
        console.log('[Auth] Token 已过期，尝试刷新...')
        const success = await refreshAccessToken()
        if (!success) {
          console.log('[Auth] Token 刷新失败，退出登录')
          await logout()
        }
      }
      // 如果 Token 即将过期（30分钟内），主动刷新
      else if (isTokenExpiringSoon.value) {
        console.log('[Auth] Token 即将过期，主动刷新...')
        await refreshAccessToken()
      }
    }, 10 * 60 * 1000) // 10 分钟

    console.log('[Auth] Token 刷新定时器已启动')
  }

  // 验证管理员密码 - 通过API调用
  async function verifyAdminPassword(password: string): Promise<{ success: boolean; message?: string }> {
    const api = createApiClient()

    // 检查是否在锁定时间内
    const now = Date.now()
    if (lockoutUntil.value > now) {
      const remainingTimeInSeconds = Math.ceil((lockoutUntil.value - now) / 1000)
      return {
        success: false,
        message: `账户已锁定，请在${remainingTimeInSeconds}秒后重试`
      }
    }

    try {
      // 通过API验证密码
      const result = await api.post<AuthApiResponse>('/auth/login', { username: 'admin', password })

      if (result.success) {
        // 重置错误尝试次数
        loginAttempts.value = 0

        // 存储 Token
        token.value = result.token ?? null
        refreshToken.value = result.refreshToken ?? null
        tokenExpiresAt.value = result.expiresAt ?? null

        // 使用 Cookie 存储
        if (import.meta.client) {
          const cookies = _getCookies()
          cookies.token.value = result.token ?? null
          cookies.refreshToken.value = result.refreshToken ?? null
          cookies.tokenExpires.value = result.expiresAt ?? null
        }

        // 启动后台定时器
        startTokenRefreshTimer()

        return {
          success: true
        }
      }

      // 增加错误尝试次数
      loginAttempts.value++

      // 如果连续错误5次，锁定账户1分钟
      if (loginAttempts.value >= 5) {
        lockoutUntil.value = now + 60 * 1000 // 1分钟后解锁
        loginAttempts.value = 0
        return {
          success: false,
          message: '密码错误5次，账户已锁定1分钟'
        }
      }

      return {
        success: false,
        message: result.message || `密码错误，还有${5 - loginAttempts.value}次尝试机会`
      }
    } catch (error: unknown) {
      console.error('登录验证失败:', error)
      return {
        success: false,
        message: '登录验证失败，请重试'
      }
    }
  }

  // 带认证的 fetch 请求（自动处理 Token 刷新）
  async function authFetch<T = unknown>(url: string, options: AuthFetchOptions = {}): Promise<T> {
    const api = createApiClient()
    const request = async <R>(requestUrl: string, requestOptions?: AuthFetchOptions): Promise<R> => {
      return await api.request<R>(requestUrl, requestOptions)
    }

    // 如果 Token 已过期，先刷新
    if (isTokenExpired.value && refreshToken.value) {
      console.log('[Auth] Token 已过期，请求前先刷新')
      const refreshed = await refreshAccessToken()
      if (!refreshed) {
        throw new Error('Token 已过期且刷新失败，请重新登录')
      }
    }
    // 如果 Token 即将过期，也先刷新
    else if (isTokenExpiringSoon.value && refreshToken.value) {
      console.log('[Auth] Token 即将过期，请求前先刷新')
      await refreshAccessToken()
    }

    const fetchOptions: AuthFetchOptions = {
      ...options,
      headers: {
        ...options.headers,
        ...authHeaders.value
      }
    }

    try {
      return await request<T>(url, fetchOptions)
    } catch (error: unknown) {
      // 如果是 401 错误，尝试刷新 Token 并重试一次
      if (isFetchErrorLike(error) && error.response?.status === 401 && refreshToken.value) {
        console.log('[Auth] 收到 401 错误，尝试刷新 Token 并重试')
        const refreshed = await refreshAccessToken()
        if (refreshed) {
          // 更新请求头
          fetchOptions.headers = {
            ...options.headers,
            ...authHeaders.value
          }
          // 重试请求
          try {
            return await request<T>(url, fetchOptions)
          } catch (retryError) {
            console.error('[Auth] 重试后仍然失败:', retryError)
            throw retryError
          }
        }
        console.error('[Auth] Token 刷新失败，需要重新登录')
        await logout()
        throw new Error('Token 已失效，请重新登录')
      }
      throw error
    }
  }

  // 设置用户角色
  async function setUserRole(role: UserRole, password: string | null = null): Promise<{ success: boolean; message?: string }> {
    // 如果尝试设置为管理员角色，需要验证密码
    if (role === UserRoles.ADMIN) {
      if (!isAuthenticated.value) {
        if (!password) {
          return {
            success: false,
            message: '请输入管理员密码'
          }
        }

        // 验证密码
        const verifyResult = await verifyAdminPassword(password)
        if (!verifyResult.success) {
          return verifyResult
        }

        // 验证成功，设置认证状态
        isAuthenticated.value = true
        if (import.meta.client) {
          const cookies = _getCookies()
          cookies.isAuthenticated.value = 'true'
          cookies.loginTime.value = Date.now().toString()
        }

        // 启动后台定时器
        startTokenRefreshTimer()
      }
    }

    // 更新角色
    if ((Object.values(UserRoles) as string[]).includes(role)) {
      userRole.value = role
      if (import.meta.client) {
        const cookies = _getCookies()
        cookies.userRole.value = role
      }
      return {
        success: true
      }
    }

    return {
      success: false,
      message: '无效的用户角色'
    }
  }

  // 管理员登录
  async function login(username: string, password: string): Promise<{ success: boolean; message?: string }> {
    // 简单验证用户名
    if (username !== 'admin') {
      return {
        success: false,
        message: '用户名错误'
      }
    }

    const result = await setUserRole(UserRoles.ADMIN, password)
    return result
  }

  // 修改密码
  async function changePassword(currentPassword: string, newPassword: string): Promise<ChangePasswordResponse> {
    const config = useRuntimeConfig()
    const baseURL = config.public.apiBase

    try {
      const result = await $fetch<ChangePasswordResponse>(`${baseURL}/auth/change-password`, {
        method: 'POST',
        headers: authHeaders.value,
        body: { currentPassword, newPassword }
      })

      return result
    } catch (error: unknown) {
      console.error('修改密码失败:', error)
      return {
        success: false,
        message: isFetchErrorLike(error)
          ? (error.data?.message || '修改密码失败，请重试')
          : getErrorMessage(error, '修改密码失败，请重试')
      }
    }
  }

  // 初始化认证状态（从 Cookie 恢复）
  async function initialize(): Promise<void> {
    if (!import.meta.client) return

    const cookies = _getCookies()

    const savedRole = cookies.userRole.value as string | null
    const savedAuth = cookies.isAuthenticated.value as string | null
    const savedLoginTime = cookies.loginTime.value as string | null
    const savedToken = cookies.token.value as string | null
    const savedRefreshToken = cookies.refreshToken.value as string | null
    const savedTokenExpires = cookies.tokenExpires.value as string | null

    // 恢复 Token
    if (savedToken) {
      token.value = savedToken
      refreshToken.value = savedRefreshToken
      tokenExpiresAt.value = savedTokenExpires
    }

    // 检查会话是否过期（8小时后自动退出）
    const SESSION_TIMEOUT = 8 * 60 * 60 * 1000 // 8小时，单位：毫秒
    const now = Date.now()
    const loginTime = savedLoginTime ? parseInt(savedLoginTime, 10) : 0
    const isSessionExpired = now - loginTime > SESSION_TIMEOUT

    // 检查 Token 是否过期
    const isTokenExpiredCheck = savedTokenExpires && new Date(savedTokenExpires).getTime() < now

    if ((isSessionExpired || isTokenExpiredCheck) && savedAuth === 'true') {
      // 尝试使用 RefreshToken 刷新
      if (savedRefreshToken && !isSessionExpired) {
        console.log('[Auth] Token 过期，尝试自动刷新...')
        const success = await refreshAccessToken()
        if (!success) {
          console.log('[Auth] 刷新失败，需要重新登录')
          await logout()
          return
        }
        console.log('[Auth] Token 刷新成功，状态已恢复')
      } else {
        // 会话已过期，重置为游客状态
        console.log('[Auth] 会话已过期，需要重新登录')
        await logout()
        return
      }
    }

    // 恢复认证状态
    isAuthenticated.value = savedAuth === 'true'

    // 如果之前保存的是管理员角色但没有通过认证，则重置为游客
    if (savedRole === UserRoles.ADMIN && !isAuthenticated.value) {
      userRole.value = UserRoles.GUEST
      const cookies2 = _getCookies()
      cookies2.userRole.value = UserRoles.GUEST
    }
    // 否则恢复之前保存的角色
    else if (savedRole && (Object.values(UserRoles) as string[]).includes(savedRole)) {
      userRole.value = savedRole as UserRole
    }

    // 如果已认证，启动后台定时器
    if (isAuthenticated.value && token.value) {
      console.log('[Auth] 认证状态已恢复，启动后台定时器')
      startTokenRefreshTimer()
    }
  }

  return {
    userRole,
    isAuthenticated,
    loginAttempts,
    lockoutUntil,
    token,
    refreshToken,
    tokenExpiresAt,
    tokenRefreshTimer,

    isAdmin,
    isGuest,
    isLocked,
    authHeaders,
    isTokenExpiringSoon,
    isTokenExpired,

    _getCookies,
    verifyAdminPassword,
    refreshAccessToken,
    startTokenRefreshTimer,
    stopTokenRefreshTimer,
    authFetch,
    setUserRole,
    login,
    logout,
    changePassword,
    initialize
  }
})
