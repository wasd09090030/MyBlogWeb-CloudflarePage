import type { AuthFetchLike, CfImageConfig } from '~/types/api'

export const useCfImageConfig = () => {
  const authStore = useAuthStore() as AuthFetchLike

  const getConfig = async (): Promise<CfImageConfig> => {
    try {
      return await authStore.authFetch<CfImageConfig>('/cf-image-config')
    } catch (error) {
      console.error('获取 Cloudflare 缩略图配置失败:', error)
      throw error
    }
  }

  const saveConfig = async (configData: CfImageConfig): Promise<CfImageConfig> => {
    try {
      return await authStore.authFetch<CfImageConfig>('/cf-image-config', {
        method: 'POST',
        body: configData
      })
    } catch (error) {
      console.error('保存 Cloudflare 缩略图配置失败:', error)
      throw error
    }
  }

  return {
    getConfig,
    saveConfig
  }
}
