# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a personal blog built on the **Retypeset** Astro theme (upstream: `https://github.com/radishzzz/astro-theme-retypeset`). The user pulls upstream updates via `pnpm update-theme` (which merges from a `upstream` git remote), so prefer minimal/surgical edits to theme files — large refactors will create merge conflicts on theme updates.

Package manager is **pnpm** (pinned to `pnpm@10.33.0`). Use `pnpm`, not `npm` or `yarn`.

## Common Commands

```bash
pnpm dev              # astro check + dev server
pnpm build            # astro check + astro build + apply LQIP placeholders
pnpm preview          # preview production build
pnpm lint             # eslint .
pnpm lint:fix         # eslint . --fix
pnpm new-post <title> # scaffold src/content/posts/<title>.md with frontmatter
pnpm format-posts     # autocorrect CJK spacing/punctuation in src/content/**/*.{md,mdx}
pnpm apply-lqip       # generate low-quality image placeholders (run by `build`)
pnpm update-theme     # git fetch upstream && git merge upstream/master
```

A `pre-commit` git hook (simple-git-hooks + lint-staged) runs `eslint --fix` on staged `*.{js,mjs,ts,astro}`.

## Architecture

### Configuration is split across three files

- **`src/config.ts`** — `themeConfig` object: site metadata, color tokens (light/dark, OKLCH), default locale + `moreLocales`, comment provider settings (giscus/twikoo/waline), SEO/analytics, footer links, image-host/preload. **This is the file the user edits to customize the blog.** It also exports derived constants (`base`, `defaultLocale`, `moreLocales`, `allLocales`) that other files import.
- **`astro.config.ts`** — wires Astro integrations (MDX, partytown, sitemap, compress, UnoCSS), the i18n locale list (built from `src/i18n/config.ts` `langMap`), and the full remark/rehype plugin pipeline (custom plugins live in `src/plugins/`).
- **`uno.config.ts`** — UnoCSS preset, light/dark theme via `unocss-preset-theme`, custom font stacks (Snell, EarlySummer, STIX), and a custom `cjk:` variant that scopes utilities to `:lang(zh|ja|ko)`.

Color tokens defined in `themeConfig.color.{light,dark}` flow into UnoCSS, so `bg-background`, `text-primary`, `text-secondary`, `bg-highlight`, etc. are theme-aware.

### Content collections

`src/content.config.ts` defines two collections, both loaded with `glob({ pattern: '**/*.{md,mdx}', base: ... })`:

- **`posts`** (`src/content/posts/`) — required `title` + `published` (Date); optional `description`, `updated`, `tags[]`, `draft`, `pin` (0–99), `toc`, `lang` (must be one of `allLocales`), `abbrlink` (lowercase/digits/hyphens; overrides slug).
- **`about`** (`src/content/about/`) — one file per locale, e.g. `about-en.md`, `about-zh-tw.md`.

Posts can be **universal** (no `lang` field — shown in all locales) or **locale-specific** (`lang: 'en'`, etc.). The same post translated into multiple languages should share an `abbrlink` so URLs align across locales. `pnpm new-post` scaffolds with empty `lang`/`abbrlink`.

### i18n & routing

- All localized routes live under `src/pages/[...lang]/` (`index.astro`, `about.astro`, `posts/[slug].astro`, `tags/[tag].astro`, `tags/index.astro`, `atom.xml.ts`, `rss.xml.ts`). The default locale renders at `/`; other locales render at `/<lang>/...`.
- `src/i18n/config.ts` defines `langMap` (the source of truth for supported locales) plus per-provider locale maps for Giscus / Twikoo / Waline.
- `src/i18n/ui.ts` holds UI strings (used when `themeConfig.site.i18nTitle === true`); `src/i18n/lang.ts` and `path.ts` handle language helpers and URL rewriting.
- `trailingSlash: 'always'` is set in `astro.config.ts` — do not change it; many internal URL builders assume it.

### Custom markdown pipeline

Remark plugins (in `src/plugins/`):
- `remark-container-directives.mjs` — `:::note / :::tip / :::important / :::warning / :::caution` GitHub-style admonitions (colors come from `uno.config.ts`).
- `remark-leaf-directives.mjs` — inline directives (e.g. `::github`, `::video`) backed by widgets in `src/components/Widgets/`.
- `remark-reading-time.mjs` — injects `minutes` into `remarkPluginFrontmatter` (read by `src/utils/content.ts` and surfaced on post pages).

Rehype plugins: `rehype-katex`, `rehype-mermaid` (`pre-mermaid` strategy), `rehype-slug`, then the customs `rehype-heading-anchor`, `rehype-image-processor` (works with `astro-compress` + LQIP), `rehype-external-links`, `rehype-code-copy-button`. Shiki is configured with `github-light` / `github-dark` themes.

### Layout & components

- `src/layouts/Layout.astro` — the only top-level page wrapper. Loads all global stylesheets from `src/styles/` and mounts site-wide widgets (`SoundEffect`, `CodeCopyButton`, `GithubCard`, `MediaEmbed`, `ImageZoom`) once per page.
- `src/components/Comment/Index.astro` dispatches to Giscus / Twikoo / Waline based on `themeConfig.comment`.
- `src/components/Widgets/` are mounted once in `Layout.astro` and triggered by markdown directives via the remark plugins above — when adding a new directive, you typically (1) extend a remark plugin, (2) add a widget, (3) mount it in `Layout.astro`.

### Path alias

`@/*` → `src/*` (defined in `tsconfig.json`). Always import internal modules with `@/...`.

### Build extras

- `astro.config.ts` registers a Vite plugin `prefix-font-urls-with-base` that rewrites `url(/fonts/...)` in `src/styles/font.css` to include `themeConfig.site.base` — required when deploying under a sub-path.
- `pnpm build` chains `astro build` then `pnpm apply-lqip`, which post-processes `dist/` HTML and writes `src/assets/lqip-map.json`. If you run `astro build` directly, LQIPs will be missing.
- `patches/@qwik.dev__partytown@0.11.2.patch` is applied via pnpm `patchedDependencies` — leave it in place; it suppresses deprecation warnings.

## Editing conventions

- ESLint config is `@antfu/eslint-config` with `typescript`, `astro`, `unocss` enabled. `src/content/**` is ignored. `e18e/prefer-static-regex` is disabled.
- `src/content/posts/` files written by users (including post bodies) are not linted — only their frontmatter is validated by Zod at build time.
- Theme colors must be valid OKLCH; the comments in `src/config.ts` link to https://oklch.com/.
