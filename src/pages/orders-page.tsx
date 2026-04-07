import { RoutePlaceholderPage } from "@/components/route-placeholder-page"

export function OrdersPage() {
  return (
    <RoutePlaceholderPage
      eyebrow="Prise de commande"
      title="Interface POS tactile"
      description="Cette vue accueillera la grille de produits, le panier lateral, les notes de preparation et l'envoi de commande vers la cuisine."
      highlights={[
        "Grille de produits par categorie",
        "Panier local avec quantites et remarques",
        "Validation rapide puis impression cuisine",
      ]}
    />
  )
}
