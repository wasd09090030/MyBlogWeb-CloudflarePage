import { createApiClient } from '~/shared/api/client'

export const createArticleDetailRepository = () => {
  const getArticleById = async (id: string | number): Promise<Record<string, unknown> | null> => {
    const client = createApiClient()
    return await client.get<Record<string, unknown>>(`/articles/${id}`)
  }

  return {
    getArticleById
  }
}