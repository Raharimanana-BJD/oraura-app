import * as React from "react"

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

const data = {
  user: {
    name: "Aina Rakoto",
    email: "manager@oraura.local",
    avatar: "",
  },
  navMain: [
    {
      title: "Pilotage",
      url: "#",
      icon: <LayoutDashboardIcon />,
    },
    {
      title: "Prise de commande",
      url: "#",
      icon: <ClipboardListIcon />,
    },
    {
      title: "Cuisine",
      url: "#",
      icon: <CookingPotIcon />,
    },
    {
      title: "Caisse",
      url: "#",
      icon: <CreditCardIcon />,
    },
    {
      title: "Catalogue",
      url: "#",
      icon: <Package2Icon />,
    },
  ],
  navSecondary: [
    {
      title: "Parametres",
      url: "#",
      icon: <Settings2Icon />,
    },
    {
      title: "Support",
      url: "#",
      icon: <LifeBuoyIcon />,
    },
  ],
  documents: [
    {
      name: "Impression cuisine",
      url: "#",
      icon: <PrinterIcon />,
    },
    {
      name: "Rapport journalier",
      url: "#",
      icon: <FileChartColumnIcon />,
    },
    {
      name: "Produits actifs",
      url: "#",
      icon: <Package2Icon />,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <a href="#">
                <CommandIcon className="size-5!" />
                <span className="text-base font-semibold">OR&apos;AURA POS</span>
              </a>
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
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
