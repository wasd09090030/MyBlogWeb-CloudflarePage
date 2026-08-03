/// <reference types="@cloudflare/workers-types" />

import type { CfProperties } from 'h3'

declare global {
  interface BlogCloudflareEnv {
    BLOG_DB: D1Database
    ADMIN_ORIGIN?: string
    PUBLIC_SITE_ORIGIN?: string
    PUBLIC_ASSET_ORIGIN?: string
    IMAGE_API_BASE_URL?: string
    IMAGE_API_TOKEN?: string
    DEFAULT_UPLOAD_FOLDER?: string
    PAGES_PROJECT_NAME?: string
    DEEPSEEK_API_KEY?: string
    DEEPSEEK_API_URL?: string
    DEEPSEEK_MODEL?: string
    CLOUDFLARE_API_TOKEN?: string
    CLOUDFLARE_ACCOUNT_ID?: string
    PAGES_DEPLOY_HOOK_URL?: string
    SESSION_PEPPER?: string
    SESSION_TTL_SECONDS?: string | number
    ADMIN_RESET_TOKEN?: string
    ADMIN_RATE_LIMIT?: KVNamespace
  }

  interface CloudflareEnv extends BlogCloudflareEnv {}
}

declare module 'h3' {
  interface H3EventContext {
    cf?: CfProperties
    cloudflare?: {
      request: Request
      env: BlogCloudflareEnv
      context: ExecutionContext
    }
  }
}

export {}
