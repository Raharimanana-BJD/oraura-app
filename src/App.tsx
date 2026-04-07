import type { CSSProperties } from "react"

import { HashRouter, Navigate, Outlet, Route, Routes } from "react-router-dom"

import { AppSplashScreen } from "@/components/app-splash-screen"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { useAppBootstrap } from "@/hooks/use-app-bootstrap"
import type { AppSetupState } from "@/lib/app-setup"
import { Toaster } from "@/components/ui/sonner"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { CatalogPage } from "@/pages/catalog-page"
import { CheckoutPage } from "@/pages/checkout-page"
import { DashboardPage } from "@/pages/dashboard-page"
import { KitchenPage } from "@/pages/kitchen-page"
import { OrdersPage } from "@/pages/orders-page"
import { SettingsPage } from "@/pages/settings-page"
import { SetupPage } from "@/pages/setup-page"

function AppShell({ setupState }: { setupState: AppSetupState }) {
  return (
    <TooltipProvider>
      <SidebarProvider
        style={
          {
            "--header-height": "4rem",
          } as CSSProperties
        }
      >
        <AppSidebar setupState={setupState} />
        <SidebarInset>
          <SiteHeader />
          <Outlet />
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}

export default function App() {
  const { isLoading, databaseStatus, setupState, error, refresh } = useAppBootstrap()

  if (isLoading) {
    return (
      <AppSplashScreen
        title="Initialisation du poste OR'AURA"
        description="Verification de la base PostgreSQL, de la configuration initiale et de l'etat d'installation."
      />
    )
  }

  if (error) {
    return (
      <AppSplashScreen
        title="Demarrage interrompu"
        description={error}
        onRetry={() => {
          void refresh({ forceInitialize: true })
        }}
      />
    )
  }

  const setupCompleted = setupState?.setupCompleted ?? false

  return (
    <>
      <HashRouter>
        <Routes>
          <Route
            path="/setup"
            element={
              setupCompleted ? (
                <Navigate to="/" replace />
              ) : (
                <SetupPage
                  databaseStatus={databaseStatus}
                  onRetryDatabase={() => {
                    void refresh({ forceInitialize: true })
                  }}
                  onFinished={() => {
                    void refresh()
                  }}
                />
              )
            }
          />
          <Route
            element={
              setupCompleted && setupState ? (
                <AppShell setupState={setupState} />
              ) : (
                <Navigate to="/setup" replace />
              )
            }
          >
            <Route path="/" element={<DashboardPage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/kitchen" element={<KitchenPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/catalog" element={<CatalogPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </HashRouter>
      <Toaster />
    </>
  )
}
