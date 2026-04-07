import { RoutePlaceholderPage } from "@/components/route-placeholder-page"

export function KitchenPage() {
  return (
    <RoutePlaceholderPage
      eyebrow="Cuisine"
      title="Kitchen Display System"
      description="Cette page servira a suivre les commandes en preparation, prioriser les tickets et marquer les commandes comme pretes."
      highlights={[
        "Colonnes par statut de production",
        "Temps d'attente en temps reel",
        "Action rapide pour passer a PRETE",
      ]}
    />
  )
}
