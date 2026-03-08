# ShutterStudio — Codebase Improvement & Implementation Report

Generated: 2026-03-07
Branch: `Studio-Dashboard`

---

## How to Read This Report

Items are grouped by category and ordered by **impact**. Each item lists the affected file(s), what the problem is, and what needs to be done.

---

## 1. CRITICAL BUGS (Breaking or Data-Incorrect)

### 1.1 Dashboard navigation routes are wrong — will 404
**Files:** `app/app/page.tsx` lines 152, 235, 245, 254

The "New Booking" button pushes to `/events/new`, "View All" to `/events`, and event card click to `/events/{id}`. The correct paths inside this layout are `/app/events/event`, `/app/events/event`, `/app/events/{id}`. These will currently 404 in production.

**Fix:** Change all three routes to use the `/app/` prefix.

---

### 1.2 Permission check re-fetches Firestore on every route change
**File:** `app/app/layout.tsx` lines 87–119

The layout's `validateAccess` `useEffect` fetches `Platform/settings` AND `Platform/ROLE_PERMISSIONS` from Firestore on every `pathname` change, even though `AuthContext` already holds `globalSettings` (real-time) and `rolePermissions` (already fetched at login). This means every page navigation triggers 2 redundant Firestore reads.

**Fix:** Remove the two `getDoc` calls inside `validateAccess` and use `rolePermissions` and `globalSettings` that are already in `useAuth()`.

---

### 1.3 Cloud function URLs are hardcoded in source
**Files:** `services/crew-service.ts` lines 38–42, `app/admin/studios/page.tsx` lines 28–30

Firebase Cloud Function URLs (`registeruser-g33n26zifq-uc.a.run.app`, etc.) are hardcoded in production code with a specific GCP region. If functions are redeployed, the URLs break silently.

**Fix:** Move to `.env.local` as `NEXT_PUBLIC_CF_REGISTER_USER=`, `NEXT_PUBLIC_CF_ENABLE_USER=`, `NEXT_PUBLIC_CF_DISABLE_USER=` and reference via `process.env`.

---

### 1.4 API contact route has no input validation (XSS / injection risk)
**File:** `app/api/contact/route.js` line 25

User-supplied `message` is interpolated directly into HTML with `.replace(/\n/g, '<br>')` and sent via Resend. A malicious actor can inject arbitrary HTML/scripts into the email body.

**Fix:** Escape HTML entities in all user inputs before building the HTML string, or use a templating library. Also add basic presence checks for required fields (`name`, `email`, `message`) before calling Resend, to avoid billing empty requests.

---

### 1.5 Inventory count on dashboard is hardcoded
**File:** `app/app/page.tsx` line 95

```ts
inventoryCount: 24 // Placeholder for now
```

The service layer has `calculateInventoryStats` in `inventory-service.ts` already. The dashboard never calls it.

**Fix:** Import and call `fetchInventory` (or a stats helper) from `inventory-service.ts` and wire the real count into the stat card.

---

### 1.6 Dashboard equipment utilization is entirely static
**File:** `app/app/page.tsx` lines 220, 287–296

- Equipment utilization shows `~60%` (hardcoded string)
- The "Studio Utilization" card shows progress bars for `Studio Space: 85%`, `Camera Gear: 62%`, `Lighting Kits: 44%`, `Post-Production: 91%` — all hardcoded arrays

**Fix:** Either wire these to real data from `inventory-service.ts` stats, or remove/replace the card with a meaningful real-time widget.

---

### 1.7 Subscription page "Photos" usage is hardcoded to 0
**File:** `app/app/studio/subscription\page.tsx` line 190

```tsx
used={0} // Placeholder until photo service is ready
```

The limit value is fetched from Firestore but the actual usage is always 0, making the usage bar misleading.

**Fix:** Implement a photo count query (count of `galleryUrls` across events for the studio) in `subscription-service.ts` and wire it to the progress bar.

---

## 2. INCORRECT ROUTING / NAVIGATION

### 2.1 `app/app/events/event/page.tsx` and `app/app/events/event/page - Copy.tsx` conflict
**Files:** `app/app/events/event/page.tsx`, `app/app/events/event/page - Copy.tsx`

There are two routes: `/app/events/event` (a static form-based page) and `/app/events/[id]` (the full dynamic event detail). The static `/event` route appears to be legacy. The "page - Copy.tsx" file is a leftover editor copy that Next.js will attempt to route, causing unexpected behavior.

**Fix:** Delete `page - Copy.tsx` immediately. Evaluate whether `app/app/events/event/page.tsx` should be retired in favor of the `[id]` dynamic route and redirected.

---

### 2.2 Subscription page action buttons have no handlers
**File:** `app/app/studio/subscription/page.tsx` lines 92–97

```tsx
<Button variant="outline">Billing Settings</Button>
<Button ...>Change Plan</Button>
<Button ...>Reactivate Subscription</Button>
```

None of these buttons have `onClick` handlers. They render but do nothing.

**Fix:** Implement routing (`router.push`) or dialog flows for each action, or mark as `disabled` with a tooltip until implemented.

---

## 3. CODE QUALITY & DUPLICATION

### 3.1 `safeDate` helper is copy-pasted across 9 files
**Files:** `app/app/tasks/page.tsx`, `app/app/events/gallery/page.tsx`, `app/app/events/calendar/page.tsx`, `app/app/events/[id]/page.tsx`, `app/app/consultation/page.tsx`, `app/admin/studios/page.tsx`, `app/admin/page.tsx`, `app/admin/billing/page.tsx`, `app/public/event/[id]/page.tsx`

Each file contains its own slightly different implementation of `safeDate`. Some handle `{seconds}` Firestore objects, others don't.

**Fix:** Create `lib/date-utils.ts` with a canonical `safeDate(dateInput: unknown): Date` export and replace all copies.

---

### 3.2 `getStatusColor` helper is duplicated across multiple pages
**Files:** `app/app/page.tsx`, `app/app/events/event/page.tsx`, `app/app/events/calendar/page.tsx`

Each page has its own `getStatusColor(status: string)` with inconsistent logic (some check `'confirm'`, others check `'scheduled'`).

**Fix:** Define a single canonical status-color map in `lib/event-utils.ts` and export it.

---

### 3.3 `[!code highlight]` editor annotations left in source files
**Files:** `app/app/events/event/page.tsx`, `app/app/layout.tsx`, `components/dashboard-sidebar.tsx`, others

Comments like `// [!code highlight] Added Navigation Types` are Shiki/code-highlight directives that were accidentally committed from documentation or editor usage. They have no runtime effect but pollute the codebase.

**Fix:** Global search-replace to remove all `// [!code highlight]` occurrences.

---

### 3.4 Pervasive use of `any` type — 206 occurrences in 32 files
**Files:** All — worst offenders are `app/app/events/[id]/page.tsx` (20 hits), `app/app/tasks/page.tsx` (33 hits)

Key typed fields that should be specific types:
- `EventData.inquiryDate: any` → should be `Timestamp | Date | string`
- `EventApproval.approved_date?: any` → `Timestamp | Date`
- `Member.[key: string]: any` in crew-service → index signature masks missing fields
- Form state `setFormData((v: any) => ...)` patterns throughout consultation

**Fix:** Prioritize adding proper types to all service interfaces (`EventData`, `Member`, `StudioData`). Work outward to pages. Turn on `"strict": true` in `tsconfig.json` if not already set.

---

### 3.5 Firebase initialized in a `.js` file, not `.ts`
**File:** `lib/firebase.js`

All other library/service files are `.ts`. The core Firebase init file is `.js`, meaning it has no type checking and exports are untyped. `storage` is imported in several places but may not be exported from this file (causing potential runtime errors).

**Fix:** Rename to `lib/firebase.ts`, add proper typed exports for `auth`, `db`, and `storage`.

---

### 3.6 `lib/store.ts` Zustand store is disconnected from real auth state
**File:** `lib/store.ts`

The store initializes with a hardcoded `"Demo Studio"` entry. `StudioConfig` defines `features: Feature[]` but the feature toggle logic is never read from Firebase — navigation and permissions come from `AuthContext` and Firestore `ROLE_PERMISSIONS`. The Zustand store is essentially dead code.

**Fix:** Either hydrate the store from `AuthContext` on login (replacing the demo data), or remove it entirely and rely solely on `AuthContext`/Firestore for feature and permission state.

---

### 3.7 Crew members fetched with N+1 Firestore reads
**File:** `services/crew-service.ts` lines 53–59

```ts
const userPromises = idList.map((uid) => getDoc(doc(db, "Users", uid)));
```

For a studio with 20 crew members, this fires 20 parallel Firestore document reads every time crew data is loaded. This pattern appears in `crew/overview`, `crew/manager`, `events/[id]`, and `tasks`.

**Fix:** If crew data is small (< ~30 members), this is acceptable, but consider denormalizing minimal member data (name, photo, role) into the `MEM_LIST` document itself so a single read is sufficient for list views.

---

## 4. MISSING FEATURES / UNIMPLEMENTED STUBS

### 4.1 Events list has no pagination
**File:** `app/app/events/event/page.tsx`

`fetchEvents` retrieves all events for a studio with no limit. A studio with 500+ events will load all of them into memory on this page.

**Fix:** Add server-side cursor pagination to `fetchEvents` in `event-service.ts` using Firestore `startAfter`, and implement a paginator in the UI.

---

### 4.2 Gallery page "Download" button is non-functional
**File:** `app/app/events/gallery/page.tsx`

The `Download` icon is imported and the button is rendered in the lightbox, but there is no `onClick` handler that triggers a download.

**Fix:** Implement a download by fetching the image URL and triggering a blob download or opening the URL with `?download=1` if supported by Firebase Storage.

---

### 4.3 Consultation → Event conversion lacks audit trail
**File:** `services/consultation-service.ts`

`convertToEvent` creates an event from a consultation but does not call `logAuditAction`. The conversion is a significant business action.

**Fix:** Add `logAuditAction("CONVERT_CONSULTATION", ...)` after the event is successfully created.

---

### 4.4 No notification system beyond SweetAlert2 toasts
**Scope:** Whole app

The app uses both `sonner` (the Toaster in root layout) and `sweetalert2` (mixed throughout page components). There is no in-app notification center, and no real-time crew/event notifications.

**Fix (short-term):** Standardize on one toast library. Sonner (already in root layout) is the shadcn-aligned choice; remove SweetAlert2 dependencies.
**Fix (long-term):** Implement a Firestore-backed notification collection per user for crew assignments, event changes, and task updates.

---

### 4.5 Admin analytics storage calculation will not scale
**File:** `app/admin/analytics/page.tsx` lines 38–58

The `calculateFolderSize` function performs deep recursive `listAll` traversal of Firebase Storage at runtime. With many studios and files, this will timeout or hit Firebase quota limits.

**Fix:** Track storage usage as a Firestore field (e.g., `Studios/{id}/metadata.storageBytes`) updated via Cloud Functions on file upload/delete. Read the cached value instead of traversing Storage.

---

### 4.6 `temp/` directory — unclear migration status
**Directory:** `temp/`

Multiple legacy/reference modules exist in `temp/` (calendar, catalog, payments, etc.) that are outside the active `app/` routing tree. Their relationship to current code is undefined.

**Fix:** Audit each `temp/` module and classify as: `migrate` (port into `app/`), `archive` (move to git history), or `delete`. Do not ship `temp/` to production.

---

### 4.7 No Firestore security rules or index exports in version control
**Scope:** Project root

There are no `firestore.rules`, `firestore.indexes.json`, or `storage.rules` files in the repository. The planning docs note that composite indexes are needed for several queries in `event-service.ts`.

**Fix:**
- Export current Firestore rules and indexes via Firebase CLI: `firebase firestore:indexes > firestore.indexes.json`
- Add `firestore.rules` and `storage.rules` to the repo root
- Add these to `.gitignore` exclusions review to ensure they are tracked

---

### 4.8 No onboarding flow — all landing CTAs go directly to `/app/login`
**Files:** `components/landing/cta-section.tsx`, `components/landing/pricing.tsx`, `components/landing/navbar.tsx`

The landing page has no sign-up, plan selection, or trial activation flow. All CTAs bypass any onboarding.

**Fix:** Implement a `/signup` or `/register` route with plan selection → account creation → studio setup wizard.

---

### 4.9 No error boundaries — unhandled render errors crash the whole page
**Scope:** Whole app — no `error.tsx` files in any route segment

Next.js App Router supports `error.tsx` per segment for graceful error recovery. None exist.

**Fix:** Add `app/app/error.tsx` and `app/admin/error.tsx` at minimum. For critical modules (events, tasks), add segment-level error boundaries.

---

## 5. UI / UX ISSUES

### 5.1 Geist font is initialized but not applied to `<body>`
**File:** `app/layout.tsx` lines 8–9, 40

```tsx
const _geist = Geist({ subsets: ["latin"] })   // variable is prefixed _ (unused)
...
<body className="font-sans antialiased">        // uses Tailwind default, not Geist
```

The font objects are assigned to `_geist` / `_geistMono` (underscore prefix signals "unused") and their `.className` is never applied to `<body>`.

**Fix:**
```tsx
const geist = Geist({ subsets: ["latin"], variable: "--font-geist" })
<body className={`${geist.variable} font-sans antialiased`}>
```
Then reference `--font-geist` in Tailwind config.

---

### 5.2 Crew overview table truncates at 8 members with no "Show All"
**File:** `app/app/crew/overview/page.tsx` line 294

```tsx
{filteredMembers.slice(0, 8).map(...)}
```

The list is hard-capped at 8 regardless of studio size.

**Fix:** Add a "Show All" toggle or pagination below the table.

---

### 5.3 Inventory overview pagination resets when categories expand/collapse
**File:** `app/app/inventory/overview/page.tsx`

When a user is on page 2 of inventory items and toggles a category, the pagination state (`page`) doesn't reset to 1, causing an empty view (items on page 2 no longer exist after filtering).

**Fix:** Reset `setPage(1)` whenever `searchQuery`, `filterType`, or `expandedCategories` changes.

---

### 5.4 Calendar page "No events — Create one now" links to wrong path
**File:** `app/app/page.tsx` line 245

```tsx
<Button variant="link" onClick={() => router.push('/events/new')}>Create one now</Button>
```

This routes to `/events/new` (missing `/app/` prefix) — same bug as item 1.1.

---

### 5.5 Crew overview "Team Quick Access" section shows max 8 members but search is global
**File:** `app/app/crew/overview/page.tsx` lines 294, 67–71

The search filter runs over all members (`filteredMembers`) but the render slices to 8. If a searched member is 9th or later, they'll never appear even though search "found" them.

**Fix:** Remove the `.slice(0, 8)` entirely and replace with proper pagination.

---

## 6. ARCHITECTURE / SCALABILITY

### 6.1 AuthContext fetches role permissions on every login but doesn't cache between sessions
**File:** `context/AuthContext.tsx` lines 107–120

`fetchPermissions()` is called on every `onAuthStateChanged` trigger (i.e., on every hard refresh). These are relatively static platform-wide settings that change rarely.

**Fix:** Cache the result in `sessionStorage` with a short TTL (e.g., 30 minutes) to avoid the Firestore read on every page refresh.

---

### 6.2 Multiple modules independently fetch all events with no shared cache
**Scope:** `crew/overview`, `inventory/overview`, `inventory/settings`, `consultation`, `tasks`

Each of these pages calls `fetchEvents(studioID)` independently, fetching the full event list from Firestore with no caching. If a user navigates between these pages, the same data is re-fetched every time.

**Fix:** Lift event data into a React Context (or Zustand slice) with a cache/invalidation strategy, so sibling pages share one fetch.

---

### 6.3 `EventData` type uses `days[].date: Date` but Firestore stores Timestamps
**File:** `services/event-service.ts` lines 90–97

The `EventDayConfig.date` is typed as `Date` but Firestore returns `Timestamp`. Every consumer defensively runs `safeDate()` (or copies of it) to handle this mismatch. The mismatch is never resolved at the service boundary.

**Fix:** In service functions that fetch events, convert all `Timestamp` fields to `Date` objects before returning data. Then the type `Date` is actually accurate and consumers don't need defensive parsing.

---

### 6.4 `lib/firebase.js` exports `storage` but it may not be initialized
**File:** `lib/firebase.js`

Several files import `storage` from `@/lib/firebase`. Without seeing the full file it's unclear if `storage` is initialized (`getStorage(app)`). The file is `.js` so TypeScript doesn't catch a missing export.

**Fix:** Convert to `.ts` and explicitly export `export const storage = getStorage(app)`.

---

## 7. SECURITY

### 7.1 Contact API echoes raw error object to client
**File:** `app/api/contact/route.js` line 31

```js
return NextResponse.json({ success: false, error }, { status: 500 });
```

The raw `error` object (which may contain stack traces, Resend API keys, or internal details) is serialized and returned to the client.

**Fix:** Return a generic error message: `{ success: false, error: "Failed to send message." }`.

---

### 7.2 `admin/studios/page.tsx` has no role guard beyond layout-level check
**File:** `app/admin/studios/page.tsx`

The admin layout performs an auth check, but individual admin pages don't verify that the logged-in user actually has `super_admin` role before performing write operations (registering users, changing package, disabling studios). A user who bypasses the layout redirect could still call these operations.

**Fix:** Add a role check at the top of each admin page component (`if (userData?.role !== 'super_admin') return null`). Move the Firebase write operations to server-side API routes or Cloud Functions where auth can be enforced server-side.

---

### 7.3 Public event page uses `collectionGroup` — verify security rules
**File:** `app/public/event/[id]/page.tsx` line 11

```ts
import { collectionGroup } from "firebase/firestore"
```

`collectionGroup` queries are powerful but require explicit Firestore security rules (`match /{path=**}/Events/{id}`). Without rules, this could expose events from all studios to public users.

**Fix:** Confirm that `firestore.rules` restricts collection group reads to only the fields needed for public viewing, and that the query filters by `studioId` before rendering.

---

## 8. SUMMARY TABLE

| # | Category | Item | Severity |
|---|----------|------|----------|
| 1.1 | Bug | Dashboard routes missing `/app/` prefix → 404 | Critical |
| 1.2 | Bug | Permission check re-fetches Firestore on every nav | High |
| 1.3 | Bug | Cloud function URLs hardcoded in source | High |
| 1.4 | Security | Contact API injects user HTML into email body | High |
| 1.5 | Bug | Inventory count hardcoded to 24 | High |
| 1.6 | Bug | Dashboard utilization bars fully static/fake | High |
| 1.7 | Bug | Subscription photos usage always 0 | Medium |
| 2.1 | Bug | `page - Copy.tsx` creates rogue route | High |
| 2.2 | UX | Subscription action buttons have no handlers | Medium |
| 3.1 | Quality | `safeDate` duplicated in 9 files | Medium |
| 3.2 | Quality | `getStatusColor` inconsistently duplicated | Low |
| 3.3 | Quality | `[!code highlight]` comments in production code | Low |
| 3.4 | Quality | 206 `any` usages across 32 files | Medium |
| 3.5 | Quality | `lib/firebase.js` not TypeScript | Medium |
| 3.6 | Architecture | Zustand store disconnected from real data | Medium |
| 3.7 | Performance | N+1 Firestore reads for crew members | Medium |
| 4.1 | Feature | Events list has no pagination | High |
| 4.2 | Feature | Gallery Download button non-functional | Medium |
| 4.3 | Feature | Consultation→Event conversion not audited | Low |
| 4.4 | Feature | Dual toast libraries; no in-app notifications | Medium |
| 4.5 | Performance | Admin storage calc will timeout at scale | High |
| 4.6 | Maintenance | `temp/` directory unresolved | Medium |
| 4.7 | Infrastructure | No Firestore rules/indexes in version control | High |
| 4.8 | Feature | No sign-up / onboarding flow | High |
| 4.9 | Reliability | No error boundaries (`error.tsx`) anywhere | High |
| 5.1 | UX | Geist font initialized but not applied | Low |
| 5.2 | UX | Crew list hard-capped at 8 with no Show All | Medium |
| 5.3 | UX | Inventory pagination doesn't reset on filter change | Low |
| 5.4 | Bug | Calendar "Create one now" link is wrong path | Medium |
| 5.5 | UX | Search + slice(8) means searched members invisible | Medium |
| 6.1 | Performance | Role permissions re-fetched on every hard refresh | Low |
| 6.2 | Performance | Events fetched independently by 5+ modules | Medium |
| 6.3 | Quality | `EventData.days[].date: Date` vs Firestore `Timestamp` mismatch | Medium |
| 6.4 | Bug | `storage` export from `firebase.js` unverified | Medium |
| 7.1 | Security | Contact API leaks raw error to client | High |
| 7.2 | Security | Admin pages lack server-side role enforcement | High |
| 7.3 | Security | Public `collectionGroup` query — rules unconfirmed | High |

---

## 9. RECOMMENDED IMPLEMENTATION ORDER

### Phase 1 — Fix before any user-facing release
1. Fix dashboard route paths (1.1, 5.4)
2. Delete `page - Copy.tsx` (2.1)
3. Fix Contact API HTML injection and error leakage (1.4, 7.1)
4. Confirm/add Firestore security rules and export indexes (4.7, 7.3)
5. Move Cloud Function URLs to environment variables (1.3)

### Phase 2 — Wire real data
6. Wire inventory stats to dashboard (1.5, 1.6)
7. Wire photo usage to subscription page (1.7)
8. Add events list pagination (4.1)
9. Fix permission check to use already-fetched context data (1.2)

### Phase 3 — Code quality
10. Extract `safeDate` and `getStatusColor` to shared utils (3.1, 3.2)
11. Convert `firebase.js` to TypeScript (3.5)
12. Add error boundaries to `app/app/` and `app/admin/` (4.9)
13. Resolve Timestamp→Date mismatch at service layer (6.3)
14. Remove `[!code highlight]` annotations (3.3)

### Phase 4 — Features & architecture
15. Standardize on Sonner, remove SweetAlert2 (4.4)
16. Add `error.tsx` to each route segment (4.9)
17. Implement sign-up / onboarding flow (4.8)
18. Implement gallery download (4.2)
19. Fix Zustand store or remove it (3.6)
20. Audit and clean `temp/` directory (4.6)
21. Fix crew overview hard cap and search interaction (5.2, 5.5)
22. Fix inventory pagination reset on filter (5.3)
23. Fix subscription action buttons (2.2)
24. Apply Geist font correctly (5.1)
25. Cache events data across modules (6.2)
26. Move admin write operations to server-side enforcement (7.2)
