# Image Assets Images Binding Migration Plan

> **For agentic workers:** This plan adapts the historical permanent-thumbnail design to the current D1 + Nuxt/Nitro Worker architecture.

**Goal:** Replace the current thumbnail redirect with a real, fixed Cloudflare Images transformation while keeping the existing permanent `/images/thumb/{publicId}.webp` URLs.

**Architecture:** `blog-api` resolves the opaque public id from D1, fetches only the validated `cfimg.wasd09090030.top` source, and uses the Images binding to resize and encode one fixed WebP variant. The public URL stays unchanged, so the static Pages artifact needs no regeneration. The retired .NET API and the separate `blog-router` Worker are outside this change.

**Free-plan budget:** Cloudflare Images Free includes 5,000 unique transformations per calendar month for external/R2-backed images. The current active registry contains 361 assets (19 article covers and 342 gallery assets). A single fixed transformation per asset therefore stays below the monthly allowance; repeat requests for the same source and parameters count once per month. If the allowance is exhausted, new transformations fail closed with an explicit service error and are not charged.

**Implementation:**

- Add `[images] binding = "IMAGES"` and `[cache] enabled = true` to `nuxt-admin/wrangler.toml`.
- Add `IMAGES?: ImagesBinding` to the existing Worker environment declaration.
- Update `nuxt-admin/server/routes/images/[...path].get.ts` so only valid thumbnail paths use `env.IMAGES`; ordinary `/images/{publicId}` requests retain the existing redirect behavior.
- Fetch the already-normalized asset URL, follow redirects only when the final host remains the configured provider host, reject non-image and over-20 MB sources, apply `{ width: 640, fit: 'scale-down' }`, and output `{ format: 'image/webp', quality: 72 }`.
- Return long-lived immutable cache headers and map Cloudflare quota errors to a non-leaking 503 response.
- Add a Node contract check plus build/type/deploy smoke verification.

**Rollback:** Remove the Images binding and deploy the previous Worker version. The stable URL and D1 metadata remain compatible with the existing redirect implementation.
