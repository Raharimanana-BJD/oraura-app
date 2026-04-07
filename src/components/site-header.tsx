import { BellIcon, PrinterIcon } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

const routeMeta: Record<string, { title: string; description: string }> = {
  "/": {
    title: "Centre de pilotage OR'AURA",
    description: "Vue d'ensemble du service, des tickets et de l'impression.",
  },
  "/orders": {
    title: "Prise de commande",
    description: "Preparation de l'interface POS tactile et du panier serveur.",
  },
  "/kitchen": {
    title: "Cuisine",
    description:
      "Suivi des tickets en preparation et rythme de sortie cuisine.",
  },
  "/checkout": {
    title: "Caisse",
    description: "Encaissement, mode de paiement et cloture de commande.",
  },
  "/catalog": {
    title: "Catalogue",
    description: "Gestion des produits, prix, categories et disponibilites.",
  },
  "/settings": {
    title: "Parametres",
    description:
      "Configuration imprimante, etablissement et options d'exploitation.",
  },
};

export function SiteHeader() {
  const location = useLocation();
  const meta = routeMeta[location.pathname] ?? routeMeta["/"];

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-auto"
        />
        <div className="flex flex-1 items-center justify-between gap-3">
          <div>
            <h1 className="text-base font-medium line-clamp-1">{meta.title}</h1>
            <p className="text-sm text-muted-foreground line-clamp-1">
              {meta.description}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="hidden sm:inline-flex">
              3 imprimantes LAN
            </Badge>
            <Button asChild variant="outline" size="sm">
              <Link to="/kitchen">
                <PrinterIcon />
                <span className="max-lg:hidden block">Tester imprimante</span>
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/orders">
                <BellIcon />
                <span className="max-lg:hidden block">Nouvelle commande</span>
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
