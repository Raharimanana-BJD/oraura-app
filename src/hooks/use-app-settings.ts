import { useEffect, useState } from "react"

import {
  APP_SETTINGS_UPDATED_EVENT,
  type AppSettings,
  readStoredAppSettings,
} from "@/lib/app-settings"

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>(readStoredAppSettings)

  useEffect(() => {
    const syncSettings = () => {
      setSettings(readStoredAppSettings())
    }

    window.addEventListener("storage", syncSettings)
    window.addEventListener(APP_SETTINGS_UPDATED_EVENT, syncSettings)

    return () => {
      window.removeEventListener("storage", syncSettings)
      window.removeEventListener(APP_SETTINGS_UPDATED_EVENT, syncSettings)
    }
  }, [])

  return settings
}
