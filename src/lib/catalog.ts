export const CATALOG_UPDATED_EVENT = "oraura://catalog-updated"

export type CatalogCategory = {
  id: string
  name: string
  description: string
  isActive: boolean
}

export type CatalogProduct = {
  id: string
  name: string
  categoryId: string
  price: number
  isActive: boolean
}

export type CatalogState = {
  categories: CatalogCategory[]
  products: CatalogProduct[]
}

export type CreateCategoryInput = Omit<CatalogCategory, "id">
export type UpdateCategoryInput = Omit<CatalogCategory, "id">
export type CreateProductInput = Omit<CatalogProduct, "id">
export type UpdateProductInput = Omit<CatalogProduct, "id">
