import { BellIcon, PrinterIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"

export function SiteHeader() {
  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <div className="flex flex-1 items-center justify-between gap-3">
          <div>
            <h1 className="text-base font-medium">Centre de pilotage OR&apos;AURA</h1>
            <p className="text-sm text-muted-foreground">
              Service midi en cours, suivi temps reel des commandes.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="hidden sm:inline-flex">
              3 imprimantes LAN
            </Badge>
            <Button variant="outline" size="sm">
              <PrinterIcon />
              Tester imprimante
            </Button>
            <Button size="sm">
              <BellIcon />
              Nouvelle commande
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
