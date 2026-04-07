import { RoutePlaceholderPage } from "@/components/route-placeholder-page"

export function CheckoutPage() {
  return (
    <RoutePlaceholderPage
      eyebrow="Caisse"
      title="Encaissement et cloture"
      description="Cette vue sera dediee aux commandes en attente de paiement, au choix du moyen de paiement et a la finalisation du ticket client."
      highlights={[
        "Liste des commandes PENDING",
        "Paiement espece, carte ou mobile money",
        "Passage a COMPLETED avec ticket client",
      ]}
    />
  )
}
