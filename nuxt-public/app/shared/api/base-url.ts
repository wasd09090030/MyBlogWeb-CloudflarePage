export function resolveApiBaseURL(): string {
  const config = useRuntimeConfig()
  const apiBase = config.public.apiBase
  const apiBaseServer = String(config.apiBaseServer || '').replace(/\/$/, '')

  // 静态生成时,服务端也走远程 API
  if (import.meta.server && apiBaseServer) {
    return apiBaseServer
  }

  if (apiBase) {
    return apiBase
  }

  return 'https://backend.wasd09090030.top/api'
}
