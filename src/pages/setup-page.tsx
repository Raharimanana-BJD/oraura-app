import type { ReactNode } from "react"
import { useMemo, useState, useTransition } from "react"
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BadgeCheckIcon,
  Loader2Icon,
  PrinterIcon,
  ReceiptTextIcon,
  ServerIcon,
  UserRoundIcon,
} from "lucide-react"
import { toast } from "sonner"

import type { DatabaseStatus } from "@/hooks/use-app-bootstrap"
import {
  completeAppSetup,
  type AppSetupState,
  type CompleteAppSetupInput,
  roleLabel,
} from "@/lib/app-setup"
import {
  appSettingsSchema,
  defaultAppSettings,
  saveAppSettings,
  type AppSettings,
} from "@/lib/app-settings"
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

const steps = [
  { key: "database", label: "Base", icon: <ServerIcon className="size-4" /> },
  { key: "business", label: "Etablissement", icon: <BadgeCheckIcon className="size-4" /> },
  { key: "operator", label: "Equipe", icon: <UserRoundIcon className="size-4" /> },
] as const

function parseNumber(value: string, fallback: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) {
    return error.message
  }

  return fallback
}

export function SetupPage({
  databaseStatus,
  onRetryDatabase,
  onFinished,
}: {
  databaseStatus: DatabaseStatus | null
  onRetryDatabase: () => void
  onFinished: (setupState: AppSetupState) => void
}) {
  const [currentStep, setCurrentStep] = useState(0)
  const [settingsDraft, setSettingsDraft] = useState<AppSettings>(defaultAppSettings)
  const [setupDraft, setSetupDraft] = useState<CompleteAppSetupInput>({
    operatorName: "",
    operatorRole: "manager",
    stationName: "Poste principal",
  })
  const [isSubmitting, startSubmitting] = useTransition()

  const databaseReady = databaseStatus?.connected ?? false

  const summary = useMemo(
    () => [
      settingsDraft.businessName,
      `${settingsDraft.currencySymbol} · ${settingsDraft.orderPrefix}`,
      `${setupDraft.operatorName || "Operateur a definir"} · ${roleLabel(setupDraft.operatorRole)}`,
      `${setupDraft.stationName}`,
    ],
    [settingsDraft.businessName, settingsDraft.currencySymbol, settingsDraft.orderPrefix, setupDraft]
  )

  function updateSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    setSettingsDraft((current) => ({
      ...current,
      [key]: value,
    }))
  }

  function updateSetup<K extends keyof CompleteAppSetupInput>(
    key: K,
    value: CompleteAppSetupInput[K]
  ) {
    setSetupDraft((current) => ({
      ...current,
      [key]: value,
    }))
  }

  function nextStep() {
    if (currentStep === 0 && !databaseReady) {
      toast.error("La base PostgreSQL doit etre disponible avant de continuer.")
      return
    }

    setCurrentStep((current) => Math.min(current + 1, steps.length - 1))
  }

  function previousStep() {
    setCurrentStep((current) => Math.max(current - 1, 0))
  }

  function finishSetup() {
    startSubmitting(() => {
      void (async () => {
        if (!databaseReady) {
          toast.error("Connexion PostgreSQL requise pour finaliser l'installation.")
          return
        }

        const validatedSettings = appSettingsSchema.safeParse(settingsDraft)
        if (!validatedSettings.success) {
          toast.error(validatedSettings.error.issues[0]?.message ?? "Parametres invalides.")
          return
        }

        try {
          await saveAppSettings(validatedSettings.data)
          const setupState = await completeAppSetup(setupDraft)
          toast.success("Installation initiale terminee.")
          onFinished(setupState)
        } catch (error) {
          toast.error(
            getErrorMessage(error, "Finalisation de l'installation impossible.")
          )
        }
      })()
    })
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.14),_transparent_32%),linear-gradient(180deg,_rgba(255,251,235,0.85),_rgba(255,255,255,1))] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-6xl gap-6">
        <Card className="border-none bg-background/90 shadow-xl">
          <CardHeader className="gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="outline">Premiere installation</Badge>
              <Badge variant={databaseReady ? "outline" : "secondary"}>
                {databaseReady ? "PostgreSQL disponible" : "PostgreSQL requis"}
              </Badge>
            </div>
            <div className="grid gap-2 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
              <div>
                <CardTitle className="text-3xl tracking-tight">
                  Assistant de mise en service OR&apos;AURA
                </CardTitle>
                <CardDescription className="max-w-3xl text-sm sm:text-base">
                  Nous allons verifier la base de donnees, enregistrer l&apos;etablissement et
                  definir le premier operateur avant d&apos;ouvrir la caisse.
                </CardDescription>
              </div>
              <div className="grid gap-2 rounded-3xl border bg-muted/30 p-4 text-sm text-muted-foreground">
                {summary.map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="grid gap-6 lg:grid-cols-[0.72fr_1.28fr]">
          <Card className="h-fit">
            <CardHeader>
              <CardTitle>Progression</CardTitle>
              <CardDescription>
                Chaque etape valide un bloc indispensable avant le lancement du POS.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {steps.map((step, index) => (
                <div
                  key={step.key}
                  className={`rounded-2xl border p-4 ${
                    index === currentStep
                      ? "border-primary/40 bg-primary/5"
                      : index < currentStep
                        ? "border-emerald-200 bg-emerald-50"
                        : "bg-card"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="inline-flex size-9 items-center justify-center rounded-2xl border bg-background">
                      {step.icon}
                    </div>
                    <div className="grid gap-1">
                      <p className="text-sm font-medium">
                        {index + 1}. {step.label}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {index === 0
                          ? "Connexion a la base et migrations"
                          : index === 1
                            ? "Identite du restaurant et options de service"
                            : "Premier operateur et poste de travail"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{steps[currentStep].label}</CardTitle>
              <CardDescription>
                {currentStep === 0
                  ? "L'application a besoin d'une base accessible avant toute configuration."
                  : currentStep === 1
                    ? "Ces valeurs alimentent les tickets, l'interface et les automatismes metier."
                    : "Ce profil servira de premier compte operateur et de contexte poste."}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6">
              {currentStep === 0 ? (
                <div className="grid gap-4">
                  <div className="rounded-3xl border p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">Etat de la base PostgreSQL</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {databaseStatus?.message ??
                            "Verification de la connexion et des migrations en cours."}
                        </p>
                      </div>
                      <Badge variant={databaseReady ? "outline" : "secondary"}>
                        {databaseReady ? "Connectee" : "Indisponible"}
                      </Badge>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-dashed p-5 text-sm text-muted-foreground">
                    Cette premiere version verifie et initialise la base configuree pour l'application.
                    Si vous voulez permettre plus tard la saisie du `DATABASE_URL` dans l'interface,
                    nous pourrons ajouter un vrai fichier de configuration poste au lieu de dependances
                    d'environnement.
                  </div>

                  <Button onClick={onRetryDatabase} className="w-fit" variant="outline">
                    <ServerIcon />
                    Reverifier la base
                  </Button>
                </div>
              ) : null}

              {currentStep === 1 ? (
                <div className="grid gap-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Nom de l'etablissement">
                      <Input
                        value={settingsDraft.businessName}
                        onChange={(event) => updateSetting("businessName", event.target.value)}
                        placeholder="OR'AURA Fast Food"
                      />
                    </Field>
                    <Field label="Prefixe commande">
                      <Input
                        value={settingsDraft.orderPrefix}
                        onChange={(event) =>
                          updateSetting("orderPrefix", event.target.value.toUpperCase())
                        }
                        placeholder="A"
                      />
                    </Field>
                    <Field label="Devise">
                      <Input
                        value={settingsDraft.currencySymbol}
                        onChange={(event) => updateSetting("currencySymbol", event.target.value)}
                        placeholder="Ar"
                      />
                    </Field>
                    <Field label="Telephone support">
                      <Input
                        value={settingsDraft.supportPhone}
                        onChange={(event) => updateSetting("supportPhone", event.target.value)}
                        placeholder="+261 34 00 000 00"
                      />
                    </Field>
                    <Field label="Mode de commande par defaut">
                      <Select
                        value={settingsDraft.defaultOrderMode}
                        onValueChange={(value) =>
                          updateSetting(
                            "defaultOrderMode",
                            value as AppSettings["defaultOrderMode"]
                          )
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sur-place">Sur place</SelectItem>
                          <SelectItem value="a-emporter">A emporter</SelectItem>
                          <SelectItem value="livraison">Livraison</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Langue">
                      <Select
                        value={settingsDraft.language}
                        onValueChange={(value) =>
                          updateSetting("language", value as AppSettings["language"])
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fr">Francais</SelectItem>
                          <SelectItem value="en">English</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <ToggleLine
                      checked={settingsDraft.kitchenPrinterEnabled}
                      onCheckedChange={(checked) =>
                        updateSetting("kitchenPrinterEnabled", checked)
                      }
                      title="Imprimante cuisine active"
                      description="Autorise les tickets de preparation."
                    />
                    <ToggleLine
                      checked={settingsDraft.printCustomerReceipt}
                      onCheckedChange={(checked) =>
                        updateSetting("printCustomerReceipt", checked)
                      }
                      title="Ticket client automatique"
                      description="Impression apres encaissement en caisse."
                    />
                  </div>
                </div>
              ) : null}

              {currentStep === 2 ? (
                <div className="grid gap-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Nom du premier operateur">
                      <Input
                        value={setupDraft.operatorName}
                        onChange={(event) => updateSetup("operatorName", event.target.value)}
                        placeholder="Aina Rakoto"
                      />
                    </Field>
                    <Field label="Role principal">
                      <Select
                        value={setupDraft.operatorRole}
                        onValueChange={(value) =>
                          updateSetup("operatorRole", value as CompleteAppSetupInput["operatorRole"])
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="cashier">Caissier</SelectItem>
                          <SelectItem value="server">Serveur</SelectItem>
                          <SelectItem value="kitchen">Cuisine</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Nom du poste">
                      <Input
                        value={setupDraft.stationName}
                        onChange={(event) => updateSetup("stationName", event.target.value)}
                        placeholder="Poste principal"
                      />
                    </Field>
                    <Field label="Rafraichissement cuisine (ms)">
                      <Input
                        type="number"
                        value={settingsDraft.kitchenRefreshMs}
                        onChange={(event) =>
                          updateSetting(
                            "kitchenRefreshMs",
                            parseNumber(event.target.value, settingsDraft.kitchenRefreshMs)
                          )
                        }
                      />
                    </Field>
                    <Field label="Nom imprimante cuisine">
                      <Input
                        value={settingsDraft.kitchenPrinterName}
                        onChange={(event) =>
                          updateSetting("kitchenPrinterName", event.target.value)
                        }
                        placeholder="Cuisine principale"
                      />
                    </Field>
                    <Field label="Nom imprimante caisse">
                      <Input
                        value={settingsDraft.cashierPrinterName}
                        onChange={(event) =>
                          updateSetting("cashierPrinterName", event.target.value)
                        }
                        placeholder="Caisse principale"
                      />
                    </Field>
                  </div>

                  <Separator />

                  <div className="grid gap-4 md:grid-cols-2">
                    <PrinterBlock
                      title="Cuisine"
                      icon={<PrinterIcon className="size-4" />}
                      enabled={settingsDraft.kitchenPrinterEnabled}
                      ip={settingsDraft.kitchenPrinterIp}
                      port={settingsDraft.kitchenPrinterPort}
                      onIpChange={(value) => updateSetting("kitchenPrinterIp", value)}
                      onPortChange={(value) => updateSetting("kitchenPrinterPort", value)}
                    />
                    <PrinterBlock
                      title="Caisse"
                      icon={<ReceiptTextIcon className="size-4" />}
                      enabled={settingsDraft.cashierPrinterEnabled}
                      ip={settingsDraft.cashierPrinterIp}
                      port={settingsDraft.cashierPrinterPort}
                      onIpChange={(value) => updateSetting("cashierPrinterIp", value)}
                      onPortChange={(value) => updateSetting("cashierPrinterPort", value)}
                    />
                  </div>
                </div>
              ) : null}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <Button
                  variant="outline"
                  onClick={previousStep}
                  disabled={currentStep === 0 || isSubmitting}
                >
                  <ArrowLeftIcon />
                  Retour
                </Button>

                {currentStep < steps.length - 1 ? (
                  <Button onClick={nextStep} disabled={isSubmitting}>
                    Continuer
                    <ArrowRightIcon />
                  </Button>
                ) : (
                  <Button onClick={finishSetup} disabled={isSubmitting}>
                    {isSubmitting ? <Loader2Icon className="animate-spin" /> : <BadgeCheckIcon />}
                    Terminer l'installation
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      {children}
    </div>
  )
}

function ToggleLine({
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
    <label className="flex items-start gap-3 rounded-2xl border p-4">
      <Checkbox checked={checked} onCheckedChange={(value) => onCheckedChange(Boolean(value))} />
      <div className="grid gap-1">
        <span className="text-sm font-medium">{title}</span>
        <span className="text-sm text-muted-foreground">{description}</span>
      </div>
    </label>
  )
}

function PrinterBlock({
  title,
  icon,
  enabled,
  ip,
  port,
  onIpChange,
  onPortChange,
}: {
  title: string
  icon: ReactNode
  enabled: boolean
  ip: string
  port: number
  onIpChange: (value: string) => void
  onPortChange: (value: number) => void
}) {
  return (
    <div className="rounded-3xl border p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2 text-sm font-medium">
          {icon}
          {title}
        </div>
        <Badge variant={enabled ? "outline" : "secondary"}>
          {enabled ? "Active" : "Inactive"}
        </Badge>
      </div>
      <div className="mt-4 grid gap-4">
        <Field label="Adresse IP">
          <Input value={ip} onChange={(event) => onIpChange(event.target.value)} />
        </Field>
        <Field label="Port TCP">
          <Input
            type="number"
            value={port}
            onChange={(event) => onPortChange(parseNumber(event.target.value, port))}
          />
        </Field>
      </div>
    </div>
  )
}
