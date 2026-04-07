import type { ReactNode } from "react"
import { useEffect, useMemo, useState, useTransition } from "react"
import {
  FolderTreeIcon,
  Package2Icon,
  PencilIcon,
  PlusIcon,
  SaveIcon,
  Trash2Icon,
} from "lucide-react"
import { toast } from "sonner"

import { useCatalog } from "@/hooks/use-catalog"
import type { CatalogCategory, CatalogProduct } from "@/lib/catalog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type CategoryDraft = {
  name: string
  description: string
  isActive: boolean
}

type ProductDraft = {
  name: string
  categoryId: string
  price: string
  isActive: boolean
}

const defaultCategoryDraft: CategoryDraft = {
  name: "",
  description: "",
  isActive: true,
}

const defaultProductDraft: ProductDraft = {
  name: "",
  categoryId: "",
  price: "",
  isActive: true,
}

function formatCurrency(value: number) {
  return `${value.toLocaleString("fr-FR")} Ar`
}

function productCountByCategory(products: CatalogProduct[], categoryId: string) {
  return products.filter((product) => product.categoryId === categoryId).length
}

export function CatalogPage() {
  const {
    categories,
    products,
    isLoading,
    error,
    createCategory,
    updateCategory,
    deleteCategory,
    createProduct,
    updateProduct,
    deleteProduct,
  } = useCatalog()

  const [isCreateCategoryOpen, setIsCreateCategoryOpen] = useState(false)
  const [isCreateProductOpen, setIsCreateProductOpen] = useState(false)
  const [categoryDraft, setCategoryDraft] = useState(defaultCategoryDraft)
  const [productDraft, setProductDraft] = useState<ProductDraft>({
    ...defaultProductDraft,
    categoryId: categories[0]?.id ?? "",
  })
  const [isMutating, startMutation] = useTransition()

  const activeCategories = useMemo(
    () => categories.filter((category) => category.isActive),
    [categories]
  )

  useEffect(() => {
    if (!productDraft.categoryId && categories[0]?.id) {
      setProductDraft((current) => ({
        ...current,
        categoryId: categories[0].id,
      }))
    }
  }, [categories, productDraft.categoryId])

  function handleCreateCategory() {
    if (!categoryDraft.name.trim()) {
      toast.error("Le nom de categorie est requis.")
      return
    }

    startMutation(async () => {
      try {
        await createCategory({
          name: categoryDraft.name.trim(),
          description: categoryDraft.description.trim(),
          isActive: categoryDraft.isActive,
        })

        setCategoryDraft(defaultCategoryDraft)
        setIsCreateCategoryOpen(false)
        toast.success("Categorie ajoutee.")
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Creation de categorie impossible.")
      }
    })
  }

  function handleCreateProduct() {
    const price = Number(productDraft.price)

    if (
      !productDraft.name.trim() ||
      !productDraft.categoryId ||
      !Number.isFinite(price)
    ) {
      toast.error("Complete les champs produit avant validation.")
      return
    }

    startMutation(async () => {
      try {
        await createProduct({
          name: productDraft.name.trim(),
          categoryId: productDraft.categoryId,
          price,
          isActive: productDraft.isActive,
        })

        setProductDraft({
          ...defaultProductDraft,
          categoryId: categories[0]?.id ?? "",
        })
        setIsCreateProductOpen(false)
        toast.success("Produit ajoute.")
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Creation de produit impossible.")
      }
    })
  }

  if (isLoading) {
    return (
      <div className="grid flex-1 gap-6 px-4 py-4 lg:px-6">
        <Card className="border-none bg-linear-to-br from-primary/10 via-background to-background shadow-sm">
          <CardHeader className="gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Skeleton className="h-6 w-28 rounded-full" />
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-6 w-36 rounded-full" />
            </div>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="grid gap-3">
                <Skeleton className="h-8 w-80 max-w-full" />
                <Skeleton className="h-4 w-[32rem] max-w-full" />
                <Skeleton className="h-4 w-[26rem] max-w-full" />
              </div>
              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-10 w-44" />
                <Skeleton className="h-10 w-36" />
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-44" />
              <Skeleton className="h-4 w-72" />
            </CardHeader>
            <CardContent className="grid gap-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <CatalogCardSkeleton key={`category-skeleton-${index}`} />
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-36" />
              <Skeleton className="h-4 w-72" />
            </CardHeader>
            <CardContent className="grid gap-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <CatalogCardSkeleton key={`product-skeleton-${index}`} />
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="grid flex-1 gap-6 px-4 py-4 lg:px-6">
      <Card className="border-none bg-linear-to-br from-primary/10 via-background to-background shadow-sm">
        <CardHeader className="gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{categories.length} categorie(s)</Badge>
            <Badge variant="outline">{products.length} produit(s)</Badge>
            <Badge variant="outline">
              {activeCategories.length} categorie(s) active(s)
            </Badge>
          </div>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <CardTitle className="text-2xl">
                Catalogue produits et categories
              </CardTitle>
              <CardDescription>
                Cette page alimente directement la prise de commande. Tout produit
                actif apparait automatiquement dans `/orders`.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Dialog open={isCreateCategoryOpen} onOpenChange={setIsCreateCategoryOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <FolderTreeIcon />
                    Ajouter une categorie
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nouvelle categorie</DialogTitle>
                    <DialogDescription>
                      Cree une categorie visible dans la prise de commande.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4">
                    <Field
                      label="Nom"
                      input={
                        <Input
                          value={categoryDraft.name}
                          onChange={(event) =>
                            setCategoryDraft((current) => ({
                              ...current,
                              name: event.target.value,
                            }))
                          }
                          placeholder="Ex: Desserts"
                        />
                      }
                    />
                    <Field
                      label="Description"
                      input={
                        <Input
                          value={categoryDraft.description}
                          onChange={(event) =>
                            setCategoryDraft((current) => ({
                              ...current,
                              description: event.target.value,
                            }))
                          }
                          placeholder="Ex: Glaces et douceurs"
                        />
                      }
                    />
                    <ToggleLine
                      checked={categoryDraft.isActive}
                      onCheckedChange={(checked) =>
                        setCategoryDraft((current) => ({
                          ...current,
                          isActive: checked,
                        }))
                      }
                      label="Categorie active"
                    />
                  </div>
                  <DialogFooter>
                    <Button onClick={handleCreateCategory} disabled={isMutating}>
                      <PlusIcon />
                      Ajouter la categorie
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={isCreateProductOpen} onOpenChange={setIsCreateProductOpen}>
                <DialogTrigger asChild>
                  <Button disabled={!categories.length}>
                    <Package2Icon />
                    Ajouter un produit
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nouveau produit</DialogTitle>
                    <DialogDescription>
                      Ajoute un produit qui sera disponible a la vente s&apos;il est actif.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4">
                    <Field
                      label="Nom"
                      input={
                        <Input
                          value={productDraft.name}
                          onChange={(event) =>
                            setProductDraft((current) => ({
                              ...current,
                              name: event.target.value,
                            }))
                          }
                          placeholder="Ex: Sundae caramel"
                        />
                      }
                    />
                    <Field
                      label="Categorie"
                      input={
                        <Select
                          value={productDraft.categoryId}
                          onValueChange={(value) =>
                            setProductDraft((current) => ({
                              ...current,
                              categoryId: value,
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Choisir une categorie" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((category) => (
                              <SelectItem key={category.id} value={category.id}>
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      }
                    />
                    <Field
                      label="Prix"
                      input={
                        <Input
                          type="number"
                          value={productDraft.price}
                          onChange={(event) =>
                            setProductDraft((current) => ({
                              ...current,
                              price: event.target.value,
                            }))
                          }
                          placeholder="0"
                        />
                      }
                    />
                    <ToggleLine
                      checked={productDraft.isActive}
                      onCheckedChange={(checked) =>
                        setProductDraft((current) => ({
                          ...current,
                          isActive: checked,
                        }))
                      }
                      label="Produit actif"
                    />
                  </div>
                  <DialogFooter>
                    <Button onClick={handleCreateProduct} disabled={isMutating}>
                      <PlusIcon />
                      Ajouter le produit
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <CardHeader>
            <CardTitle>Categories existantes</CardTitle>
            <CardDescription>
              Les modifications et suppressions demandent confirmation.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {isLoading ? (
              <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
                Chargement du catalogue...
              </div>
            ) : null}
            {error ? (
              <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-sm text-destructive">
                {error}
              </div>
            ) : null}
            {categories.map((category) => (
              <CategoryCard
                key={category.id}
                category={category}
                productCount={productCountByCategory(products, category.id)}
                onSave={(nextCategory) => {
                  startMutation(async () => {
                    try {
                      await updateCategory(category.id, nextCategory)
                      toast.success(`Categorie ${nextCategory.name} mise a jour.`)
                    } catch (err) {
                      toast.error(
                        err instanceof Error
                          ? err.message
                          : "Mise a jour de categorie impossible."
                      )
                    }
                  })
                }}
                onDelete={() => {
                  startMutation(async () => {
                    try {
                      await deleteCategory(category.id)
                      toast.success(`Categorie ${category.name} supprimee.`)
                    } catch (err) {
                      toast.error(
                        err instanceof Error
                          ? err.message
                          : "Suppression de categorie impossible."
                      )
                    }
                  })
                }}
              />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Produits existants</CardTitle>
            <CardDescription>
              Ouvre un formulaire en dialogue pour modifier une fiche produit.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {isLoading ? (
              <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
                Chargement des produits...
              </div>
            ) : null}
            {error ? (
              <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-sm text-destructive">
                {error}
              </div>
            ) : null}
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                categories={categories}
                onSave={(nextProduct) => {
                  startMutation(async () => {
                    try {
                      await updateProduct(product.id, nextProduct)
                      toast.success(`Produit ${nextProduct.name} mis a jour.`)
                    } catch (err) {
                      toast.error(
                        err instanceof Error
                          ? err.message
                          : "Mise a jour de produit impossible."
                      )
                    }
                  })
                }}
                onDelete={() => {
                  startMutation(async () => {
                    try {
                      await deleteProduct(product.id)
                      toast.success(`Produit ${product.name} supprime.`)
                    } catch (err) {
                      toast.error(
                        err instanceof Error
                          ? err.message
                          : "Suppression de produit impossible."
                      )
                    }
                  })
                }}
              />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Field({ label, input }: { label: string; input: ReactNode }) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      {input}
    </div>
  )
}

function ToggleLine({
  checked,
  onCheckedChange,
  label,
}: {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  label: string
}) {
  return (
    <label className="flex items-center gap-3 rounded-xl border p-3">
      <Checkbox
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(Boolean(value))}
      />
      <span className="text-sm">{label}</span>
    </label>
  )
}

function CategoryCard({
  category,
  productCount,
  onSave,
  onDelete,
}: {
  category: CatalogCategory
  productCount: number
  onSave: (category: CatalogCategory) => void
  onDelete: () => void
}) {
  const [draft, setDraft] = useState(category)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isSaveConfirmOpen, setIsSaveConfirmOpen] = useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)

  useEffect(() => {
    setDraft(category)
  }, [category])

  return (
    <div className="rounded-2xl border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="grid gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{category.name}</p>
            <Badge variant="outline">{productCount} produit(s)</Badge>
            <Badge variant={category.isActive ? "default" : "outline"}>
              {category.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{category.description || "Sans description"}</p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon-sm">
                <PencilIcon />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Modifier la categorie</DialogTitle>
                <DialogDescription>
                  Mets a jour les informations puis confirme l&apos;enregistrement.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4">
                <Field
                  label="Nom"
                  input={
                    <Input
                      value={draft.name}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                    />
                  }
                />
                <Field
                  label="Description"
                  input={
                    <Input
                      value={draft.description}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          description: event.target.value,
                        }))
                      }
                    />
                  }
                />
                <ToggleLine
                  checked={draft.isActive}
                  onCheckedChange={(checked) =>
                    setDraft((current) => ({
                      ...current,
                      isActive: checked,
                    }))
                  }
                  label="Categorie active"
                />
              </div>
              <DialogFooter>
                <Button onClick={() => setIsSaveConfirmOpen(true)}>
                  <SaveIcon />
                  Enregistrer
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button variant="outline" size="icon-sm" onClick={() => setIsDeleteConfirmOpen(true)}>
            <Trash2Icon />
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={isSaveConfirmOpen}
        onOpenChange={setIsSaveConfirmOpen}
        title="Confirmer la modification"
        description={`Veux-tu vraiment enregistrer les changements de la categorie ${draft.name || "sans nom"} ?`}
        confirmLabel="Oui, enregistrer"
        onConfirm={() => {
          onSave(draft)
          setIsSaveConfirmOpen(false)
          setIsEditOpen(false)
        }}
      />

      <ConfirmDialog
        open={isDeleteConfirmOpen}
        onOpenChange={setIsDeleteConfirmOpen}
        title="Confirmer la suppression"
        description={`La categorie ${category.name} et ses produits associes seront supprimes. Continuer ?`}
        confirmLabel="Oui, supprimer"
        confirmVariant="destructive"
        onConfirm={() => {
          onDelete()
          setIsDeleteConfirmOpen(false)
        }}
      />
    </div>
  )
}

function ProductCard({
  product,
  categories,
  onSave,
  onDelete,
}: {
  product: CatalogProduct
  categories: CatalogCategory[]
  onSave: (product: CatalogProduct) => void
  onDelete: () => void
}) {
  const [draft, setDraft] = useState({
    ...product,
    price: String(product.price),
  })
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isSaveConfirmOpen, setIsSaveConfirmOpen] = useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)

  const categoryName =
    categories.find((category) => category.id === product.categoryId)?.name ??
    "Sans categorie"

  useEffect(() => {
    setDraft({
      ...product,
      price: String(product.price),
    })
  }, [product])

  return (
    <div className="rounded-2xl border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="grid gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{product.name}</p>
            <Badge variant="outline">{categoryName}</Badge>
            <Badge variant="outline">{formatCurrency(product.price)}</Badge>
            <Badge variant={product.isActive ? "default" : "outline"}>
              {product.isActive ? "Actif" : "Inactif"}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon-sm">
                <PencilIcon />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Modifier le produit</DialogTitle>
                <DialogDescription>
                  Mets a jour la fiche puis confirme avant enregistrement.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4">
                <Field
                  label="Nom"
                  input={
                    <Input
                      value={draft.name}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                    />
                  }
                />
                <Field
                  label="Categorie"
                  input={
                    <Select
                      value={draft.categoryId}
                      onValueChange={(value) =>
                        setDraft((current) => ({
                          ...current,
                          categoryId: value,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Categorie" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  }
                />
                <Field
                  label="Prix"
                  input={
                    <Input
                      type="number"
                      value={draft.price}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          price: event.target.value,
                        }))
                      }
                    />
                  }
                />
                <ToggleLine
                  checked={draft.isActive}
                  onCheckedChange={(checked) =>
                    setDraft((current) => ({
                      ...current,
                      isActive: checked,
                    }))
                  }
                  label="Produit actif"
                />
              </div>
              <DialogFooter>
                <Button onClick={() => setIsSaveConfirmOpen(true)}>
                  <SaveIcon />
                  Enregistrer
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button variant="outline" size="icon-sm" onClick={() => setIsDeleteConfirmOpen(true)}>
            <Trash2Icon />
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={isSaveConfirmOpen}
        onOpenChange={setIsSaveConfirmOpen}
        title="Confirmer la modification"
        description={`Veux-tu vraiment enregistrer les changements du produit ${draft.name || "sans nom"} ?`}
        confirmLabel="Oui, enregistrer"
        onConfirm={() => {
          onSave({
            ...product,
            name: draft.name.trim(),
            categoryId: draft.categoryId,
            price: Number(draft.price),
            isActive: draft.isActive,
          })
          setIsSaveConfirmOpen(false)
          setIsEditOpen(false)
        }}
      />

      <ConfirmDialog
        open={isDeleteConfirmOpen}
        onOpenChange={setIsDeleteConfirmOpen}
        title="Confirmer la suppression"
        description={`Le produit ${product.name} sera supprime du catalogue. Continuer ?`}
        confirmLabel="Oui, supprimer"
        confirmVariant="destructive"
        onConfirm={() => {
          onDelete()
          setIsDeleteConfirmOpen(false)
        }}
      />
    </div>
  )
}

function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  confirmVariant = "default",
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel: string
  onConfirm: () => void
  confirmVariant?: "default" | "destructive"
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            variant={confirmVariant === "destructive" ? "destructive" : "default"}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function CatalogCardSkeleton() {
  return (
    <div className="rounded-2xl border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="grid flex-1 gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-5 w-24 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton className="h-4 w-64 max-w-full" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="size-9 rounded-md" />
          <Skeleton className="size-9 rounded-md" />
        </div>
      </div>
    </div>
  )
}
