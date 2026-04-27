# LeadScrubber

AI-powered lead scrubber and CRM pipeline. Vite + React + TypeScript SPA.

## Local development

```bash
npm ci
npm run dev          # Vite dev server, http://localhost:5173
npm run build        # tsc + vite build + predeploy sanity check
npm run preview      # serve dist/ locally
npm run check-build  # standalone sanity check on dist/index.html
```

## Deploying (Cloudflare Pages)

The site is hosted at https://lead-scrubber.pages.dev/.

Cloudflare Pages settings (Pages → project → Settings → Builds & deployments):

- **Production branch:** `main`
- **Build command:** `npm ci && npm run build`
- **Build output directory:** `dist`
- **Root directory:** `/` (repo root)
- **Node version (env var `NODE_VERSION`):** `20`

The `public/_redirects` file ships an SPA fallback (`/* /index.html 200`) so deep links don't 404.

The `build` script runs `scripts/check-build.js` after `vite build` and fails the deploy if `dist/index.html` still references `/src/*` (the un-built dev template) or is missing the hashed `/assets/index-*.js` bundle. This prevents the "blank white page" regression where Cloudflare serves the un-built source.

A GitHub Actions workflow (`.github/workflows/deploy-smoke-test.yml`) fetches the live URL after each push to `main` and on an hourly schedule, asserting the same shape on the actually-deployed HTML. If the smoke test fails, fix the CF Pages settings before merging anything else.

## Structure

```
src/                  app source (entry: src/main.tsx)
public/               static assets copied verbatim into dist/
public/_redirects     SPA fallback for Cloudflare Pages
scripts/check-build.js predeploy sanity check
.github/workflows/    CI workflows
```
