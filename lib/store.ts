import { create } from "zustand"
import { persist } from "zustand/middleware"

export type Feature =
  | "dashboard" | "calendar" | "tasks" | "consultation" 
  | "catalog" | "payments" | "inventory" | "crew" | "settings"

export type StudioConfig = {
  id: string
  name: string
  logo: string
  features: Feature[]
}

interface AppState {
  studios: StudioConfig[]
  
  // Actions
  setStudios: (studios: StudioConfig[]) => void
  toggleFeature: (studioId: string, feature: Feature) => void
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      studios: [
        {
          id: "studio-1",
          name: "Demo Studio",
          logo: "/generic-studio-logo.png",
          features: ["dashboard", "calendar", "tasks", "consultation", "catalog", "payments", "inventory", "crew", "settings"],
        },
      ],

      // Actions
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
    }),
    {
      name: "shutter-studio-storage",
    },
  ),
)