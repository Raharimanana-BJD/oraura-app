import { useEffect, useMemo, useState } from "react"
import { listen } from "@tauri-apps/api/event"
import { invoke } from "@tauri-apps/api/core"

import {
  CATALOG_UPDATED_EVENT,
  type CatalogCategory,
  type CatalogProduct,
  type CatalogState,
  type CreateCategoryInput,
  type CreateProductInput,
  type UpdateCategoryInput,
  type UpdateProductInput,
} from "@/lib/catalog"

const emptyCatalog: CatalogState = {
  categories: [],
  products: [],
}

function getErrorMessage(err: unknown) {
  if (typeof err === "string") {
    return err
  }

  if (
    typeof err === "object" &&
    err !== null &&
    "message" in err &&
    typeof err.message === "string"
  ) {
    return err.message
  }

  return "Chargement du catalogue impossible."
}

export function useCatalog() {
  const [catalog, setCatalog] = useState<CatalogState>(emptyCatalog)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function refreshCatalog() {
    try {
      const nextCatalog = await invoke<CatalogState>("list_catalog")
      setCatalog(nextCatalog)
      setError(null)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void refreshCatalog()

    let isMounted = true
    let unlisten: (() => void) | undefined

    void listen(CATALOG_UPDATED_EVENT, () => {
      if (isMounted) {
        void refreshCatalog()
      }
    }).then((dispose) => {
      unlisten = dispose
    })

    return () => {
      isMounted = false
      unlisten?.()
    }
  }, [])

  const actions = useMemo(
    () => ({
      async refresh() {
        await refreshCatalog()
      },
      async createCategory(input: CreateCategoryInput) {
        const created = await invoke<CatalogCategory>("create_category", { input })
        await refreshCatalog()
        return created
      },
      async updateCategory(categoryId: string, input: UpdateCategoryInput) {
        const updated = await invoke<CatalogCategory>("update_category", {
          categoryId,
          input,
        })
        await refreshCatalog()
        return updated
      },
      async deleteCategory(categoryId: string) {
        await invoke("delete_category", { categoryId })
        await refreshCatalog()
      },
      async createProduct(input: CreateProductInput) {
        const created = await invoke<CatalogProduct>("create_product", { input })
        await refreshCatalog()
        return created
      },
      async updateProduct(productId: string, input: UpdateProductInput) {
        const updated = await invoke<CatalogProduct>("update_product", {
          productId,
          input,
        })
        await refreshCatalog()
        return updated
      },
      async deleteProduct(productId: string) {
        await invoke("delete_product", { productId })
        await refreshCatalog()
      },
    }),
    []
  )

  return {
    ...catalog,
    ...actions,
    isLoading,
    error,
  }
}
