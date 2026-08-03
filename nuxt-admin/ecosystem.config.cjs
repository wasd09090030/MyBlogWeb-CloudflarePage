// Deprecated. nuxt-admin is a static Pages SPA; its dynamic API is the
// Free-plan blog-api Worker and is deployed with Wrangler, not PM2.
// Keep this empty config so legacy tooling fails closed instead of starting
// a removed SSR process or expecting the retired .NET API.
module.exports = { apps: [] }
