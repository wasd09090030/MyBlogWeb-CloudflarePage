# Spec: Icon System (nuxt-public)

## ADDED Requirements

### Requirement: All `<Icon>` usages use Iconify `collection:icon` format
Every `<Icon>` template usage in `nuxt-public/app/` SHALL pass a `name` prop matching the Iconify `collection:icon` format (e.g. `heroicons:home`, `mdi:github`). Bare short names without a collection prefix SHALL NOT be used. Existing `collection:icon` usages (e.g. `mdi:magnify` in `Effects/SearchBar.vue`) already conform and are not changed by name.

#### Scenario: A template uses a prefixed icon name
- **WHEN** a developer inspects any `<Icon name="..." />` in `nuxt-public/app/**`
- **THEN** the value is of the form `<collection>:<icon>` where the collection is registered in `nuxt.config.ts` `icon.serverBundle.collections`

#### Scenario: A template no longer uses a bare short name
- **WHEN** a verification script greps `nuxt-public/app/**` for `<Icon name="[a-z][a-z0-9-]*"` patterns (no colon)
- **THEN** the script finds zero matches except the empty case

### Requirement: `app.config.ts` does not maintain icon aliases
The `nuxt-public/app/app.config.ts` file SHALL NOT define an `icon.aliases` object. The file MAY keep `icon.size` and `icon.class` default values, but no name-translation map of any kind.

#### Scenario: The aliases block is absent
- **WHEN** a developer inspects `nuxt-public/app/app.config.ts`
- **THEN** the `icon.aliases` key is not present

#### Scenario: A new icon does not require updating the config
- **WHEN** a developer adds a new `<Icon name="some-collection:some-icon" />` to a template
- **THEN** no edit to `app.config.ts` is required for the icon to render

### Requirement: Iconify collections used by the project are registered for build
The `nuxt.config.ts` `icon.serverBundle.collections` array SHALL list every collection referenced in templates. The project uses only `heroicons` and `mdi`; both packages (`@iconify-json/heroicons`, `@iconify-json/mdi`) MUST remain in `package.json` devDependencies so icons resolve locally without a CDN fetch.

#### Scenario: A used collection is registered
- **WHEN** a developer greps templates for `<Icon name="<collection>:` patterns
- **THEN** every distinct `<collection>` found is also present in `icon.serverBundle.collections`

#### Scenario: Collections are installed locally
- **WHEN** a developer runs `npm install` in `nuxt-public/`
- **THEN** `@iconify-json/heroicons` and `@iconify-json/mdi` are present in `node_modules` and listed in `package.json` devDependencies

### Requirement: A script verifies no short-name icons remain
A Node script at `nuxt-public/scripts/check-icon-names.mjs` SHALL exist and be invokable through `npm run lint:icons`. The script SHALL scan all `*.vue` files under `nuxt-public/app/`, extract every `<Icon name="..." />` value, and fail (non-zero exit) if any value is a bare short name lacking a `:` separator.

#### Scenario: Script catches an unprefixed icon
- **WHEN** a developer adds `<Icon name="github" />` to a template
- **THEN** `npm run lint:icons` reports the file, line, and offending value, and exits non-zero

#### Scenario: Script passes on a clean tree
- **WHEN** a developer runs `npm run lint:icons` on a tree where every `<Icon name>` is a `collection:icon`
- **THEN** the script exits zero and reports "no short-name icons found"

### Requirement: Migration preserves the existing icon visual identity
The migration from the aliases table to direct `collection:icon` names MUST keep the rendered icon glyph unchanged wherever the original alias was a 1:1 rename. For icons that were being intentionally remapped to a generic heroicons shape under the aliases table (e.g. `mdi:github` was forced to `heroicons:code-bracket`), the migration MUST pick an Iconify icon that preserves the *intent* of the original — typically the actual brand/glyph icon. Replacements:

| Original short name | Final icon |
|---|---|
| `github` | `mdi:github` |
| `controller` | `mdi:gamepad-variant` |
| `robot` | `mdi:robot` |
| `film` | `mdi:film` |

#### Scenario: About-page GitHub link uses the real GitHub logo
- **WHEN** a user opens `pages/about.vue` and views the GitHub link
- **THEN** the rendered icon is the MDI GitHub logo glyph, not a generic bracket

#### Scenario: Article Header "AI" marker uses the robot glyph
- **WHEN** a user views an article whose `aiGenerated` flag is true
- **THEN** the rendered marker icon in `Header.vue` is the MDI robot glyph, not a CPU chip

#### Scenario: WebEmbed placeholder uses the film glyph
- **WHEN** a user views a `content/WebEmbed.vue` instance in its empty/loading state
- **THEN** the rendered icon is the MDI film glyph (and resolves without relying on Iconify CDN fallback)
