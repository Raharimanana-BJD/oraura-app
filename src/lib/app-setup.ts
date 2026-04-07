import { invoke } from "@tauri-apps/api/core"
import { z } from "zod"

export const appSetupStateSchema = z.object({
  setupCompleted: z.boolean(),
  operatorName: z.string(),
  operatorRole: z.enum(["manager", "cashier", "server", "kitchen"]),
  stationName: z.string(),
  completedAt: z.string().nullable(),
})

export const completeAppSetupInputSchema = z.object({
  operatorName: z.string().trim().min(2, "Nom operateur requis").max(80),
  operatorRole: z.enum(["manager", "cashier", "server", "kitchen"]),
  stationName: z.string().trim().min(2, "Nom du poste requis").max(80),
})

export type AppSetupState = z.infer<typeof appSetupStateSchema>
export type CompleteAppSetupInput = z.infer<typeof completeAppSetupInputSchema>

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === "string") {
    return error
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message
  }

  return fallback
}

export async function fetchAppSetupState() {
  try {
    return appSetupStateSchema.parse(await invoke<AppSetupState>("get_app_setup_state"))
  } catch (error) {
    throw new Error(getErrorMessage(error, "Chargement de l'installation impossible."))
  }
}

export async function completeAppSetup(input: CompleteAppSetupInput) {
  const validated = completeAppSetupInputSchema.parse(input)

  try {
    return appSetupStateSchema.parse(
      await invoke<AppSetupState>("complete_app_setup", { input: validated })
    )
  } catch (error) {
    throw new Error(getErrorMessage(error, "Finalisation de l'installation impossible."))
  }
}

export function roleLabel(role: AppSetupState["operatorRole"]) {
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
