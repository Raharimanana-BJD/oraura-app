import * as React from "react"
import { NavLink, useLocation } from "react-router-dom"

import type { AppSetupState } from "@/lib/app-setup"
import { NavDocuments } from "@/components/nav-documents"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
  ClipboardListIcon,
  CommandIcon,
  CookingPotIcon,
  CreditCardIcon,
  FileChartColumnIcon,
  LayoutDashboardIcon,
  LifeBuoyIcon,
  Package2Icon,
  PrinterIcon,
  Settings2Icon,
} from "lucide-react"

function roleLabel(role: AppSetupState["operatorRole"]) {
  switch (role) {
    case "manager":
      return "Manager"
    case "cashier":
      return "Caissier"
    case "server":
      return "Serveur"
    case "kitchen":
      return "Cuisine"
  }
}

const data = {
  navMain: [
    {
      title: "Pilotage",
      url: "/",
      icon: <LayoutDashboardIcon />,
    },
    {
      title: "Prise de commande",
      url: "/orders",
      icon: <ClipboardListIcon />,
    },
    {
      title: "Cuisine",
      url: "/kitchen",
      icon: <CookingPotIcon />,
    },
    {
      title: "Caisse",
      url: "/checkout",
      icon: <CreditCardIcon />,
    },
    {
      title: "Catalogue",
      url: "/catalog",
      icon: <Package2Icon />,
    },
  ],
  navSecondary: [
    {
      title: "Parametres",
      url: "/settings",
      icon: <Settings2Icon />,
    },
    {
      title: "Support",
      url: "/",
      icon: <LifeBuoyIcon />,
    },
  ],
  documents: [
    {
      name: "Impression cuisine",
      url: "/kitchen",
      icon: <PrinterIcon />,
    },
    {
      name: "Rapport journalier",
      url: "/",
      icon: <FileChartColumnIcon />,
    },
    {
      name: "Produits actifs",
      url: "/catalog",
      icon: <Package2Icon />,
    },
  ],
}

export function AppSidebar({
  setupState,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  setupState: AppSetupState
}) {
  const location = useLocation()
  const user = {
    name: setupState.operatorName,
    subtitle: `${roleLabel(setupState.operatorRole)} · ${setupState.stationName}`,
    avatar: "",
  }

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5!"
              isActive={location.pathname === "/"}
            >
              <NavLink to="/">
                <CommandIcon className="size-5!" />
                <span className="text-base font-semibold">OR&apos;AURA POS</span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavDocuments items={data.documents} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}
