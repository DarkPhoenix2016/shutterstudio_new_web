# Project Planning & Incomplete Features Analysis

This document outlines the current state of the ShutterStudio platform, specifically identifying areas that are incomplete, using placeholders, or require further integration.

## 1. Inventory Module Integration
The `inventory-service.ts` is logically complete, but its integration into the main dashboard (`app/app/page.tsx`) is still pending:
* **Hardcoded Metrics:** `inventoryCount` is currently set to a static `24`.
* **Placeholder Stats:** "Equipment Utilization" and resource progress bars (Camera Gear, Lighting Kits) are static and do not reflect real-time Firestore data.
* **Linkage:** The dashboard needs to be updated to use `calculateInventoryStats` from the service layer.

## 2. Admin & Super-Admin Dashboard
The super-admin features (`app/admin/`) are in a scaffolding phase:
* **Sub-module Implementation:** Directories like `analytics`, `audit`, `billing`, and `studios` are present but likely contain boilerplate code.
* **MRR Logic:** The current MRR calculation is simplified and may not account for diverse subscription cycles or multi-currency handling.
* **Efficiency Concerns:** The `calculateTotalStorage` function performs recursive scans of Firebase Storage, which will become a bottleneck as the platform scales. A metadata-driven approach in Firestore is recommended.

## 3. Global State & Multi-Tenancy
* **Demo Data:** The Zustand store (`lib/store.ts`) currently initializes with a hardcoded "Demo Studio".
* **Studio Switching:** Logic for users belonging to multiple studios needs to be more robustly handled in `AuthContext` and the main navigation.

## 4. Migration & Legacy Code
* **Temp Directory:** The `temp/` folder contains several modules (`calendar`, `catalog`, `payments`, etc.) that appear to be reference implementations or legacy code not yet fully migrated into the `app/` structure.

## 5. UI/UX & Aesthetics
* **Font Implementation:** `app/layout.tsx` initializes Geist fonts but doesn't apply them to the `<body>`, resulting in the default `font-sans` being used instead of the intended brand typography.
* **Landing Page Flow:** All CTA buttons on the landing page route directly to `/app/login`, lacking a tiered onboarding or plan-selection flow.

## 6. Firestore Optimization
* **Indexing:** Several critical queries in `event-service.ts` (e.g., `fetchEvents`, `fetchMyAssignedEvents`) require manual Firestore composite indexes that have not yet been configured in the production environment.

## 7. Image Security & Private Storage
The current implementation uses public Firebase Storage `getDownloadURL` tokens, which are accessible to anyone with the link. This needs to be secured to prevent unauthorized access and URL sharing:
* **Storage Rules:** Transition from public access to `allow read: if false;` (or authenticated-only) to protect raw assets.
* **Access Control:** Implement **Firebase App Check** (reCAPTCHA Enterprise) to ensure only the authorized ShutterStudio web client can interact with Storage.
* **Secure Delivery:** Instead of storing permanent public URLs in Firestore, store the relative storage paths (e.g., `studios/{studioId}/events/{eventId}/photo.jpg`).
* **Signed URLs/Proxying:** Implement a Next.js API route (e.g., `/api/images/[...path]`) using `firebase-admin` to serve images. This route will:
    1. Verify the requester's session/authentication.
    2. Check if the user has permission for that specific event.
    3. Generate a short-lived (e.g., 1-hour) signed URL or stream the image directly.
* **Component Updates:** Update components like `CustomerEventPage` to fetch images via the new secure proxy route instead of direct public links.
