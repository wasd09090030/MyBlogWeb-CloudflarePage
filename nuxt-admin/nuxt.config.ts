import tailwindcss from '@tailwindcss/vite'

const isProduction = process.env.NODE_ENV === 'production'

export default defineNuxtConfig({
  ssr: false,
  compatibilityDate: '2026-07-25',
  devtools: { enabled: !isProduction },
  modules: ['@nuxt/ui', '@nuxt/icon', '@nuxtjs/mdc', 'nitro-cloudflare-dev'],
  ui: { prose: true },
  fonts: { provider: 'local' },
  css: ['~/assets/css/main.css'],
  vite: { plugins: [tailwindcss()] },
  icon: { serverBundle: { collections: ['lucide'] } },
  runtimeConfig: {
    public: {
      adminOrigin: process.env.NUXT_PUBLIC_ADMIN_ORIGIN || (isProduction ? 'https://wasd09090030.top' : 'http://localhost:3000')
    }
  },
  app: {
    baseURL: process.env.NUXT_APP_BASE_URL || '/admin/',
    buildAssetsDir: '_nuxt/',
    head: {
      title: 'Admin',
      titleTemplate: '%s | WyrmKk',
      meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }]
    }
  },
  routeRules: {
    '/admin/**': { headers: { 'cache-control': 'private, no-store, max-age=0' } }
  },
  nitro: { preset: 'cloudflare_module' },
  typescript: { strict: true }
})
