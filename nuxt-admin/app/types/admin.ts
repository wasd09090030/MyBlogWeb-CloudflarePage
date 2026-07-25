export type Article = { id: number; title: string; slug?: string; content?: string; contentMarkdown?: string; category?: string; tags?: string[]; coverImage?: string; aiSummary?: string; createdAt?: string; updatedAt?: string }
export type Comment = { id: number; articleId: number; author?: string; content?: string; status?: string; createdAt?: string }
export type GalleryItem = { id: number; imageUrl: string; tag?: string; isActive?: boolean; sortOrder?: number; imageWidth?: number; imageHeight?: number }
export type ImagebedConfig = { domain: string; apiToken: string; uploadFolder?: string }
export type AuthResponse = { success: boolean; message?: string; token?: string; refreshToken?: string; expiresAt?: string }
