## 1. Planning and Scope Alignment

- [x] 1.1 Approve the Free-plan static SPA/Admin Pages/blog-api architecture and record the design.
- [x] 1.2 Replace old Paid/SSR/Admin-R2/Beatmap assumptions in proposal, design, specs, and tasks.
- [x] 1.3 Validate the revised OpenSpec artifacts before code changes.

## 2. Static Admin and API Worker Build

- [ ] 2.1 Configure `nuxt-admin` as `ssr: false` with `/admin/` base and isolated SPA assets.
- [ ] 2.2 Add separate generate/API build scripts and Pages deployment commands.
- [ ] 2.3 Make Admin API calls and route guards browser-safe for SPA execution.
- [ ] 2.4 Reconfigure Wrangler as Free `blog-api` with D1 only and no R2/Paid CPU limit.
- [ ] 2.5 Remove active runtime dependence on R2 bindings and keep Beatmap paths explicitly retired.

## 3. External Image-Host Integration

- [ ] 3.1 Add a typed image-host API adapter for upload, list, delete, and config operations.
- [ ] 3.2 Move provider authentication to Worker variables/secrets and remove token handling from the SPA/D1.
- [ ] 3.3 Synchronize image metadata after external operations and preserve public URL contracts.
- [ ] 3.4 Replace `/images/*` object reads with safe metadata redirects and remove R2 dimension reads.

## 4. D1 Schema and Data Import

- [ ] 4.1 Add a cleanup migration removing Beatmap and `cf_image_configs` tables.
- [ ] 4.2 Narrow SQLite export/import/verification to active blog/admin tables and metadata.
- [ ] 4.3 Verify local migrations, foreign keys, IDs, slugs, image references, and checksums.

## 5. Router and Release Automation

- [ ] 5.1 Route API/media paths to `BLOG_API` and static Admin paths to Admin Pages with SPA fallback.
- [ ] 5.2 Add focused router contract tests.
- [ ] 5.3 Update GitHub Actions to deploy D1, API Worker, Admin Pages, router, then Public Pages.

## 6. Verification and Documentation

- [ ] 6.1 Add Free configuration and image API contract checks.
- [ ] 6.2 Update environment, deployment, cutover, rollback, and smoke-test documentation.
- [ ] 6.3 Run typecheck, static generate, API build, local D1 import/verify, router tests, and local Worker smoke tests.
- [ ] 6.4 Run a real Free-plan PBKDF2 canary; do not silently reduce password iterations.

## 7. Production Cutover (Environment-Bound)

- [ ] 7.1 Create/stage production D1, import the final SQLite snapshot, and validate image-host metadata.
- [ ] 7.2 Set Worker secrets, reset the administrator, and verify session lifecycle.
- [ ] 7.3 Deploy Admin Pages, `blog-api`, router, and Public Pages through the real account.
- [ ] 7.4 Run public/Admin/image-host smoke tests and retain .NET as read-only during observation.
- [ ] 7.5 Record rollback/retirement decision without deleting legacy source in this change.
