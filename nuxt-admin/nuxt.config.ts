import tailwindcss from '@tailwindcss/vite'

const isProduction = process.env.NODE_ENV === 'production'

export default defineNuxtConfig({
  compatibilityDate: '2026-07-25',
  devtools: { enabled: !isProduction },
  modules: ['@nuxt/ui', '@nuxt/icon', '@nuxtjs/mdc'],
  ui: { prose: true },
  fonts: { provider: 'local' },
  css: ['~/assets/css/main.css'],
  vite: { plugins: [tailwindcss()] },
  icon: { serverBundle: { collections: ['lucide'] } },
  runtimeConfig: {
    apiBaseServer: process.env.NUXT_API_BASE_URL || 'http://127.0.0.1:5000/api',
    public: {
      adminOrigin: process.env.NUXT_PUBLIC_ADMIN_ORIGIN || (isProduction ? 'https://wasd09090030.top' : 'http://localhost:3000')
    }
  },
  app: {
    buildAssetsDir: '/_ssr/',
    head: {
      title: 'Admin',
      titleTemplate: '%s | WyrmKk',
      meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }]
    }
  },
  routeRules: {
    '/admin/**': { headers: { 'cache-control': 'private, no-store, max-age=0' } },
    '/_ssr/**': { headers: { 'cache-control': 'public, max-age=31536000, immutable' } }
  },
  nitro: { preset: 'node-server' },
  typescript: { strict: true }
})
