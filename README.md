# ShutterStudio Web

ShutterStudio is a SaaS platform for photography studios. It centralizes booking, crew coordination, catalogue/inventory tracking, subscription management, and client communication in one web app.

## Product Idea

The core goal is to replace scattered spreadsheets/chats with a single operational system for studio teams.

- Studio-facing app: event workflows, tasks, crew, inventory, and admin operations.
- Public-facing pages: marketing, legal pages, and contact flow.
- Service-driven architecture: business logic is implemented in service modules and reused across UI flows.

## Tech Stack

- Framework: Next.js 16 (App Router) + React 19
- Language: TypeScript-first (with some JavaScript files)
- Styling: Tailwind CSS 4, shadcn/ui (New York style), Radix UI
- Backend services: Firebase (Auth, Firestore, Storage)
- State: React Context + Zustand
- Email/API: Resend (contact endpoint)

## Repository Structure

```text
app/            Next.js routes, layouts, and API handlers
  admin/        Admin dashboard modules
  api/          Server routes (e.g., contact)
  app/          Main authenticated studio area
components/     Shared UI and feature components
context/        React providers (auth/session and app-level context)
hooks/          Reusable hooks
lib/            Utilities, Firebase setup, Zustand store
services/       Domain/business logic (events, crew, inventory, etc.)
public/         Static assets
styles/         Shared styles
temp/           Legacy/reference code pending migration
planing/        Planning notes and gap analysis docs
```

## Core Service Modules

- `services/event-service.ts`: Event lifecycle and assignment queries.
- `services/crew-service.ts`: Crew management flows.
- `services/inventory-service.ts`: Equipment/item logic and inventory stats helpers.
- `services/task-service.ts`: Task planning/tracking behavior.
- `services/subscription-service.ts`: Studio subscription and billing-related logic.
- `services/catalogue-service.ts`, `consultation-service.ts`, `platform.ts`: Additional domain operations and platform-level helpers.

## Local Setup

1. Install dependencies:
```bash
npm install
```
2. Configure environment variables in `.env.local`:
```bash
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=
RESEND_API_KEY=
```
3. Run development server:
```bash
npm run dev
```

Open `http://localhost:3000`.

## Scripts

- `npm run dev`: Start local development (`next dev --turbo`).
- `npm run build`: Create production build.
- `npm run start`: Run production build.
- `npm run lint`: Lint all files with ESLint.

## Coding Standards

- Use TypeScript for new modules/components.
- Keep business logic in `services/`, not inside page components.
- Prefer named exports for service/helper functions.
- Naming:
  - Components: `PascalCase` (`EventCard.tsx`)
  - Hooks: `useCamelCase` (`useCrewFilters.ts`)
  - Service files: `kebab-case` (`event-service.ts`)
- Use alias imports like `@/components/...` and `@/lib/...` when appropriate.

## Testing & Quality

There is currently no dedicated automated test runner configured in `package.json`.

Current quality gate before PR:
```bash
npm run lint
npm run build
```
Also manually verify changed flows in local dev.

## GitHub Contribution Requirements

### Branching
- Use short-lived feature/fix branches from main.
- Branch names: `feature/<topic>`, `fix/<topic>`, `chore/<topic>`.

### Commits
- Use clear imperative messages.
- Preferred format: `<scope>: <change>`
- Example: `inventory: wire dashboard count to service stats`

### Pull Requests
- Include:
  - What changed
  - Why it changed
  - Risk/impact
  - Validation steps run (`lint`, `build`, manual checks)
  - Screenshots/video for UI changes
- Link the related issue/task when available.

## Security Notes

- Never commit `.env.local` or secrets.
- Rotate any key that was accidentally exposed.
- Review Firebase write/read paths and query indexes when adding new data flows.
