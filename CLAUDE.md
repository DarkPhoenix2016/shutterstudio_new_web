# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ShutterStudio is a SaaS platform for photography studios — a studio operations system replacing spreadsheets/chats with centralized booking, crew coordination, inventory, task management, and client communication.

## Commands

```bash
# Development
npm run dev          # Start dev server with Turbopack (http://localhost:3000)

# Production
npm run build        # Create production build
npm run start        # Run production build

# Quality gate (run before PRs — no automated test runner exists)
npm run lint         # ESLint across all files
npm run build        # Verify no build errors
```

## Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=
RESEND_API_KEY=

# Optional: override Cloud Function URLs (fallback to hardcoded prod URLs if absent)
NEXT_PUBLIC_CF_REGISTER_USER=
NEXT_PUBLIC_CF_ENABLE_USER=
NEXT_PUBLIC_CF_DISABLE_USER=
```

## Architecture

**Framework:** Next.js 16 (App Router) + React 19, TypeScript-first. Firebase is the sole backend (Auth, Firestore, Storage). No dedicated API layer — Firestore is accessed directly from service modules and components.

### Route Structure

```
app/
  page.tsx            # Landing page
  layout.tsx          # Root layout — wraps everything in AuthProvider + Toaster
  app/                # Authenticated studio area (double nesting is intentional)
    layout.tsx        # Dashboard layout: auth guard, permission check, sidebar
    page.tsx          # Studio dashboard home
    events/           # Event management (list, calendar, detail [id])
    crew/             # Crew overview and manager
    inventory/        # Inventory overview and settings
    catalogue/        # Catalogue overview and settings
    tasks/            # Task planning
    consultation/     # Consultation flow
    studio/           # Studio profile, settings, subscription
    profile/          # User profile and settings
    login/            # Auth page (no sidebar)
  admin/              # Super-admin area (separate layout, separate auth)
    layout.tsx
    page.tsx          # Admin dashboard
    studios/          # Studio directory management
    subscriptions/    # Subscription management
    analytics/        # Platform analytics
    audit/            # Audit log viewer
  public/event/[id]/  # Public-facing event detail (no auth)
  api/contact/        # Resend email API route
  about/, contact/, privacy/, terms/, maintenance/  # Marketing/legal pages
```

### Auth & Permission System

`AuthProvider` (`context/AuthContext.tsx`) is the single source of truth for session state. It holds:
- `currentUser` — Firebase Auth user
- `userData` — Firestore `Users/{uid}` doc (or `SuperAdmins/{uid}` for admins)
- `studioData` — Firestore `Studios/{studioID}` doc
- `rolePermissions` — Firestore `Platform/ROLE_PERMISSIONS` doc (role → feature array map)
- `globalSettings` — Firestore `Platform/settings` doc (real-time listener), includes `maintenanceMode` and `navigation` config

**Access control in `app/app/layout.tsx`:** On every route change, the layout fetches the `navigation` config from Firestore, finds the matching nav item for the current path, looks up the feature key, then checks `rolePermissions[userData.role]`. Unauthorized → redirect to `/app/unauthorized`. Super admins bypass all checks.

**`useAuthGate` hook** (`hooks/use-auth-gate.ts`): Use inside page components to call `canAccess(feature)` for conditional UI — reads from `AuthContext` without extra Firestore calls.

### Firestore Collections

| Collection | Purpose |
|---|---|
| `Users/{uid}` | Studio user profiles |
| `SuperAdmins/{uid}` | Platform admin profiles |
| `Studios/{studioID}` | Studio records |
| `Platform/settings` | Global settings + navigation config |
| `Platform/ROLE_PERMISSIONS` | Role → feature access map |
| `AuditLogs` | Audit trail (written via `lib/logger.ts`) |

Studio-scoped data (events, crew, inventory, etc.) is namespaced under `Studios/{studioID}/...` subcollections — see individual service files for collection paths.

### Service Modules (`services/`)

Business logic lives exclusively in service files, not in page components.

- `event-service.ts` — Event lifecycle, assignment, invoicing, Firestore transactions
- `crew-service.ts` — Crew member management
- `inventory-service.ts` — Equipment tracking and stats
- `task-service.ts` — Task planning/tracking
- `subscription-service.ts` — Studio subscription/billing logic, package config
- `catalogue-service.ts` — Product/service catalogue operations
- `consultation-service.ts` — Consultation flow
- `platform.ts` — Platform-level operations

### State Management

- **React Context** (`AuthProvider`) — session/auth state, available globally
- **Zustand** (`lib/store.ts`) — persisted app state (`shutter-studio-storage` key); currently manages studio feature toggles via `useStore`

### Utility Libraries

- `lib/firebase.ts` — Firebase app initialization, exports `auth`, `db`, `storage`
- `lib/logger.ts` — `logAuditAction()` writes to Firestore `AuditLogs` collection; call for significant user actions
- `lib/utils.ts` — `cn()` helper (clsx + tailwind-merge)
- `lib/date-utils.ts` — `safeDate()` converts Firestore Timestamps / ISO strings / unknown to `Date`; use this everywhere instead of inline conversions
- `lib/event-utils.ts` — `getStatusColor(status)` returns Tailwind badge classes for event statuses; use instead of inline switch/if chains
- `lib/image-utils.ts`, `lib/storage-utils.ts` — Image compression and Firebase Storage helpers

### UI Conventions

- **shadcn/ui** (New York style) components live in `components/ui/` — do not modify these directly; extend via props or wrappers
- **Tailwind CSS 4** — use utility classes; brand primary color is `#1C4D8D`
- Icons from **lucide-react**; icon string-to-component mapping for dynamic nav is in `components/dashboard-sidebar.tsx` (`ICON_MAP`)
- Notifications: use **Sonner** (`sonner`) or the shadcn `Toaster` already mounted in root layout

## Coding Conventions

- Business logic → `services/`, not inside pages or components
- Named exports for service/helper functions
- Components: `PascalCase.tsx` | Hooks: `useCamelCase.ts` | Services: `kebab-case.ts`
- Path aliases: `@/components/...`, `@/lib/...`, `@/services/...`, `@/context/...`, `@/hooks/...`
- Add audit logs (`logAuditAction`) for any significant write operations

## Branching & Commits

- Branch names: `feature/<topic>`, `fix/<topic>`, `chore/<topic>`
- Commit format: `<scope>: <change>` (e.g., `inventory: wire dashboard count to service stats`)
