import { useEffect, useMemo, useState } from "react"

import {
  CATALOG_UPDATED_EVENT,
  createCategory,
  createProduct,
  deleteCategory,
  deleteProduct,
  readStoredCatalog,
  updateCategory,
  updateProduct,
} from "@/lib/catalog-store"

export function useCatalog() {
  const [catalog, setCatalog] = useState(readStoredCatalog)

  useEffect(() => {
    const syncCatalog = () => {
      setCatalog(readStoredCatalog())
    }

    window.addEventListener("storage", syncCatalog)
    window.addEventListener(CATALOG_UPDATED_EVENT, syncCatalog)

    return () => {
      window.removeEventListener("storage", syncCatalog)
      window.removeEventListener(CATALOG_UPDATED_EVENT, syncCatalog)
    }
  }, [])

  const actions = useMemo(
    () => ({
      createCategory,
      updateCategory,
      deleteCategory,
      createProduct,
      updateProduct,
      deleteProduct,
    }),
    []
  )

  return {
    ...catalog,
    ...actions,
  }
}
