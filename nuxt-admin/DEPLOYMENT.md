# Nuxt Admin Deployment

Required environment variables:

- `NUXT_API_BASE_URL=http://127.0.0.1:5000/api`
- `NUXT_PUBLIC_ADMIN_ORIGIN=https://wasd09090030.top`

Deploy the `.output` contents to `/www/wwwroot/NuxtAdmin`, then start `ecosystem.config.cjs` with PM2. Nginx keeps proxying `/admin/*` to port `3000`, serves `/_ssr/*` from the new output public directory, and must bypass caches for `/admin/*`.

Smoke test through the public domain: `/admin/login`, an authenticated deep link, `/admin/api/auth/session`, an article mutation, and a hashed `/_ssr/` asset. Roll back by restoring the prior `nuxt` release directory and PM2 process target; no data migration is involved.
