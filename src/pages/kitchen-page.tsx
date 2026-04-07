import type { ReactNode } from "react"
import * as React from "react"
import { Clock3Icon, CookingPotIcon, PartyPopperIcon } from "lucide-react"
import { toast } from "sonner"

import { useOrders } from "@/hooks/use-orders"
import { useAppSettings } from "@/hooks/use-app-settings"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

function formatElapsed(createdAt: string) {
  const elapsed = Math.max(
    0,
    Math.round((Date.now() - new Date(createdAt).getTime()) / 60000)
  )
  return `${elapsed} min`
}

export function KitchenPage() {
  const settings = useAppSettings()
  const { orders, markReady, isLoading, error } = useOrders()

  const preparingOrders = orders.filter(
    (order) => order.kitchenStatus === "PREPARING" && order.paymentStatus === "PENDING"
  )
  const readyOrders = orders.filter(
    (order) => order.kitchenStatus === "READY" && order.paymentStatus === "PENDING"
  )

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-10 lg:px-6">
        <div className="rounded-2xl border border-dashed px-6 py-8 text-sm text-muted-foreground">
          Chargement des tickets cuisine...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-10 lg:px-6">
        <div className="max-w-xl rounded-2xl border border-destructive/40 bg-destructive/5 px-6 py-8 text-sm text-destructive">
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="grid flex-1 gap-6 px-4 py-4 lg:grid-cols-2 lg:px-6">
      <StatusColumn
        icon={<CookingPotIcon className="size-4" />}
        title="En preparation"
        description="Tickets envoyes par la prise de commande."
        badge={`${preparingOrders.length} ticket(s)`}
      >
        {preparingOrders.length ? (
          preparingOrders.map((order) => (
            <KitchenOrderCard
              key={order.id}
              orderNumber={order.orderNumber}
              customerName={order.customerName}
              orderMode={order.orderMode}
              createdAt={order.createdAt}
              notes={order.notes}
              items={order.lines.map((line) => `${line.quantity} x ${line.name}`)}
              action={
                <ReadyButton
                  orderId={order.id}
                  orderNumber={order.orderNumber}
                  onMarkReady={markReady}
                />
              }
            />
          ))
        ) : (
          <EmptyState text="Aucun ticket en preparation pour le moment." />
        )}
      </StatusColumn>

      <StatusColumn
        icon={<PartyPopperIcon className="size-4" />}
        title="Pretes a servir"
        description="Tickets termines, en attente de remise ou de paiement."
        badge={`${readyOrders.length} ticket(s)`}
      >
        {readyOrders.length ? (
          readyOrders.map((order) => (
            <KitchenOrderCard
              key={order.id}
              orderNumber={order.orderNumber}
              customerName={order.customerName}
              orderMode={order.orderMode}
              createdAt={order.createdAt}
              notes={order.notes}
              items={order.lines.map((line) => `${line.quantity} x ${line.name}`)}
              action={
                <Badge variant="outline">
                  Rafraichissement: {settings.kitchenRefreshMs} ms
                </Badge>
              }
            />
          ))
        ) : (
          <EmptyState text="Aucune commande prete actuellement." />
        )}
      </StatusColumn>
    </div>
  )
}

function ReadyButton({
  orderId,
  orderNumber,
  onMarkReady,
}: {
  orderId: string
  orderNumber: string
  onMarkReady: (orderId: string) => Promise<unknown>
}) {
  const [isPending, startTransition] = React.useTransition()

  return (
    <Button
      onClick={() => {
        startTransition(async () => {
          try {
            await onMarkReady(orderId)
            toast.success(`Commande ${orderNumber} marquee prete.`)
          } catch (error) {
            toast.error(
              error instanceof Error
                ? error.message
                : "Mise a jour du statut cuisine impossible."
            )
          }
        })
      }}
      disabled={isPending}
    >
      Marquer prete
    </Button>
  )
}

function StatusColumn({
  icon,
  title,
  description,
  badge,
  children,
}: {
  icon: ReactNode
  title: string
  description: string
  badge: string
  children: ReactNode
}) {
  return (
    <Card className="h-fit">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {icon}
            <CardTitle>{title}</CardTitle>
          </div>
          <Badge variant="outline">{badge}</Badge>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">{children}</CardContent>
    </Card>
  )
}

function KitchenOrderCard({
  orderNumber,
  customerName,
  orderMode,
  createdAt,
  notes,
  items,
  action,
}: {
  orderNumber: string
  customerName: string
  orderMode: string
  createdAt: string
  notes: string
  items: string[]
  action: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{orderNumber}</p>
          <p className="text-sm text-muted-foreground">
            {customerName || "Client non renseigne"} · {orderMode}
          </p>
        </div>
        <Badge variant="secondary" className="gap-1">
          <Clock3Icon className="size-3.5" />
          {formatElapsed(createdAt)}
        </Badge>
      </div>
      <div className="mt-4 grid gap-2 text-sm">
        {items.map((item) => (
          <div key={item} className="rounded-lg bg-muted/50 px-3 py-2">
            {item}
          </div>
        ))}
      </div>
      {notes ? (
        <p className="mt-3 text-sm text-muted-foreground">Notes: {notes}</p>
      ) : null}
      <div className="mt-4 flex justify-end">{action}</div>
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
      {text}
    </div>
  )
}
