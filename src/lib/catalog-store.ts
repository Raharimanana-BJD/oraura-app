export const CATALOG_UPDATED_EVENT = "oraura:catalog-updated"

const CATALOG_STORAGE_KEY = "oraura.catalog"

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

const seedCatalog: CatalogState = {
  categories: [
    { id: "cat-burgers", name: "Burgers", description: "Burgers signatures", isActive: true },
    { id: "cat-wraps", name: "Wraps", description: "Wraps et tacos", isActive: true },
    { id: "cat-sides", name: "Accompagnements", description: "Frites et snacks", isActive: true },
    { id: "cat-drinks", name: "Boissons", description: "Boissons fraiches", isActive: true },
  ],
  products: [
    { id: "burger-classic", name: "Burger Classic", categoryId: "cat-burgers", price: 12000, isActive: true },
    { id: "burger-double", name: "Double Burger Bacon", categoryId: "cat-burgers", price: 19500, isActive: true },
    { id: "wrap-crispy", name: "Wrap poulet crispy", categoryId: "cat-wraps", price: 14500, isActive: true },
    { id: "tacos-xl", name: "Menu Tacos XL", categoryId: "cat-wraps", price: 22000, isActive: true },
    { id: "fries-large", name: "Frites XL", categoryId: "cat-sides", price: 6000, isActive: true },
    { id: "nuggets-12", name: "Nuggets x12", categoryId: "cat-sides", price: 16000, isActive: true },
    { id: "coca-33", name: "Coca-Cola 33cl", categoryId: "cat-drinks", price: 3500, isActive: true },
    { id: "orange-juice", name: "Jus d'orange", categoryId: "cat-drinks", price: 4000, isActive: true },
  ],
}

function canUseStorage() {
  return typeof window !== "undefined"
}

function notifyCatalogUpdated() {
  if (!canUseStorage()) {
    return
  }

  window.dispatchEvent(new CustomEvent(CATALOG_UPDATED_EVENT))
}

function writeCatalogState(state: CatalogState) {
  if (!canUseStorage()) {
    return
  }

  window.localStorage.setItem(CATALOG_STORAGE_KEY, JSON.stringify(state))
  notifyCatalogUpdated()
}

export function readStoredCatalog() {
  if (!canUseStorage()) {
    return seedCatalog
  }

  const rawValue = window.localStorage.getItem(CATALOG_STORAGE_KEY)

  if (!rawValue) {
    writeCatalogState(seedCatalog)
    return seedCatalog
  }

  try {
    return JSON.parse(rawValue) as CatalogState
  } catch {
    writeCatalogState(seedCatalog)
    return seedCatalog
  }
}

export function createCategory(input: Omit<CatalogCategory, "id">) {
  const state = readStoredCatalog()
  const nextCategory: CatalogCategory = {
    ...input,
    id: crypto.randomUUID(),
  }

  writeCatalogState({
    ...state,
    categories: [nextCategory, ...state.categories],
  })

  return nextCategory
}

export function updateCategory(categoryId: string, updater: (category: CatalogCategory) => CatalogCategory) {
  const state = readStoredCatalog()

  writeCatalogState({
    ...state,
    categories: state.categories.map((category) =>
      category.id === categoryId ? updater(category) : category
    ),
  })
}

export function deleteCategory(categoryId: string) {
  const state = readStoredCatalog()

  writeCatalogState({
    categories: state.categories.filter((category) => category.id !== categoryId),
    products: state.products.filter((product) => product.categoryId !== categoryId),
  })
}

export function createProduct(input: Omit<CatalogProduct, "id">) {
  const state = readStoredCatalog()
  const nextProduct: CatalogProduct = {
    ...input,
    id: crypto.randomUUID(),
  }

  writeCatalogState({
    ...state,
    products: [nextProduct, ...state.products],
  })

  return nextProduct
}

export function updateProduct(productId: string, updater: (product: CatalogProduct) => CatalogProduct) {
  const state = readStoredCatalog()

  writeCatalogState({
    ...state,
    products: state.products.map((product) =>
      product.id === productId ? updater(product) : product
    ),
  })
}

export function deleteProduct(productId: string) {
  const state = readStoredCatalog()

  writeCatalogState({
    ...state,
    products: state.products.filter((product) => product.id !== productId),
  })
}
