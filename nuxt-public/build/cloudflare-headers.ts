import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

const headersContent = `
# 静态资源强缓存（1年）
/_nuxt/*
  Cache-Control: public, max-age=31536000, immutable
  X-Content-Type-Options: nosniff

/icon/*
  Cache-Control: public, max-age=31536000, immutable

/Picture/*
  Cache-Control: public, max-age=31536000, immutable

/flower/*
  Cache-Control: public, max-age=31536000, immutable

/hero/*
  Cache-Control: public, max-age=31536000, immutable

/fonts/*
  Cache-Control: public, max-age=31536000, immutable

# HTML 页面缓存（5分钟，CDN 1小时）
/*.html
  Cache-Control: public, max-age=300, s-maxage=3600
  X-Frame-Options: SAMEORIGIN
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin

# 首页特殊处理（更短缓存）
/index.html
  Cache-Control: public, max-age=60, s-maxage=300
  Link: </icon/Myfavicon.ico>; rel=preload; as=image
  Link: <https://cfimg.wasd09090030.top>; rel=preconnect; crossorigin

# 安全头（全局）
/*
  X-Frame-Options: SAMEORIGIN
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
`.trim()

/** Generate the Cloudflare Pages headers file after Nitro writes public assets. */
export function writeCloudflareHeaders(nitro: { options: { output: { publicDir: string } } }) {
  writeFileSync(join(nitro.options.output.publicDir, '_headers'), headersContent)
  console.log('✅ Generated _headers for Cloudflare Pages')
}
