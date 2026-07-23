import type React from "react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Studio | Shutter Studio",
  description: "Photography studio portfolio and contact page.",
}

export default function StudioPublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
