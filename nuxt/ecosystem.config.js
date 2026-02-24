module.exports = {
  apps: [{
    name: 'nuxt-app',
    script: './server/index.mjs',
    cwd: '/www/wwwroot/Nuxt',
    
    // 实例配置
    instances: 1,
    exec_mode: 'cluster',
    
    // 自动重启
    autorestart: true,
    watch: false,
    max_memory_restart: '512M',  // 降低到 512M，为系统和 .NET 留出空间
    
    // Node.js 内存限制（1G 服务器建议限制堆内存）
    node_args: '--max-old-space-size=384',
    
    // 环境变量
    env: {
      NODE_ENV: 'production',
      NUXT_API_BASE_URL: 'http://127.0.0.1:5000/api',
      NUXT_PUBLIC_API_BASE_URL: 'https://blog.wasd09090030.top/api',
      NUXT_PUBLIC_SITE_URL: 'https://blog.wasd09090030.top',
      PORT: 3000,
      HOST: '0.0.0.0'
    },
    
    // 日志配置
    error_file: '/www/wwwlogs/nuxt-app-error.log',
    out_file: '/www/wwwlogs/nuxt-app.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    
    // 其他配置
    max_restarts: 10,
    min_uptime: '10s',
    listen_timeout: 3000,
    kill_timeout: 5000
  }]
}

