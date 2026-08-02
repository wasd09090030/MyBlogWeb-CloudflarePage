# Cloudflare Architecture

```text
wasd09090030.top / www.wasd09090030.top
  |
  +-- blog-router Worker
        |
        +-- /, /article/*, /gallery, /tutorials, /about
        |     -> Cloudflare Pages (nuxt-public/)
        |
        +-- /admin/*, /api/*, /images/*, /_ssr/*
              -> Service Binding: blog-admin Worker (nuxt-admin/)
                    +-- D1: blog-db
                    +-- R2: blog media bucket
```

## Responsibilities

`nuxt-public/` is a static Nuxt 4 site deployed to Pages. `nuxt-admin/` is the only active `/admin/*` application and runs as a Nuxt 4 SSR Worker using Nuxt UI v4. Its server routes call D1 and R2 directly; the browser only sees same-origin BFF endpoints and opaque session cookies.

`backend-dotnet/BlogApi/` and the old `nuxt/` project remain in the repository as read-only migration and rollback references. They are not required by the production request path and must not receive new features in this change.

## Routing and assets

- `blog-router` uses path-boundary matching for `/admin`, `/api`, `/images`, and `/_ssr`.
- The router forwards those paths through the `BLOG_ADMIN` Service Binding and sends all other paths to Pages.
- Pages uses `/_nuxt/`; the admin Worker uses `/_ssr/`.
- Admin pages, sessions, and mutations are private/no-store. Public media URLs are served by the Worker with stable cache headers.
- Cross-project navigation uses normal `<a>` links; same-project navigation uses `NuxtLink`.

## Data and operations

| Concern | Runtime owner | Storage/credential boundary |
| --- | --- | --- |
| Articles, comments, likes, gallery, auth sessions | `blog-admin` Worker | D1 `BLOG_DB` |
| Image upload/list/delete and stable image URLs | `blog-admin` Worker | R2 `BLOG_MEDIA` |
| AI summaries | `blog-admin` Worker | `DEEPSEEK_API_KEY` secret |
| Pages rebuild trigger | `blog-admin` Worker | Deploy Hook or scoped Cloudflare token |
| Static public site | Cloudflare Pages | Build-time deployed `/api` URL |

GitHub Actions publishes in order: D1 migrations, `blog-admin`, `blog-router`, then the Pages artifact. This prevents the router from pointing at an un-migrated Worker and keeps SSG data reads on the deployed API.
