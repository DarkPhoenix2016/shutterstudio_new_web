# Planning Notes (Codex)

This file captures incomplete or partially implemented areas observed in the current codebase and gives a practical execution order.

## 1. Dashboard Inventory Data Is Still Placeholder
- File: `app/app/page.tsx`
- Current state:
  - `inventoryCount` initializes as placeholder.
  - Dashboard value is hardcoded to `24`.
- Gap:
  - Inventory metrics are not wired to live service output.
- Next step:
  - Use `calculateInventoryStats` from `services/inventory-service.ts` and replace static values.

## 2. Admin Modules Are Present but Not Fully Productized
- Location: `app/admin/*` (`analytics`, `audit`, `billing`, `studios`, etc.)
- Current state:
  - Route/module scaffolding exists.
  - `calculateTotalStorage` in `app/admin/page.tsx` performs recursive Firebase Storage scanning.
- Gap:
  - Expensive runtime calculation will not scale.
- Next step:
  - Move storage totals to cached Firestore metadata updated by controlled writes/jobs.

## 3. Multi-Tenant State Is Still Demo-Centric
- File: `lib/store.ts`
- Current state:
  - Default studio still includes `"Demo Studio"`.
- Gap:
  - Production tenant switching/session restoration remains fragile.
- Next step:
  - Hydrate selected studio from authenticated user context and persist by user.

## 4. Legacy/Reference Code Still Pending Migration
- Location: `temp/`
- Current state:
  - Multiple modules exist outside the active app flow.
- Gap:
  - Unclear source of truth between `app/` and legacy implementations.
- Next step:
  - Mark each `temp/` module as `migrate`, `archive`, or `delete` with owner/date.

## 5. Query/Index Hardening Needed
- File: `services/event-service.ts`
- Current state:
  - Complex queries (including `fetchMyAssignedEvents`) likely rely on composite indexes.
- Gap:
  - Missing production indexes can break runtime queries.
- Next step:
  - Export required Firestore indexes and version-control them before release.

## 6. Secure Image Management & Private Assets
- Current state:
  - Images are served via public `getDownloadURL` links.
- Gap:
  - Any user with the direct URL can see private event photos even if they aren't authorized.
- Next step:
  - Secure storage rules (`read: if false`).
  - Implement a Next.js Proxy/API for authenticated image streaming.
  - Switch Firestore from storing absolute URLs to relative Storage paths.
