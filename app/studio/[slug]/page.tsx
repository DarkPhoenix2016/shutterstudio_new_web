import { notFound } from "next/navigation"
import { getStudioBySlug } from "@/services/studio-service"
import ClientPortal from "@/components/studio/client-portal"

interface StudioPageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: StudioPageProps) {
  const { slug } = await params
  const studio = await getStudioBySlug(slug)

  if (!studio) {
    return { title: "Studio Not Found" }
  }

  return {
    title: `${studio.name} | Customer Portal`,
    description: `Access and complete signing for your photographic events at ${studio.name}.`,
  }
}

export default async function StudioPublicPage({ params }: StudioPageProps) {
  const { slug } = await params
  const studio = await getStudioBySlug(slug)

  if (!studio) {
    notFound()
  }

  return (
    <ClientPortal
      studioId={studio.id}
      studioSlug={slug}
      initialStudioName={studio.name}
    />
  )
}

