"use client";

import { TrendingDownIcon, TrendingUpIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type DashboardStats = {
  revenueToday: string
  pendingPayments: number
  kitchenTickets: number
  readyOrders: number
  activeProducts: number
  activeCategories: number
  printerStatusLabel: string
}

export function SectionCards({ stats }: { stats: DashboardStats }) {
  return (
    <div className="@container/main">
      <div
        className="grid gap-4 px-4 lg:px-6
         grid-cols-[repeat(auto-fill,minmax(300px,1fr))]
         *:data-[slot=card]:bg-linear-to-t 
         *:data-[slot=card]:from-primary/5 
         *:data-[slot=card]:to-card 
         *:data-[slot=card]:shadow-xs 
         dark:*:data-[slot=card]:bg-card"
      >
        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Chiffre du jour</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {stats.revenueToday}
            </CardTitle>
            <CardAction>
              <Badge variant="outline">
                <TrendingUpIcon />
                En direct
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
              Total des commandes encaissees <TrendingUpIcon className="size-4" />
            </div>
            <div className="text-muted-foreground">
              Mis a jour a partir des commandes locales
            </div>
          </CardFooter>
        </Card>
        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Commandes a encaisser</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {stats.pendingPayments}
            </CardTitle>
            <CardAction>
              <Badge variant="outline">
                <TrendingDownIcon />
                En attente
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
              Commandes non reglees <TrendingDownIcon className="size-4" />
            </div>
            <div className="text-muted-foreground">
              Vues reliees a la page Caisse
            </div>
          </CardFooter>
        </Card>
        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Tickets en cuisine</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {stats.kitchenTickets}
            </CardTitle>
            <CardAction>
              <Badge variant="outline">
                <TrendingUpIcon />
                {stats.readyOrders} pretes
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
              Tickets en preparation et prets <TrendingUpIcon className="size-4" />
            </div>
            <div className="text-muted-foreground">
              Synchronise avec la page Cuisine
            </div>
          </CardFooter>
        </Card>
        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Catalogue et impression</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {stats.activeProducts} produits
            </CardTitle>
            <CardAction>
              <Badge variant="outline">
                <TrendingUpIcon />
                {stats.activeCategories} categories
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
              Etat imprimante: {stats.printerStatusLabel}{" "}
              <TrendingUpIcon className="size-4" />
            </div>
            <div className="text-muted-foreground">
              Produits actifs visibles dans la prise de commande
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
