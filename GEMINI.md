# ShutterStudio - Photography Studio Management Platform

ShutterStudio is a comprehensive SaaS platform built for photography studios to manage their end-to-end operations, from booking and crew scheduling to inventory tracking and financial management.

## Project Overview

- **Core Purpose:** Streamlining studio management tasks such as event booking, team coordination, equipment tracking, and invoicing.
- **Main Technologies:**
    - **Framework:** Next.js 16 (utilizing React 19)
    - **Styling:** Tailwind CSS 4.0 & Radix UI / shadcn/ui
    - **Backend:** Firebase (Firestore, Authentication, Storage)
    - **State Management:** Zustand & React Context API
    - **Animations:** Framer Motion
    - **Forms:** React Hook Form & Zod
    - **Icons:** Lucide React

## Project Architecture

- `app/`: Contains the Next.js App Router structure.
    - `app/`: The core application behind the landing page.
    - `admin/`: Admin-specific dashboards and settings.
    - `api/`: API routes (e.g., contact form handling).
- `components/`: UI components organized by feature (landing, auth, admin, studio, ui).
- `services/`: Encapsulated business logic for interacting with Firebase (e.g., `event-service.ts`, `crew-service.ts`).
- `context/`: Global state providers like `AuthContext`.
- `hooks/`: Custom React hooks for shared logic.
- `lib/`: Utility functions, Firebase initialization, and Zustand `store.ts`.
- `public/`: Static assets including images and icons.

## Building and Running

### Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm run start
```

### Linting
```bash
npm run lint
```

## Development Conventions

1.  **TypeScript First:** All new components and services should be written in TypeScript.
2.  **Service Layer:** Business logic and data fetching should be placed in the `services/` directory rather than directly in components.
3.  **UI Components:** Leverage the existing shadcn/ui components in `components/ui`. Use Tailwind CSS for custom styling.
4.  **State Management:**
    - Use `AuthContext` for user session data.
    - Use `Zustand` (`lib/store.ts`) for global client-side state.
    - Use local state (`useState`) for component-specific data.
5.  **Firebase:**
    - Firestore is the primary database.
    - Ensure complex operations (like event creation with auto-incrementing IDs) use `runTransaction`.
    - Security rules should be maintained for data integrity.

## Key Features

- **Event Management:** Creating and tracking photo shoots with status workflows.
- **Crew Scheduling:** Assigning team members to events and tracking their availability.
- **Inventory Tracking:** Managing studio equipment and checking availability for specific dates.
- **Financials:** Budgeting, tracking transactions, and generating invoices.
- **Customer Portal:** Landing page and contact forms for potential clients.
