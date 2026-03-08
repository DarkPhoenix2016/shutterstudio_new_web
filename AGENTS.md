# AGENTS.md

## Purpose
This file guides autonomous coding agents operating in this repository.
Follow these conventions by default unless the user gives explicit, higher-priority instructions.

## Project Snapshot
- App: `shutterstudio`
- Framework: Next.js App Router + React 19 + TypeScript
- Styling: Tailwind CSS 4 + shadcn-style component primitives
- Data/Auth: Firebase (Auth, Firestore, Storage)
- State + shared app logic: React Context and shared lib modules
- Package scripts are npm-based (`package-lock.json` present)

## Directory Map
- `app/`: Route tree, layouts, and API handlers
  - `app/app/*`: authenticated studio dashboard
  - `app/admin/*`: admin area
  - `app/api/*`: route handlers
- `components/`: reusable UI/feature components
  - `components/ui/*`: primitive building blocks
- `services/`: business/data access logic; Firestore operations belong here
- `context/`: providers (notably auth/session context)
- `hooks/`: reusable hooks
- `lib/`: shared utilities (`firebase`, `logger`, `store`, etc.)
- `public/`: static assets
- `styles/`: global/shared styles
- `temp/`, `planing/`: scratch/WIP content; avoid placing production logic here

## Build, Lint, Dev, and Test Commands

### Install
- `npm install`

### Dev Server
- `npm run dev`
  - Runs `next dev --turbo`

### Lint
- `npm run lint`
  - Runs `eslint .`

### Build
- `npm run build`

### Start Production Build Locally
- `npm run start`

### CI/PR Quality Gate (current standard)
- `npm run lint && npm run build`

## Testing Status and Single-Test Guidance
- There is currently no dedicated test runner configured in `package.json`.
- No first-party test scripts (`test`, `test:watch`, etc.) exist right now.
- As a result, a true “run single test” command is not yet available.

Use these practical substitutes:
- Lint entire repo: `npm run lint`
- Lint a single file: `npx eslint path/to/file.tsx`
- Manual verification: run `npm run dev` and test changed flows in browser

If a runner is added later (Jest/Vitest/Playwright), update this section with:
- full suite command
- watch command
- single-file command
- single-test-by-name command

## TypeScript and Typing Rules
- Keep TypeScript-first code; repo is `strict: true`.
- Prefer `interface`/`type` for public contracts (service inputs/outputs, context values).
- Avoid `any`; if unavoidable, keep scope narrow and add a cleanup note.
- Use `Partial<T>`, unions, and discriminated shapes instead of broad weak types.
- Convert Firestore timestamp objects at service boundaries before UI usage.
- Keep route/component props strongly typed.

## Imports and Dependency Hygiene
- Prefer alias imports via `@/*` for internal modules.
- Keep imports grouped in this order:
  1) framework (`react`, `next/*`)
  2) third-party packages
  3) internal alias imports (`@/...`)
  4) relative imports
- Remove unused imports and dead symbols.
- Avoid circular dependencies between `services`, `context`, and `components`.
- Keep Firebase reads/writes out of page components when a service layer is appropriate.

## Naming Conventions
- Components: PascalCase filenames and exports (`EventCard.tsx`).
- Hooks: camelCase with `use` prefix (`useAuthGate`, `use-media-query.ts` style should follow nearby file conventions).
- Services/utilities: kebab-case filenames (`event-service.ts`).
- Route folders: lowercase and URL-oriented.
- Types/interfaces: PascalCase (`EventData`, `StudioTask`).
- Constants: UPPER_SNAKE_CASE only for real constants; otherwise descriptive camelCase.

## Formatting and Readability
- Use 2-space indentation.
- Match existing file style for semicolons/quotes when editing older files.
- Prefer short functions and early returns.
- Keep JSX blocks readable; extract repeated chunks.
- Avoid noisy comments; add concise comments only for non-obvious logic.
- Keep files focused; move shared logic into `services`, `hooks`, or `lib`.

## Error Handling and Logging
- Wrap async Firebase/network operations in `try/catch`.
- For expected-recoverable read failures, return safe defaults (`[]`, `null`) where pattern already exists.
- For writes/mutations, log contextual error details and rethrow when caller must handle state.
- Do not swallow errors silently.
- Do not log secrets, tokens, or sensitive env values.
- Route handlers should return stable JSON shapes with explicit status codes.

## Firebase and Data Access Practices
- Centralize Firestore path logic in service modules.
- Validate required IDs and preconditions before writes.
- Use transactions for counter/invoice ID generation and multi-doc consistency.
- Keep auth/permission checks near protected operations.
- Treat audit logging failures as non-blocking unless business-critical.
- Preserve existing collection naming conventions (`Studios`, `Users`, `Platform`, etc.).

## Next.js App Router Practices
- Preserve layout responsibilities:
  - `app/layout.tsx`: app-wide shell/providers
  - `app/app/layout.tsx`: dashboard shell
  - `app/admin/layout.tsx`: admin shell
- Default to server components; add `"use client"` only when needed for hooks/browser APIs.
- Keep route handlers lightweight and move reusable logic to `services`/`lib`.
- Ensure changed pages work on both desktop and mobile breakpoints.

## UI and Component Practices
- Reuse existing `components/ui/*` primitives before introducing new base components.
- Keep visual behavior consistent with current dashboard/admin patterns.
- Avoid one-off styling abstractions when a shared utility/component already exists.
- Use semantic markup and accessible control labels where applicable.

## Security and Configuration
- Keep secrets in `.env.local`; never commit env files or credentials.
- Firebase client config is env-driven (`NEXT_PUBLIC_*` keys).
- Review auth/session logic carefully when touching `context/AuthContext.tsx`.
- Review role/permission checks carefully in dashboard/admin flows.

## Git and PR Guidance
- Make focused diffs; avoid unrelated refactors in feature fixes.
- Preferred commit format: `<scope>: <action>`.
  - Example: `events: fix resource availability check`
- PR description should include:
  - what changed
  - why it changed
  - validation run (`lint`, build, manual checks)
  - screenshots/video for UI updates

## Agent Execution Checklist
- Read nearby files before editing to match local patterns.
- Keep business logic in `services/*` where practical.
- Run `npm run lint` after meaningful code changes.
- For broader changes, run `npm run lint && npm run build`.
- If something cannot be validated locally, state that clearly in your handoff.

## External Agent Rules Audit
The repository was checked for extra instruction sources:
- `.cursorrules`: not found
- `.cursor/rules/`: not found
- `.github/copilot-instructions.md`: not found

If these files are added later, merge their constraints into this document and treat stricter rules as higher priority.
