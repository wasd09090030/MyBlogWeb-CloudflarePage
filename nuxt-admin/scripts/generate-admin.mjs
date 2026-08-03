import { spawnSync } from 'node:child_process'

const command = process.platform === 'win32' ? 'npx.cmd' : 'npx'
const result = spawnSync(command, ['nuxt', 'generate'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: { ...process.env, NUXT_APP_BASE_URL: '/admin/' }
})
if (result.error) throw result.error
process.exitCode = result.status ?? 1
