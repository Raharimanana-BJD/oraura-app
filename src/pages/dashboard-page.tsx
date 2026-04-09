import { useMemo } from "react";

import { useAppSettings } from "@/hooks/use-app-settings";
import { useCatalog } from "@/hooks/use-catalog";
import { useOrders } from "@/hooks/use-orders";
import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { DataTable } from "@/components/data-table";
import { PageLoadingSkeleton } from "@/components/page-loading-skeleton";
import { SectionCards } from "@/components/section-cards";

export function DashboardPage() {
  const settings = useAppSettings()
  const {
    categories,
    products,
    isLoading: isCatalogLoading,
    error: catalogError,
  } = useCatalog()
  const { orders, isLoading: isOrdersLoading, error: ordersError } = useOrders()

  const todayKey = new Date().toISOString().slice(0, 10)

  const stats = useMemo(() => {
    const completedRevenue = orders
      .filter(
        (order) =>
          order.paymentStatus === "COMPLETED" &&
          order.updatedAt.slice(0, 10) === todayKey
      )
      .reduce((sum, order) => sum + order.totalAmount, 0)

    return {
      revenueToday: `${completedRevenue.toLocaleString("fr-FR")} ${settings.currencySymbol}`,
      pendingPayments: orders.filter((order) => order.paymentStatus === "PENDING").length,
      kitchenTickets: orders.filter((order) => order.paymentStatus === "PENDING").length,
      readyOrders: orders.filter(
        (order) => order.kitchenStatus === "READY" && order.paymentStatus === "PENDING"
      ).length,
      activeProducts: products.filter((product) => product.isActive).length,
      activeCategories: categories.filter((category) => category.isActive).length,
      printerStatusLabel: [
        settings.kitchenPrinterEnabled && settings.autoPrintKitchen
          ? `cuisine ${settings.kitchenPrinterIp}:${settings.kitchenPrinterPort}`
          : "cuisine off",
        settings.cashierPrinterEnabled && settings.printCustomerReceipt
          ? `caisse ${settings.cashierPrinterIp}:${settings.cashierPrinterPort}`
          : "caisse off",
      ].join(" · "),
    }
  }, [categories, orders, products, settings.autoPrintKitchen, settings.cashierPrinterEnabled, settings.cashierPrinterIp, settings.cashierPrinterPort, settings.currencySymbol, settings.kitchenPrinterEnabled, settings.kitchenPrinterIp, settings.kitchenPrinterPort, settings.printCustomerReceipt, todayKey])

  const chartData = useMemo(() => {
    const map = new Map<string, { date: string; completed: number; kitchen: number }>()

    for (const order of orders) {
      const day = order.createdAt.slice(0, 10)
      const current = map.get(day) ?? { date: day, completed: 0, kitchen: 0 }

      if (order.paymentStatus === "COMPLETED") {
        current.completed += 1
      }

      if (order.paymentStatus === "PENDING") {
        current.kitchen += 1
      }

      map.set(day, current)
    }

    const points = Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date))
    return points.length > 0 ? points : [{ date: todayKey, completed: 0, kitchen: 0 }]
  }, [orders, todayKey])

  const dashboardRows = useMemo(
    () =>
      orders.map((order) => ({
        id: order.id,
        header: order.orderNumber,
        type: order.orderMode,
        status:
          order.paymentStatus === "COMPLETED"
            ? "Completee"
            : order.kitchenStatus === "READY"
              ? "Prete"
              : "En preparation",
        target: `${order.totalAmount.toLocaleString("fr-FR")} ${settings.currencySymbol}`,
        limit: `${Math.max(
          0,
          Math.round((Date.now() - new Date(order.createdAt).getTime()) / 60000)
        )} min`,
        reviewer:
          order.paymentStatus === "COMPLETED"
            ? "Caisse"
            : order.kitchenStatus === "READY"
              ? "Comptoir"
              : "Cuisine chaude",
      })),
    [orders, settings.currencySymbol]
  )

  const isLoading = isCatalogLoading || isOrdersLoading
  const error = catalogError ?? ordersError

  if (isLoading) {
    return <PageLoadingSkeleton />
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
    <div className="flex flex-1 flex-col gap-4 bg-linear-to-b from-background via-background to-muted/20 py-4 md:gap-6 md:py-6">
      <SectionCards stats={stats} />
      <div className="px-4 lg:px-6">
        <ChartAreaInteractive chartData={chartData} />
      </div>
      <div className="px-4 lg:px-6">
        <DataTable data={dashboardRows} />
      </div>
    </div>
  )
}
