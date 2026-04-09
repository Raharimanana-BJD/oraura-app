import type { ReactNode } from "react"
import { useEffect, useMemo, useState, useTransition } from "react"
import { invoke } from "@tauri-apps/api/core"
import {
  CheckCircle2Icon,
  Loader2Icon,
  PrinterIcon,
  ReceiptTextIcon,
  RotateCcwIcon,
  SaveIcon,
  Settings2Icon,
  StoreIcon,
  Volume2Icon,
} from "lucide-react"
import { toast } from "sonner"

import {
  type AppSettings,
  appSettingsSchema,
  defaultAppSettings,
  fetchAppSettings,
  readStoredAppSettings,
  resetAppSettings,
  saveAppSettings,
} from "@/lib/app-settings"
import { PageLoadingSkeleton } from "@/components/page-loading-skeleton"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"

type SettingsErrors = Partial<Record<keyof AppSettings, string>>

function parseNumber(value: string, fallback: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function SettingsPage() {
  const [draft, setDraft] = useState<AppSettings>(defaultAppSettings)
  const [saved, setSaved] = useState<AppSettings>(defaultAppSettings)
  const [errors, setErrors] = useState<SettingsErrors>({})
  const [isHydrated, setIsHydrated] = useState(false)
  const [syncStatus, setSyncStatus] = useState<"syncing" | "synced" | "cache" | "error">("syncing")
  const [syncMessage, setSyncMessage] = useState("Synchronisation PostgreSQL en cours.")
  const [isSaving, startSaving] = useTransition()
  const [isPrinting, startPrinting] = useTransition()

  useEffect(() => {
    const stored = readStoredAppSettings()
    setDraft(stored)
    setSaved(stored)
    setIsHydrated(true)

    let cancelled = false

    void fetchAppSettings()
      .then((remoteSettings) => {
        if (cancelled) {
          return
        }

        setDraft(remoteSettings)
        setSaved(remoteSettings)
        setSyncStatus("synced")
        setSyncMessage("Configuration chargee depuis PostgreSQL.")
      })
      .catch((error) => {
        if (cancelled) {
          return
        }

        const message =
          error instanceof Error
            ? error.message
            : "Synchronisation PostgreSQL impossible."
        setSyncStatus("cache")
        setSyncMessage(`${message} Affichage du dernier cache local disponible.`)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const isDirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(saved),
    [draft, saved]
  )

  function updateSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    setDraft((current) => ({
      ...current,
      [key]: value,
    }))
    setErrors((current) => ({
      ...current,
      [key]: undefined,
    }))
  }

  function validateSettings(settings: AppSettings) {
    const result = appSettingsSchema.safeParse(settings)

    if (result.success) {
      setErrors({})
      return result.data
    }

    const nextErrors: SettingsErrors = {}
    for (const issue of result.error.issues) {
      const key = issue.path[0]
      if (typeof key === "string" && !(key in nextErrors)) {
        nextErrors[key as keyof AppSettings] = issue.message
      }
    }
    setErrors(nextErrors)
    return null
  }

  function handleSave() {
    startSaving(() => {
      void (async () => {
        const validated = validateSettings(draft)

        if (!validated) {
          toast.error("La configuration contient des erreurs.")
          return
        }

        try {
          const savedSettings = await saveAppSettings(validated)
          setDraft(savedSettings)
          setSaved(savedSettings)
          setSyncStatus("synced")
          setSyncMessage("Configuration sauvegardee dans PostgreSQL.")
          toast.success("Parametres sauvegardes.")
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "Sauvegarde des parametres impossible."
          setSyncStatus("error")
          setSyncMessage(message)
          toast.error(message)
        }
      })()
    })
  }

  function handleReset() {
    startSaving(() => {
      void (async () => {
        try {
          const resetSettings = await resetAppSettings()
          setDraft(resetSettings)
          setSaved(resetSettings)
          setErrors({})
          setSyncStatus("synced")
          setSyncMessage("Configuration reinitialisee depuis PostgreSQL.")
          toast.success("Configuration reinitialisee.")
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "Reinitialisation des parametres impossible."
          setSyncStatus("error")
          setSyncMessage(message)
          toast.error(message)
        }
      })()
    })
  }

  function handleTestPrint(target: "kitchen" | "cashier") {
    startPrinting(async () => {
      const validated = validateSettings(draft)

      if (!validated) {
        toast.error("Corrige d'abord les champs de configuration.")
        return
      }

      const isKitchenTarget = target === "kitchen"
      const printerEnabled = isKitchenTarget
        ? validated.kitchenPrinterEnabled
        : validated.cashierPrinterEnabled

      if (!printerEnabled) {
        toast.error(
          isKitchenTarget
            ? "Active d'abord l'imprimante cuisine."
            : "Active d'abord l'imprimante caisse."
        )
        return
      }

      const printerIp = isKitchenTarget
        ? validated.kitchenPrinterIp
        : validated.cashierPrinterIp
      const printerPort = isKitchenTarget
        ? validated.kitchenPrinterPort
        : validated.cashierPrinterPort
      const ticketTitle = isKitchenTarget ? "TEST CUISINE" : "TEST CAISSE"

      try {
        await invoke("print_to_kitchen", {
          printerIp,
          printerPort,
          content: `${validated.businessName}\n${ticketTitle}\n${validated.testTicketMessage}`,
        })
        toast.success(
          isKitchenTarget
            ? "Ticket de test envoye a l'imprimante cuisine."
            : "Ticket de test envoye a l'imprimante caisse."
        )
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Echec du test d'impression."
        toast.error(message)
      }
    })
  }

  if (!isHydrated) {
    return <PageLoadingSkeleton />
  }

  return (
    <div className="flex flex-1 flex-col gap-6 px-4 py-4 lg:px-6">
      <Card className="border-none bg-gradient-to-br from-primary/12 via-background to-background shadow-sm">
        <CardHeader className="gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant={isDirty ? "default" : "outline"}>
              {isDirty ? "Brouillon non sauvegarde" : "Configuration a jour"}
            </Badge>
            <Badge variant={syncStatus === "synced" ? "outline" : "secondary"}>
              {syncStatus === "syncing"
                ? "Synchronisation..."
                : syncStatus === "synced"
                  ? "Source: PostgreSQL"
                  : syncStatus === "cache"
                    ? "Mode degrade: cache local"
                    : "Erreur de synchronisation"}
            </Badge>
            <Badge variant="outline">Imprimante testable en direct</Badge>
          </div>
          <div className="flex flex-col gap-2">
            <CardTitle className="text-2xl">Parametres de l&apos;application</CardTitle>
            <CardDescription className="max-w-3xl text-sm sm:text-base">
              Configure ici les imprimantes cuisine et caisse, l&apos;identite de l&apos;etablissement et les
              comportements critiques de l&apos;application. Chaque test d&apos;impression utilise la commande Tauri
              reelle.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2Icon className="animate-spin" /> : <SaveIcon />}
              Sauvegarder
            </Button>
            <Button
              variant="outline"
              onClick={() => handleTestPrint("kitchen")}
              disabled={isPrinting}
            >
              {isPrinting ? <Loader2Icon className="animate-spin" /> : <PrinterIcon />}
              Tester la cuisine
            </Button>
            <Button
              variant="outline"
              onClick={() => handleTestPrint("cashier")}
              disabled={isPrinting}
            >
              {isPrinting ? <Loader2Icon className="animate-spin" /> : <ReceiptTextIcon />}
              Tester la caisse
            </Button>
            <Button variant="outline" onClick={handleReset} disabled={isSaving}>
              <RotateCcwIcon />
              Reinitialiser
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <StoreIcon className="size-4" />
                Etablissement
              </CardTitle>
              <CardDescription>
                Ces informations alimentent les tickets, les libelles et les futurs ecrans de caisse.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <Field
                label="Nom de l'etablissement"
                error={errors.businessName}
                input={
                  <Input
                    value={draft.businessName}
                    onChange={(event) => updateSetting("businessName", event.target.value)}
                    placeholder="OR'AURA Fast Food"
                  />
                }
              />
              <Field
                label="Prefixe commande"
                error={errors.orderPrefix}
                input={
                  <Input
                    value={draft.orderPrefix}
                    onChange={(event) => updateSetting("orderPrefix", event.target.value.toUpperCase())}
                    placeholder="A"
                  />
                }
              />
              <Field
                label="Devise"
                error={errors.currencySymbol}
                input={
                  <Input
                    value={draft.currencySymbol}
                    onChange={(event) => updateSetting("currencySymbol", event.target.value)}
                    placeholder="Ar"
                  />
                }
              />
              <Field
                label="Telephone support"
                error={errors.supportPhone}
                input={
                  <Input
                    value={draft.supportPhone}
                    onChange={(event) => updateSetting("supportPhone", event.target.value)}
                    placeholder="+261 34 00 000 00"
                  />
                }
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PrinterIcon className="size-4" />
                Imprimante cuisine
              </CardTitle>
              <CardDescription>
                Cette configuration pilote directement les tickets de commande envoyes depuis la page POS.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  label="Nom interne"
                  error={errors.kitchenPrinterName}
                  input={
                    <Input
                      value={draft.kitchenPrinterName}
                      onChange={(event) => updateSetting("kitchenPrinterName", event.target.value)}
                      placeholder="Cuisine principale"
                    />
                  }
                />
                <Field
                  label="Adresse IP"
                  error={errors.kitchenPrinterIp}
                  input={
                    <Input
                      value={draft.kitchenPrinterIp}
                      onChange={(event) => updateSetting("kitchenPrinterIp", event.target.value)}
                      placeholder="192.168.1.100"
                    />
                  }
                />
                <Field
                  label="Port TCP"
                  error={errors.kitchenPrinterPort}
                  input={
                    <Input
                      type="number"
                      value={draft.kitchenPrinterPort}
                      onChange={(event) =>
                        updateSetting(
                          "kitchenPrinterPort",
                          parseNumber(event.target.value, draft.kitchenPrinterPort)
                        )
                      }
                      placeholder="9100"
                    />
                  }
                />
                <Field
                  label="Message de test"
                  error={errors.testTicketMessage}
                  input={
                    <textarea
                      value={draft.testTicketMessage}
                      onChange={(event) => updateSetting("testTicketMessage", event.target.value)}
                      rows={5}
                      className={cn(
                        "flex min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                      )}
                    />
                  }
                />
              </div>

              <Separator />

              <div className="grid gap-3 md:grid-cols-2">
                <ToggleField
                  checked={draft.kitchenPrinterEnabled}
                  onCheckedChange={(checked) => updateSetting("kitchenPrinterEnabled", checked)}
                  title="Imprimante cuisine active"
                  description="Autorise l'utilisation de l'imprimante sur cette station."
                />
                <ToggleField
                  checked={draft.autoPrintKitchen}
                  onCheckedChange={(checked) => updateSetting("autoPrintKitchen", checked)}
                  title="Impression automatique cuisine"
                  description="Declenche l'impression apres validation de commande."
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ReceiptTextIcon className="size-4" />
                Imprimante caisse
              </CardTitle>
              <CardDescription>
                Cette imprimante est utilisee pour les tickets client et factures au poste d&apos;encaissement.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  label="Nom interne"
                  error={errors.cashierPrinterName}
                  input={
                    <Input
                      value={draft.cashierPrinterName}
                      onChange={(event) => updateSetting("cashierPrinterName", event.target.value)}
                      placeholder="Caisse principale"
                    />
                  }
                />
                <Field
                  label="Adresse IP"
                  error={errors.cashierPrinterIp}
                  input={
                    <Input
                      value={draft.cashierPrinterIp}
                      onChange={(event) => updateSetting("cashierPrinterIp", event.target.value)}
                      placeholder="192.168.1.101"
                    />
                  }
                />
                <Field
                  label="Port TCP"
                  error={errors.cashierPrinterPort}
                  input={
                    <Input
                      type="number"
                      value={draft.cashierPrinterPort}
                      onChange={(event) =>
                        updateSetting(
                          "cashierPrinterPort",
                          parseNumber(event.target.value, draft.cashierPrinterPort)
                        )
                      }
                      placeholder="9100"
                    />
                  }
                />
                <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                  Les tickets de caisse sont declenches au moment de l&apos;encaissement si l&apos;option
                  d&apos;impression client est activee.
                </div>
              </div>

              <Separator />

              <div className="grid gap-3 md:grid-cols-2">
                <ToggleField
                  checked={draft.cashierPrinterEnabled}
                  onCheckedChange={(checked) => updateSetting("cashierPrinterEnabled", checked)}
                  title="Imprimante caisse active"
                  description="Autorise l'utilisation de l'imprimante de facture sur ce poste."
                />
                <ToggleField
                  checked={draft.printCustomerReceipt}
                  onCheckedChange={(checked) => updateSetting("printCustomerReceipt", checked)}
                  title="Impression automatique client"
                  description="Declenche le ticket client apres encaissement."
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2Icon className="size-4" />
                Exploitation
              </CardTitle>
              <CardDescription>
                Reglages utiles pour la caisse, la cuisine et le comportement global de l&apos;app.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <Field
                label="Mode de commande par defaut"
                error={errors.defaultOrderMode}
                input={
                  <Select
                    value={draft.defaultOrderMode}
                    onValueChange={(value) =>
                      updateSetting(
                        "defaultOrderMode",
                        value as AppSettings["defaultOrderMode"]
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir un mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sur-place">Sur place</SelectItem>
                      <SelectItem value="a-emporter">A emporter</SelectItem>
                      <SelectItem value="livraison">Livraison</SelectItem>
                    </SelectContent>
                  </Select>
                }
              />
              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  label="Rafraichissement cuisine (ms)"
                  error={errors.kitchenRefreshMs}
                  input={
                    <Input
                      type="number"
                      value={draft.kitchenRefreshMs}
                      onChange={(event) =>
                        updateSetting(
                          "kitchenRefreshMs",
                          parseNumber(event.target.value, draft.kitchenRefreshMs)
                        )
                      }
                    />
                  }
                />
                <Field
                  label="Rafraichissement caisse (ms)"
                  error={errors.checkoutRefreshMs}
                  input={
                    <Input
                      type="number"
                      value={draft.checkoutRefreshMs}
                      onChange={(event) =>
                        updateSetting(
                          "checkoutRefreshMs",
                          parseNumber(event.target.value, draft.checkoutRefreshMs)
                        )
                      }
                    />
                  }
                />
              </div>
              <Field
                label="Langue"
                error={errors.language}
                input={
                  <Select
                    value={draft.language}
                    onValueChange={(value) =>
                      updateSetting("language", value as AppSettings["language"])
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir une langue" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fr">Francais</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                }
              />
              <div className="grid gap-3">
                <ToggleField
                  checked={draft.soundAlertsEnabled}
                  onCheckedChange={(checked) => updateSetting("soundAlertsEnabled", checked)}
                  title="Alertes sonores"
                  description="Prevu pour les futurs ecrans cuisine et caisse."
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Volume2Icon className="size-4" />
                Etat de synchronisation
              </CardTitle>
              <CardDescription>
                Ce bloc confirme si la page manipule bien la configuration persistante de l&apos;application.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <StatusLine
                label="Persistance applicative"
                value={
                  syncStatus === "synced"
                    ? "PostgreSQL active"
                    : syncStatus === "syncing"
                      ? "Synchronisation..."
                      : syncStatus === "cache"
                        ? "Cache local uniquement"
                        : "Erreur de synchronisation"
                }
                hint={syncMessage}
              />
              <StatusLine
                label="Connexion cuisine"
                value={`${draft.kitchenPrinterIp}:${draft.kitchenPrinterPort}`}
                hint="Utilisee telle quelle lors du test d'impression."
              />
              <StatusLine
                label="Connexion caisse"
                value={`${draft.cashierPrinterIp}:${draft.cashierPrinterPort}`}
                hint="Utilisee pour les tickets clients et le test caisse."
              />
              <StatusLine
                label="Port par defaut ESC/POS"
                value="9100"
                hint="Modifiable dans la configuration si ton imprimante utilise un autre port."
              />
              <StatusLine
                label="Tests operables"
                value={
                  draft.kitchenPrinterEnabled || draft.cashierPrinterEnabled ? "Oui" : "Non"
                }
                hint="Active chaque imprimante pour lancer son ticket de test dedie."
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function Field({
  label,
  error,
  input,
}: {
  label: string
  error?: string
  input: ReactNode
}) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      {input}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}

function ToggleField({
  checked,
  onCheckedChange,
  title,
  description,
}: {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  title: string
  description: string
}) {
  return (
    <label className="flex items-start gap-3 rounded-xl border p-4">
      <Checkbox checked={checked} onCheckedChange={(value) => onCheckedChange(Boolean(value))} />
      <div className="grid gap-1">
        <span className="text-sm font-medium">{title}</span>
        <span className="text-sm text-muted-foreground">{description}</span>
      </div>
    </label>
  )
}

function StatusLine({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint: string
}) {
  return (
    <div className="rounded-xl border p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium">{label}</span>
        <span className="inline-flex items-center gap-2 text-sm">
          <CheckCircle2Icon className="size-4 text-primary" />
          {value}
        </span>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{hint}</p>
    </div>
  )
}
