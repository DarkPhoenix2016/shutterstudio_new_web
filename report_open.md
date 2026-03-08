# ShutterStudio Codebase Audit Report (Open Items)

Generated: 2026-03-07
Repository: `F:\ShutterStudio\shutterstudio_new_web`
Scope reviewed: `app/`, `components/`, `context/`, `hooks/`, `lib/`, `services/`, and root config/package files

## Executive Summary

The codebase has solid feature depth but is currently blocked by reliability gaps in the quality gate and build path. The highest-priority work is to restore deterministic lint/build checks, remove routing regressions, and tighten type and API boundaries.

Most critical items are directly reproducible now:
- `npm run lint` fails because `eslint` is not installed.
- `npm run build` fails because `html2canvas` import cannot be resolved.
- Type checking reports active errors in production code (`app/` and `components/`).
- Legacy `/dashboard` routes remain in active layouts/components although the app structure uses `/app/*` and `/admin/*`.

## Analysis Snapshot

- Source files reviewed (`.ts/.tsx/.js` in core dirs): **149**
- `"use client"` directives: **105**
- `any` occurrences (`app/components/context/hooks/lib/services`): **115**
- `console.*` occurrences (`app/components/context/hooks/lib/services`): **127**
- Legacy backup files (`*.old`): **2**

Largest files (maintainability hotspots):
- `app/app/events/[id]/page.tsx` (~127 KB)
- `app/admin/settings/page.tsx` (~61 KB)
- `app/app/consultation/page.tsx` (~58 KB)
- `app/public/event/[id]/page.tsx` (~56 KB)
- `app/app/tasks/page.tsx` (~47 KB)

## P0 - Must Implement Immediately

### 1) Restore lint pipeline
- Evidence:
  - `npm run lint` -> `eslint is not recognized`
  - `package.json` has `"lint": "eslint ."` but no `eslint` in `devDependencies`
  - No ESLint config file found (`eslint.config.*` / `.eslintrc*`)
- Impact: no static gate for regressions.
- Implement:
  - Add `eslint` and `eslint-config-next` dev dependencies.
  - Add ESLint config (`eslint.config.mjs` or `.eslintrc`) aligned with Next.js + TS strict.
  - Add lint to CI gate before build.

### 2) Fix production build blocker (`html2canvas` mismatch)
- Evidence:
  - `components/admin/InvoiceDialog.tsx:24` imports `html2canvas` from `"html2canvas"`
  - `package.json` installs `"@html2canvas/html2canvas"` (not `html2canvas`)
  - `npm run build` fails with module resolution error.
- Impact: production build fails.
- Implement:
  - Standardize to one package/import pair:
    - either install `html2canvas`, or
    - update import and usage to match `@html2canvas/html2canvas`.
  - Re-run build until clean.

### 3) Remove type-check bypass in Next config
- Evidence:
  - `next.config.mjs:4` -> `typescript.ignoreBuildErrors: true`
- Impact: type errors can ship to production.
- Implement:
  - Set `ignoreBuildErrors` to `false` (or remove `typescript` override).
  - Make `npx tsc --noEmit` pass before enabling strict gate.

### 4) Fix current TypeScript errors in active app code
- Evidence from `npx tsc --noEmit`:
  - `app/app/events/[id]/page.tsx(780,142)` unsafe cast around `EventApproval`
  - `components/admin/InvoiceDialog.tsx(24,25)` missing module
  - `components/admin/InvoiceDialog.tsx(104,17)` implicit `any` (`clonedDoc`)
  - `components/admin/InvoiceDialog.tsx(106,30)` implicit `any` (`el`)
  - `components/login-modal.tsx(31,52)` `setCurrentUser` missing from Zustand `AppState`
- Impact: strict TS cannot be trusted; runtime mismatch risk.
- Implement:
  - Resolve all listed errors.
  - Add type-safe interfaces for invoice rendering and event approval shape.
  - Remove or rewrite obsolete login modal store usage.

### 5) Fix broken legacy route targets (`/dashboard*`)
- Evidence:
  - `app/admin/layout.tsx:31` -> `router.push("/dashboard")`
  - `components/login-modal.tsx:117` -> `router.push("/dashboard")`
  - `components/landing/footer.tsx:32` -> `/dashboard/login`
  - `app/about/page.tsx:182` -> `/dashboard/login`
- Impact: user-facing navigation errors and bad redirects.
- Implement:
  - Replace with canonical routes (`/app`, `/app/login`, `/admin`) as intended by current route tree.
  - Add route smoke test checklist for public + auth + admin entry points.

## P1 - High Priority

### 6) Eliminate duplicate hook implementations
- Evidence:
  - `hooks/use-toast.ts` and `components/ui/use-toast.ts` are duplicate.
  - `hooks/use-mobile.ts` and `components/ui/use-mobile.tsx` are duplicate.
- Impact: drift risk and import inconsistency.
- Implement:
  - Keep one canonical file per hook.
  - Update all imports to canonical path; remove duplicate files.

### 7) Harden API route contract (`contact` endpoint)
- Evidence:
  - `app/api/contact/route.js` uses plain JS in TS-first strict repo.
  - Only basic presence checks; no schema validation, rate limiting, or input length checks.
- Impact: abuse/spam and malformed payload risk.
- Implement:
  - Convert to `app/api/contact/route.ts`.
  - Add Zod schema validation (email format, max lengths, required fields).
  - Add rate limiting/throttling and stable error envelope.

### 8) Reduce auth/profile fetch duplication and side effects
- Evidence:
  - `context/AuthContext.tsx`: login flow calls profile+permissions fetch, and `onAuthStateChanged` repeats similar reads.
- Impact: extra Firestore reads and auth flow complexity.
- Implement:
  - Consolidate post-login hydration path.
  - Keep one authoritative path for loading profile/permissions/settings.

### 9) Centralize Cloud Function endpoint config
- Evidence:
  - `services/crew-service.ts` has API URL config with env + hardcoded fallback.
  - `app/admin/directory/page.tsx` hardcodes endpoints directly.
  - `app/admin/profile/page.tsx` hardcodes `registeradmin` URL inline.
- Impact: configuration drift and environment mismatch.
- Implement:
  - Create one endpoint config module (e.g., `lib/endpoints.ts`).
  - Import from there in all services/pages.
  - Keep hardcoded fallback only in one place.

### 10) Resolve external font build fragility
- Evidence:
  - `app/layout.tsx` uses `next/font/google` (`Geist`, `Geist_Mono`)
  - Build logs fail to fetch Google Fonts under restricted/offline environments.
- Impact: builds fail in network-restricted CI or offline development.
- Implement:
  - Move to local font hosting (`next/font/local`) or ensure CI egress allowlist.
  - Document environment requirement if keeping Google-hosted fetch.

## P2 - Medium Priority

### 11) Reduce `any` usage across core workflows
- Evidence: 115 `any` matches across active folders.
- Hotspots:
  - `app/app/tasks/page.tsx`
  - `services/event-service.ts`
  - `services/task-service.ts`
  - `app/admin/*` and event pages
- Impact: weak type contracts and higher regression risk.
- Implement:
  - Define shared domain models for event/task/invoice payloads.
  - Replace `Record<string, any>`, `as any`, and implicit-any callbacks incrementally.

### 12) Decompose monolithic pages
- Evidence: multiple page files are 45KB-127KB.
- Impact: high cognitive load, harder reviews, brittle changes.
- Implement:
  - Split into feature components + hooks + service adapters.
  - Keep pages orchestration-focused, move data transforms to `services/` or `lib/`.

### 13) Rationalize client/server component boundaries
- Evidence: 105 `"use client"` files.
- Impact: larger bundles and reduced App Router SSR benefit.
- Implement:
  - Convert read-heavy/static sections to server components.
  - Keep client components only where hooks/browser APIs are needed.

### 14) Dependency and lockfile hygiene
- Evidence:
  - `package.json` uses `"latest"` for `immer` and `use-sync-external-store`.
  - Both `package-lock.json` and `pnpm-lock.yaml` exist.
- Impact: non-deterministic installs and toolchain ambiguity.
- Implement:
  - Pin exact versions for floating dependencies.
  - Choose one package manager and remove the other lockfile.

### 15) Archive or remove obsolete artifacts
- Evidence:
  - `app/app/events/[id]/page.tsx.old`
  - `app/public/event/[id]/page.tsx.old`
  - `temp/*`, `planing/*` remain in repo.
- Impact: repository noise and confusion during maintenance.
- Implement:
  - Move old files to an archival location outside production tree or delete if no longer needed.
  - Document retention policy for temporary/backup files.

## Suggested Implementation Sequence

1. Re-establish deterministic quality gate: ESLint install/config + TS check + build reliability.
2. Clear build/type blockers: `html2canvas`, current TS errors, remove type bypass.
3. Fix routing regressions (`/dashboard*` to canonical routes).
4. Consolidate duplicate hooks and endpoint config.
5. Harden API contracts and auth hydration flow.
6. Start structured refactor for largest page files and high-`any` modules.

## Validation Checklist After Implementation

- `npm run lint` passes.
- `npx tsc --noEmit` passes.
- `npm run build` passes without `ignoreBuildErrors`.
- Route smoke tests pass:
  - `/`
  - `/app/login`
  - `/app`
  - `/admin/login`
  - `/admin`
  - `/about`
  - `/contact`
- Auth smoke tests pass for:
  - standard studio user
  - super admin
  - unauthorized route handling

## Notes

- This report is based on static analysis and command verification in the current workspace.
- No automated unit/integration test suite exists yet in `package.json`; recommendations prioritize adding reliable static gates first.
