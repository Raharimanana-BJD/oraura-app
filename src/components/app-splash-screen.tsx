import { Loader2Icon, ServerCrashIcon, StoreIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export function AppSplashScreen({
  title,
  description,
  onRetry,
  retryLabel = "Reessayer",
}: {
  title: string
  description: string
  onRetry?: () => void
  retryLabel?: string
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.18),_transparent_35%),linear-gradient(180deg,_rgba(255,247,237,0.95),_rgba(255,255,255,1))] px-6 py-10">
      <div className="w-full max-w-3xl rounded-[2rem] border border-border/70 bg-background/92 p-8 shadow-2xl shadow-amber-100 backdrop-blur">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="grid gap-5">
            <Badge variant="outline" className="w-fit">
              Demarrage OR&apos;AURA POS
            </Badge>
            <div className="inline-flex size-16 items-center justify-center rounded-3xl bg-primary/12 text-primary">
              {onRetry ? (
                <ServerCrashIcon className="size-8" />
              ) : (
                <StoreIcon className="size-8" />
              )}
            </div>
            <div className="grid gap-3">
              <h1 className="text-3xl font-semibold tracking-tight text-balance">{title}</h1>
              <p className="max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
                {description}
              </p>
            </div>
            {onRetry ? (
              <Button onClick={onRetry} className="w-fit">
                {retryLabel}
              </Button>
            ) : null}
          </div>

          <div className="rounded-[1.75rem] border border-primary/15 bg-gradient-to-br from-primary/10 via-background to-amber-50 p-6">
            <div className="flex items-center gap-3 rounded-2xl border bg-background/80 p-4 shadow-sm">
              <Loader2Icon className={`size-5 text-primary ${onRetry ? "" : "animate-spin"}`} />
              <div className="grid gap-1">
                <p className="text-sm font-medium">
                  {onRetry ? "Intervention requise" : "Verification de l'installation"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Base PostgreSQL, configuration initiale et postes de travail.
                </p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 text-sm text-muted-foreground">
              <div className="rounded-2xl border border-dashed p-4">
                L&apos;application bloque l&apos;acces aux ecrans metier tant que l&apos;installation initiale
                n&apos;est pas finalisee.
              </div>
              <div className="rounded-2xl border border-dashed p-4">
                Cette phase permet d&apos;eviter les demarrages incomplets en caisse ou en cuisine.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
