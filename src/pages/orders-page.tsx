import { useEffect, useMemo, useState, useTransition } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  CookingPotIcon,
  Loader2Icon,
  MinusIcon,
  PlusIcon,
  ReceiptTextIcon,
  ShoppingCartIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";

import { useAppSettings } from "@/hooks/use-app-settings";
import { useCatalog } from "@/hooks/use-catalog";
import { useOrders } from "@/hooks/use-orders";
import type { AppSettings } from "@/lib/app-settings";
import type { CatalogProduct } from "@/lib/catalog";
import type { LocalOrder } from "@/lib/orders";
import { PageLoadingSkeleton } from "@/components/page-loading-skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

type CartItem = CatalogProduct & {
  category: string;
  quantity: number;
};

type PosProduct = CatalogProduct & {
  category: string;
};

function formatCurrency(value: number, currencySymbol: string) {
  return `${value.toLocaleString("fr-FR")} ${currencySymbol}`;
}

function buildKitchenTicket(
  order: LocalOrder,
) {
  const lines = [
    `Commande ${order.orderNumber}`,
    `Mode: ${order.orderMode}`,
    "------------------------------",
    ...order.lines.map((line) => `${line.quantity} x ${line.name}`),
  ];

  if (order.customerName.trim()) {
    lines.push("------------------------------", `Client: ${order.customerName.trim()}`);
  }

  if (order.notes.trim()) {
    lines.push("------------------------------", `Notes: ${order.notes.trim()}`);
  }

  lines.push("------------------------------", "Preparation en cours");

  return lines.join("\n");
}

export function OrdersPage() {
  const settings = useAppSettings();
  const {
    categories: catalogCategories,
    products,
    isLoading: isCatalogLoading,
    error: catalogError,
  } = useCatalog();
  const { createOrder } = useOrders();
  const [activeCategory, setActiveCategory] = useState("Tous");
  const [orderMode, setOrderMode] = useState(settings.defaultOrderMode);
  const [customerName, setCustomerName] = useState("");
  const [notes, setNotes] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isSubmitting, startSubmitting] = useTransition();

  useEffect(() => {
    setOrderMode(settings.defaultOrderMode);
  }, [settings.defaultOrderMode]);

  const categoryLookup = useMemo(
    () =>
      Object.fromEntries(
        catalogCategories.map((category) => [category.id, category]),
      ),
    [catalogCategories],
  );

  const availableProducts = useMemo<PosProduct[]>(
    () =>
      products
        .filter((product) => product.isActive)
        .filter((product) => categoryLookup[product.categoryId]?.isActive)
        .map((product) => ({
          ...product,
          category:
            categoryLookup[product.categoryId]?.name ?? "Sans categorie",
        })),
    [categoryLookup, products],
  );

  const categoryNames = useMemo(
    () => ["Tous", ...new Set(availableProducts.map((item) => item.category))],
    [availableProducts],
  );

  const filteredCatalog = useMemo(() => {
    if (activeCategory === "Tous") {
      return availableProducts;
    }

    return availableProducts.filter((item) => item.category === activeCategory);
  }, [activeCategory, availableProducts]);

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart],
  );

  const totalItems = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart],
  );

  if (isCatalogLoading) {
    return <PageLoadingSkeleton />;
  }

  if (catalogError) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-10 lg:px-6">
        <div className="max-w-xl rounded-2xl border border-destructive/40 bg-destructive/5 px-6 py-8 text-sm text-destructive">
          {catalogError}
        </div>
      </div>
    );
  }

  function addToCart(product: PosProduct) {
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id);

      if (!existing) {
        return [...current, { ...product, quantity: 1 }];
      }

      return current.map((item) =>
        item.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item,
      );
    });
  }

  function changeQuantity(productId: string, delta: number) {
    setCart((current) =>
      current
        .map((item) =>
          item.id === productId
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  }

  function removeFromCart(productId: string) {
    setCart((current) => current.filter((item) => item.id !== productId));
  }

  async function submitOrder() {
    if (!cart.length) {
      toast.error("Ajoute au moins un produit avant de valider.");
      return;
    }

    const orderNumber = `${settings.orderPrefix}-${Date.now().toString().slice(-4)}`;

    const createdOrder = await createOrder({
      orderNumber,
      customerName: customerName.trim(),
      orderMode,
      notes: notes.trim(),
      lines: cart.map((item) => ({
        productId: item.id,
        quantity: item.quantity,
      })),
    });

    let printErrorMessage: string | null = null;
    if (settings.kitchenPrinterEnabled && settings.autoPrintKitchen) {
      try {
        await invoke("print_to_kitchen", {
          printerIp: settings.kitchenPrinterIp,
          printerPort: settings.kitchenPrinterPort,
          content: buildKitchenTicket(createdOrder),
        });
      } catch (error) {
        printErrorMessage =
          error instanceof Error
            ? error.message
            : "Echec d'impression du ticket cuisine.";
      }
    }

    setCart([]);
    setCustomerName("");
    setNotes("");
    setOrderMode(settings.defaultOrderMode);

    if (printErrorMessage) {
      toast.error(
        `Commande ${createdOrder.orderNumber} enregistree, mais l'impression cuisine a echoue: ${printErrorMessage}`,
      );
      return;
    }

    toast.success(
      settings.autoPrintKitchen && settings.kitchenPrinterEnabled
        ? `Commande ${createdOrder.orderNumber} enregistree et imprimee.`
        : `Commande ${createdOrder.orderNumber} enregistree.`,
    );
  }

  function handleSubmit() {
    startSubmitting(async () => {
      try {
        await submitOrder();
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Echec de validation de commande.";
        toast.error(message);
      }
    });
  }

  return (
    <div className="grid flex-1 gap-6 px-4 py-4 lg:grid-cols-[1.4fr_0.8fr] lg:px-6">
      <div className="grid gap-6">
        <Card className="border-none bg-linear-to-br from-primary/10 via-background to-background shadow-sm">
          <CardHeader className="gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{settings.businessName}</Badge>
              <Badge variant="outline">
                Mode par defaut: {settings.defaultOrderMode}
              </Badge>
              <Badge variant="outline">
                Imprimante:{" "}
                {settings.kitchenPrinterEnabled ? "active" : "desactivee"}
              </Badge>
            </div>
            <div>
              <CardTitle className="text-2xl line-clamp-1">
                Prise de commande
              </CardTitle>
              <CardDescription className="line-clamp-1">
                Cette validation utilise directement la configuration de la page
                Parametres pour l&apos;impression cuisine.
              </CardDescription>
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="line-clamp-1">
              Selection des produits
            </CardTitle>
            <CardDescription className="line-clamp-1">
              Choisis une categorie puis ajoute les articles au panier.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="flex flex-wrap gap-2">
              {categoryNames.map((category) => (
                <Button
                  key={category}
                  variant={activeCategory === category ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveCategory(category)}
                >
                  {category}
                </Button>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filteredCatalog.length ? (
                filteredCatalog.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => addToCart(product)}
                    className="rounded-2xl border bg-card p-4 text-left shadow-xs transition hover:border-primary/40 hover:bg-primary/5"
                  >
                    <div className="flex flex-col items-start gap-3">
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {product.category}
                        </p>
                      </div>
                      <Badge variant="outline">
                        {formatCurrency(product.price, settings.currencySymbol)}
                      </Badge>
                    </div>
                  </button>
                ))
              ) : (
                <div className="col-span-full rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                  Aucun produit actif dans cette categorie. Configure le
                  catalogue pour continuer.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCartIcon className="size-4" />
              Panier en cours
            </CardTitle>
            <CardDescription>
              {totalItems} article(s) selectionne(s) pour{" "}
              {formatCurrency(subtotal, settings.currencySymbol)}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="customer-name">Nom client</Label>
                <Input
                  id="customer-name"
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                  placeholder="Optionnel"
                />
              </div>

              <div className="grid gap-2">
                <Label>Mode de commande</Label>
                <Select
                  value={orderMode}
                  onValueChange={(value) =>
                    setOrderMode(value as AppSettings["defaultOrderMode"])
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sur-place">Sur place</SelectItem>
                    <SelectItem value="a-emporter">A emporter</SelectItem>
                    <SelectItem value="livraison">Livraison</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="order-notes">Notes cuisine</Label>
                <textarea
                  id="order-notes"
                  rows={4}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Ex: sans oignons, bien cuit..."
                  className="flex min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                />
              </div>
            </div>

            <Separator />

            <div className="grid gap-3">
              {cart.length ? (
                cart.map((item) => (
                  <div key={item.id} className="rounded-xl border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatCurrency(item.price, settings.currencySymbol)}{" "}
                          l&apos;unite
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFromCart(item.id)}
                      >
                        <Trash2Icon />
                        <span className="sr-only">Supprimer</span>
                      </Button>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon-sm"
                          onClick={() => changeQuantity(item.id, -1)}
                        >
                          <MinusIcon />
                        </Button>
                        <span className="min-w-8 text-center text-sm font-medium">
                          {item.quantity}
                        </span>
                        <Button
                          variant="outline"
                          size="icon-sm"
                          onClick={() => changeQuantity(item.id, 1)}
                        >
                          <PlusIcon />
                        </Button>
                      </div>
                      <span className="text-sm font-semibold">
                        {formatCurrency(
                          item.price * item.quantity,
                          settings.currencySymbol,
                        )}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                  Le panier est vide.
                </div>
              )}
            </div>

            <Separator />

            <div className="grid gap-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Sous-total</span>
                <span className="font-medium">
                  {formatCurrency(subtotal, settings.currencySymbol)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Impression cuisine
                </span>
                <span className="inline-flex items-center gap-2">
                  <CookingPotIcon className="size-4 text-primary" />
                  {settings.kitchenPrinterEnabled && settings.autoPrintKitchen
                    ? `${settings.kitchenPrinterIp}:${settings.kitchenPrinterPort}`
                    : "Desactivee"}
                </span>
              </div>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || !cart.length}
              >
                {isSubmitting ? (
                  <Loader2Icon className="animate-spin" />
                ) : (
                  <ReceiptTextIcon />
                )}
                Valider la commande
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
