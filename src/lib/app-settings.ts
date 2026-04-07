import { z } from "zod"

export const APP_SETTINGS_UPDATED_EVENT = "oraura:app-settings-updated"

export const appSettingsSchema = z.object({
  businessName: z.string().trim().min(2, "Nom d'etablissement requis").max(80),
  orderPrefix: z
    .string()
    .trim()
    .min(1, "Prefixe requis")
    .max(6, "6 caracteres maximum"),
  currencySymbol: z
    .string()
    .trim()
    .min(1, "Devise requise")
    .max(12, "Devise trop longue"),
  supportPhone: z.string().trim().max(30),
  kitchenPrinterEnabled: z.boolean(),
  kitchenPrinterName: z
    .string()
    .trim()
    .min(2, "Nom imprimante requis")
    .max(60),
  kitchenPrinterIp: z
    .string()
    .trim()
    .regex(
      /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/,
      "Adresse IPv4 invalide"
    ),
  kitchenPrinterPort: z
    .number()
    .int("Port invalide")
    .min(1, "Port minimum: 1")
    .max(65535, "Port maximum: 65535"),
  cashierPrinterEnabled: z.boolean(),
  cashierPrinterName: z
    .string()
    .trim()
    .min(2, "Nom imprimante caisse requis")
    .max(60),
  cashierPrinterIp: z
    .string()
    .trim()
    .regex(
      /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/,
      "Adresse IPv4 invalide"
    ),
  cashierPrinterPort: z
    .number()
    .int("Port invalide")
    .min(1, "Port minimum: 1")
    .max(65535, "Port maximum: 65535"),
  autoPrintKitchen: z.boolean(),
  printCustomerReceipt: z.boolean(),
  defaultOrderMode: z.enum(["sur-place", "a-emporter", "livraison"]),
  kitchenRefreshMs: z
    .number()
    .int("Valeur entiere requise")
    .min(1000, "Minimum: 1000 ms")
    .max(60000, "Maximum: 60000 ms"),
  checkoutRefreshMs: z
    .number()
    .int("Valeur entiere requise")
    .min(1000, "Minimum: 1000 ms")
    .max(60000, "Maximum: 60000 ms"),
  soundAlertsEnabled: z.boolean(),
  language: z.enum(["fr", "en"]),
  testTicketMessage: z
    .string()
    .trim()
    .min(5, "Message de test trop court")
    .max(500, "Message de test trop long"),
})

export type AppSettings = z.infer<typeof appSettingsSchema>

export const defaultAppSettings: AppSettings = {
  businessName: "OR'AURA Fast Food",
  orderPrefix: "A",
  currencySymbol: "Ar",
  supportPhone: "+261 34 00 000 00",
  kitchenPrinterEnabled: true,
  kitchenPrinterName: "Cuisine principale",
  kitchenPrinterIp: "192.168.1.100",
  kitchenPrinterPort: 9100,
  cashierPrinterEnabled: true,
  cashierPrinterName: "Caisse principale",
  cashierPrinterIp: "192.168.1.101",
  cashierPrinterPort: 9100,
  autoPrintKitchen: true,
  printCustomerReceipt: true,
  defaultOrderMode: "sur-place",
  kitchenRefreshMs: 3000,
  checkoutRefreshMs: 3000,
  soundAlertsEnabled: true,
  language: "fr",
  testTicketMessage:
    "Ticket de test OR'AURA\n1 x Burger Classic\n1 x Frites\nMerci et bon service.",
}

const APP_SETTINGS_STORAGE_KEY = "oraura.app.settings"

export function readStoredAppSettings(): AppSettings {
  if (typeof window === "undefined") {
    return defaultAppSettings
  }

  const rawValue = window.localStorage.getItem(APP_SETTINGS_STORAGE_KEY)

  if (!rawValue) {
    return defaultAppSettings
  }

  try {
    const parsed = JSON.parse(rawValue)
    return appSettingsSchema.parse({
      ...defaultAppSettings,
      ...parsed,
    })
  } catch {
    return defaultAppSettings
  }
}

export function writeStoredAppSettings(settings: AppSettings) {
  if (typeof window === "undefined") {
    return
  }

  window.localStorage.setItem(APP_SETTINGS_STORAGE_KEY, JSON.stringify(settings))
  window.dispatchEvent(new CustomEvent(APP_SETTINGS_UPDATED_EVENT))
}

export function resetStoredAppSettings() {
  if (typeof window === "undefined") {
    return
  }

  window.localStorage.removeItem(APP_SETTINGS_STORAGE_KEY)
  window.dispatchEvent(new CustomEvent(APP_SETTINGS_UPDATED_EVENT))
}
