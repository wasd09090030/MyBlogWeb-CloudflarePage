// Deprecated. nuxt-admin is deployed with Wrangler as the blog-admin Worker.
// Keep this file only so older deployment tooling fails closed instead of
// accidentally starting a process that still expects the removed .NET API.
module.exports = { apps: [] }
