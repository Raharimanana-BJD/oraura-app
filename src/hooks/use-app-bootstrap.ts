import { invoke } from "@tauri-apps/api/core"
import { useEffect, useState } from "react"

import { fetchAppSetupState, type AppSetupState } from "@/lib/app-setup"

export type DatabaseStatus = {
  connected: boolean
  message: string
}

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

async function readDatabaseStatus() {
  return invoke<DatabaseStatus>("database_status")
}

async function tryInitializeDatabase() {
  return invoke<DatabaseStatus>("initialize_database")
}

export function useAppBootstrap() {
  const [isLoading, setIsLoading] = useState(true)
  const [databaseStatus, setDatabaseStatus] = useState<DatabaseStatus | null>(null)
  const [setupState, setSetupState] = useState<AppSetupState | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function refresh(options?: { forceInitialize?: boolean }) {
    setIsLoading(true)
    setError(null)

    try {
      let nextDatabaseStatus = await readDatabaseStatus()

      if (!nextDatabaseStatus.connected || options?.forceInitialize) {
        try {
          nextDatabaseStatus = await tryInitializeDatabase()
        } catch (initializeError) {
          nextDatabaseStatus = {
            connected: false,
            message: getErrorMessage(
              initializeError,
              "Connexion PostgreSQL impossible."
            ),
          }
        }
      }

      setDatabaseStatus(nextDatabaseStatus)

      if (!nextDatabaseStatus.connected) {
        setSetupState(null)
        return
      }

      const nextSetupState = await fetchAppSetupState()
      setSetupState(nextSetupState)
    } catch (nextError) {
      setError(
        getErrorMessage(nextError, "Initialisation de l'application impossible.")
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  return {
    isLoading,
    databaseStatus,
    setupState,
    error,
    refresh,
    setSetupState,
  }
}
