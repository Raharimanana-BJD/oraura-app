import { useEffect, useMemo, useState } from "react"

import {
  ORDERS_UPDATED_EVENT,
  createStoredOrder,
  readStoredOrders,
  type LocalOrder,
  type PaymentMethod,
  updateStoredOrder,
} from "@/lib/order-store"

export function useOrders() {
  const [orders, setOrders] = useState<LocalOrder[]>(readStoredOrders)

  useEffect(() => {
    const syncOrders = () => {
      setOrders(readStoredOrders())
    }

    window.addEventListener("storage", syncOrders)
    window.addEventListener(ORDERS_UPDATED_EVENT, syncOrders)

    return () => {
      window.removeEventListener("storage", syncOrders)
      window.removeEventListener(ORDERS_UPDATED_EVENT, syncOrders)
    }
  }, [])

  const actions = useMemo(
    () => ({
      createOrder: createStoredOrder,
      markReady: (orderId: string) => {
        updateStoredOrder(orderId, (order) => ({
          ...order,
          kitchenStatus: "READY",
        }))
      },
      completePayment: (orderId: string, paymentMethod: PaymentMethod) => {
        updateStoredOrder(orderId, (order) => ({
          ...order,
          paymentStatus: "COMPLETED",
          paymentMethod,
        }))
      },
    }),
    []
  )

  return {
    orders,
    ...actions,
  }
}
