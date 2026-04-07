import type { CSSProperties } from "react"

import { HashRouter, Navigate, Outlet, Route, Routes } from "react-router-dom"

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { Toaster } from "@/components/ui/sonner"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { CatalogPage } from "@/pages/catalog-page"
import { CheckoutPage } from "@/pages/checkout-page"
import { DashboardPage } from "@/pages/dashboard-page"
import { KitchenPage } from "@/pages/kitchen-page"
import { OrdersPage } from "@/pages/orders-page"

function AppShell() {
  return (
    <TooltipProvider>
      <SidebarProvider
        style={
          {
            "--header-height": "4rem",
          } as CSSProperties
        }
      >
        <AppSidebar />
        <SidebarInset>
          <SiteHeader />
          <Outlet />
        </SidebarInset>
      </SidebarProvider>
      <Toaster />
    </TooltipProvider>
  )
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/kitchen" element={<KitchenPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/catalog" element={<CatalogPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
