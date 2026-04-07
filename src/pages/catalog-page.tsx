import { RoutePlaceholderPage } from "@/components/route-placeholder-page"

export function CatalogPage() {
  return (
    <RoutePlaceholderPage
      eyebrow="Catalogue"
      title="Produits et categories"
      description="Le catalogue centralisera les articles du menu, les prix, l'activation des produits et les categories visibles au comptoir."
      highlights={[
        "CRUD categories et produits",
        "Activation rapide d'un article",
        "Base prete pour le schema Prisma",
      ]}
    />
  )
}
