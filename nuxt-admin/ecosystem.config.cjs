module.exports = {
  apps: [{
    name: 'nuxt-admin',
    script: './server/index.mjs',
    cwd: '/www/wwwroot/NuxtAdmin',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    max_memory_restart: '512M',
    env: {
      NODE_ENV: 'production',
      NUXT_API_BASE_URL: 'http://127.0.0.1:5000/api',
      NUXT_PUBLIC_ADMIN_ORIGIN: 'https://wasd09090030.top',
      PORT: 3000,
      HOST: '127.0.0.1'
    }
  }]
}
