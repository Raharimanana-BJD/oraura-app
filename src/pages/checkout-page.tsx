import * as React from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  CreditCardIcon,
  Loader2Icon,
  ReceiptIcon,
  WalletIcon,
} from "lucide-react";
import { toast } from "sonner";

import { useOrders } from "@/hooks/use-orders";
import { useAppSettings } from "@/hooks/use-app-settings";
import type { LocalOrder, PaymentMethod } from "@/lib/orders";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageLoadingSkeleton } from "@/components/page-loading-skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function formatCurrency(value: number, currencySymbol: string) {
  return `${value.toLocaleString("fr-FR")} ${currencySymbol}`;
}

function paymentMethodLabel(value: PaymentMethod) {
  if (value === "CARD") return "Carte";
  if (value === "MOBILE_MONEY") return "Mobile money";
  return "Especes";
}

function buildReceiptTicket(
  order: LocalOrder,
  currencySymbol: string,
  businessName: string,
  paymentMethod: PaymentMethod,
) {
  const lines = [
    businessName,
    "TICKET CLIENT",
    "------------------------------",
    `Commande: ${order.orderNumber}`,
    `Mode: ${order.orderMode}`,
    `Paiement: ${paymentMethodLabel(paymentMethod)}`,
    "------------------------------",
    ...order.lines.map(
      (line) =>
        `${line.quantity} x ${line.name} - ${formatCurrency(
          line.unitPrice * line.quantity,
          currencySymbol,
        )}`,
    ),
    "------------------------------",
    `Total: ${formatCurrency(order.totalAmount, currencySymbol)}`,
  ];

  if (order.customerName.trim()) {
    lines.splice(4, 0, `Client: ${order.customerName.trim()}`);
  }

  if (order.notes.trim()) {
    lines.push(`Note: ${order.notes.trim()}`);
  }

  lines.push("------------------------------", "Merci pour votre visite.");

  return lines.join("\n");
}

export function CheckoutPage() {
  const settings = useAppSettings();
  const { orders, completePayment, isLoading, error } = useOrders();

  const pendingOrders = orders.filter(
    (order) => order.paymentStatus === "PENDING",
  );
  const completedToday = orders.filter(
    (order) => order.paymentStatus === "COMPLETED",
  );

  if (isLoading) {
    return <PageLoadingSkeleton />;
  }

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-10 lg:px-6">
        <div className="max-w-xl rounded-2xl border border-destructive/40 bg-destructive/5 px-6 py-8 text-sm text-destructive">
          {error}
        </div>
      </div>
    );
  }

  async function handleComplete(order: LocalOrder, paymentMethod: PaymentMethod) {
    await completePayment(order.id, paymentMethod);

    if (settings.printCustomerReceipt && settings.cashierPrinterEnabled) {
      const ticket = buildReceiptTicket(
        order,
        settings.currencySymbol,
        settings.businessName,
        paymentMethod,
      );

      try {
        await invoke("print_to_kitchen", {
          printerIp: settings.cashierPrinterIp,
          printerPort: settings.cashierPrinterPort,
          content: ticket,
        });
        toast.success(
          `${order.orderNumber} reglee via ${paymentMethodLabel(paymentMethod)} et imprimee en caisse.`,
        );
        return;
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Echec d'impression du ticket client.";
        toast.error(
          `${order.orderNumber} reglee, mais le ticket client n'a pas ete imprime: ${message}`,
        );
        return;
      }
    }

    toast.success(
      `${order.orderNumber} reglee via ${paymentMethodLabel(paymentMethod)}.`,
    );
  }

  return (
    <div className="grid flex-1 gap-6 px-4 py-4 lg:grid-cols-[1.2fr_0.8fr] lg:px-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="line-clamp-1">
                Commandes a encaisser
              </CardTitle>
              <CardDescription className="line-clamp-1">
                Les commandes issues de `/orders` arrivent ici avec paiement en
                attente.
              </CardDescription>
            </div>
            <Badge variant="outline">{pendingOrders.length} attente(s)</Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4">
          {pendingOrders.length ? (
            pendingOrders.map((order) => (
              <CheckoutOrderCard
                key={order.id}
                order={order}
                currencySymbol={settings.currencySymbol}
                defaultPaymentMethod={
                  settings.defaultOrderMode === "livraison"
                    ? "MOBILE_MONEY"
                    : "CASH"
                }
                onComplete={handleComplete}
              />
            ))
          ) : (
            <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              Aucune commande en attente de paiement.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="line-clamp-1">Cloture en cours</CardTitle>
          <CardDescription className="line-clamp-1">
            Suivi rapide des encaissements deja termines.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="rounded-2xl border p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">
                Paiements termines
              </span>
              <Badge variant="outline">{completedToday.length}</Badge>
            </div>
          </div>
          <div className="rounded-2xl border p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">
                Impression client
              </span>
              <Badge variant="outline">
                {settings.printCustomerReceipt ? "Activee" : "Desactivee"}
              </Badge>
            </div>
          </div>
          <div className="rounded-2xl border p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">
                Imprimante caisse
              </span>
              <Badge variant="outline">
                {settings.cashierPrinterEnabled
                  ? `${settings.cashierPrinterIp}:${settings.cashierPrinterPort}`
                  : "Desactivee"}
              </Badge>
            </div>
          </div>
          {completedToday.slice(0, 5).map((order) => (
            <div key={order.id} className="rounded-2xl border p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{order.orderNumber}</p>
                  <p className="text-sm text-muted-foreground">
                    {paymentMethodLabel(order.paymentMethod ?? "CASH")}
                  </p>
                </div>
                <Badge variant="secondary">
                  {formatCurrency(order.totalAmount, settings.currencySymbol)}
                </Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function CheckoutOrderCard({
  order,
  currencySymbol,
  defaultPaymentMethod,
  onComplete,
}: {
  order: LocalOrder;
  currencySymbol: string;
  defaultPaymentMethod: PaymentMethod;
  onComplete: (order: LocalOrder, paymentMethod: PaymentMethod) => Promise<void>;
}) {
  const [paymentMethod, setPaymentMethod] =
    React.useState<PaymentMethod>(defaultPaymentMethod);
  const [isPending, startTransition] = React.useTransition();

  function handleComplete() {
    startTransition(async () => {
      await onComplete(order, paymentMethod);
    });
  }

  return (
    <div className="rounded-2xl border bg-card p-4 shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{order.orderNumber}</p>
          <p className="text-sm text-muted-foreground">
            {order.customerName || "Client non renseigne"} · {order.orderMode}
          </p>
        </div>
        <Badge variant="secondary">
          {formatCurrency(order.totalAmount, currencySymbol)}
        </Badge>
      </div>

      <div className="mt-4 grid gap-2 text-sm">
        {order.lines.map((line) => (
          <div
            key={`${order.id}-${line.productId}`}
            className="rounded-lg bg-muted/50 px-3 py-2"
          >
            {line.quantity} x {line.name}
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
        <Select
          value={paymentMethod}
          onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Choisir un paiement" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="CASH">
              <span className="inline-flex items-center gap-2">
                <WalletIcon className="size-4" />
                Especes
              </span>
            </SelectItem>
            <SelectItem value="CARD">
              <span className="inline-flex items-center gap-2">
                <CreditCardIcon className="size-4" />
                Carte
              </span>
            </SelectItem>
            <SelectItem value="MOBILE_MONEY">
              <span className="inline-flex items-center gap-2">
                <ReceiptIcon className="size-4" />
                Mobile money
              </span>
            </SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={handleComplete} disabled={isPending}>
          {isPending ? <Loader2Icon className="animate-spin" /> : null}
          Encaisser
        </Button>
      </div>
    </div>
  );
}
