import { useEffect, useMemo, useState } from "react"
import { listen } from "@tauri-apps/api/event"
import { invoke } from "@tauri-apps/api/core"

import {
  ORDERS_UPDATED_EVENT,
  type CreateOrderInput,
  type LocalOrder,
  type PaymentMethod,
} from "@/lib/orders"

export function useOrders() {
  const [orders, setOrders] = useState<LocalOrder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function refreshOrders() {
    try {
      const nextOrders = await invoke<LocalOrder[]>("list_orders")
      setOrders(nextOrders)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chargement des commandes impossible.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void refreshOrders()

    let mounted = true
    let unlisten: (() => void) | undefined

    void listen(ORDERS_UPDATED_EVENT, () => {
      if (mounted) {
        void refreshOrders()
      }
    }).then((dispose) => {
      unlisten = dispose
    })

    return () => {
      mounted = false
      unlisten?.()
    }
  }, [])

  const actions = useMemo(
    () => ({
      async refresh() {
        await refreshOrders()
      },
      async createOrder(input: CreateOrderInput) {
        const created = await invoke<LocalOrder>("create_order", { input })
        await refreshOrders()
        return created
      },
      async markReady(orderId: string) {
        const updated = await invoke<LocalOrder>("mark_order_ready", { orderId })
        await refreshOrders()
        return updated
      },
      async completePayment(orderId: string, paymentMethod: PaymentMethod) {
        const updated = await invoke<LocalOrder>("complete_order_payment", {
          orderId,
          input: { paymentMethod },
        })
        await refreshOrders()
        return updated
      },
    }),
    []
  )

  return {
    orders,
    isLoading,
    error,
    ...actions,
  }
}
