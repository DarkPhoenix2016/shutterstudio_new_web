import { create } from "zustand"
import { persist } from "zustand/middleware"

export type Feature =
  | "dashboard"
  | "calendar"
  | "tasks"
  | "consultation"
  | "catalog"
  | "payments"
  | "inventory"
  | "crew"
  | "settings"

export type StudioConfig = {
  id: string
  name: string
  logo: string
  features: Feature[]
}

export type UserRole = "super_admin" | "studio_manager" | "studio_accountant" | "studio_crew"

export type User = {
  email: string
  role: UserRole
  studioId?: string
}

interface AppState {
  studios: StudioConfig[]
  currentUser: User | null
  // Actions
  setStudios: (studios: StudioConfig[]) => void
  toggleFeature: (studioId: string, feature: Feature) => void
  setCurrentUser: (user: User | null) => void
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      studios: [
        {
          id: "studio-1",
          name: "Demo Studio",
          logo: "/generic-studio-logo.png",
          features: [
            "dashboard",
            "calendar",
            "tasks",
            "consultation",
            "catalog",
            "payments",
            "inventory",
            "crew",
            "settings",
          ],
        },
        {
          id: "studio-2",
          name: "Elite Captures",
          logo: "/generic-studio-logo.png",
          features: ["dashboard", "calendar", "catalog", "settings"],
        },
      ],
      currentUser: null,
      setStudios: (studios) => set({ studios }),
      toggleFeature: (studioId, feature) =>
        set((state) => ({
          studios: state.studios.map((s) =>
            s.id === studioId
              ? {
                  ...s,
                  features: s.features.includes(feature)
                    ? s.features.filter((f) => f !== feature)
                    : [...s.features, feature],
                }
              : s,
          ),
        })),
      setCurrentUser: (user) => set({ currentUser: user }),
    }),
    {
      name: "shutter-studio-storage",
    },
  ),
)

export const AUTH_MAP: Record<string, User> = {
  "admin@shutterstudio.com": { email: "admin@shutterstudio.com", role: "super_admin" },
  "owner@demo.com": { email: "owner@demo.com", role: "studio_manager", studioId: "studio-1" },
  "finance@demo.com": { email: "finance@demo.com", role: "studio_accountant", studioId: "studio-1" },
  "crew@demo.com": { email: "crew@demo.com", role: "studio_crew", studioId: "studio-1" },
}

export const ROLE_PERMISSIONS: Record<UserRole, Feature[]> = {
  super_admin: [],
  studio_manager: [
    "dashboard",
    "calendar",
    "tasks",
    "consultation",
    "catalog",
    "payments",
    "inventory",
    "crew",
    "settings",
  ],
  studio_accountant: ["dashboard", "calendar", "payments", "settings"],
  studio_crew: ["dashboard", "calendar", "tasks", "inventory"],
}
