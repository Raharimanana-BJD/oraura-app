export const ORDERS_UPDATED_EVENT = "oraura:orders-updated"

const ORDERS_STORAGE_KEY = "oraura.orders"

export type OrderMode = "sur-place" | "a-emporter" | "livraison"
export type KitchenStatus = "PREPARING" | "READY"
export type PaymentStatus = "PENDING" | "COMPLETED"
export type PaymentMethod = "CASH" | "CARD" | "MOBILE_MONEY"

export type OrderLine = {
  productId: string
  name: string
  category: string
  unitPrice: number
  quantity: number
}

export type LocalOrder = {
  id: string
  orderNumber: string
  customerName: string
  orderMode: OrderMode
  notes: string
  lines: OrderLine[]
  totalAmount: number
  totalItems: number
  kitchenStatus: KitchenStatus
  paymentStatus: PaymentStatus
  paymentMethod: PaymentMethod | null
  createdAt: string
  updatedAt: string
}

const seedOrders: LocalOrder[] = [
  {
    id: "seed-1",
    orderNumber: "A-2101",
    customerName: "Table 4",
    orderMode: "sur-place",
    notes: "Sans oignons",
    lines: [
      {
        productId: "burger-classic",
        name: "Burger Classic",
        category: "Burgers",
        unitPrice: 12000,
        quantity: 2,
      },
    ],
    totalAmount: 24000,
    totalItems: 2,
    kitchenStatus: "PREPARING",
    paymentStatus: "PENDING",
    paymentMethod: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "seed-2",
    orderNumber: "A-2102",
    customerName: "Client comptoir",
    orderMode: "a-emporter",
    notes: "",
    lines: [
      {
        productId: "tacos-xl",
        name: "Menu Tacos XL",
        category: "Tacos",
        unitPrice: 22000,
        quantity: 1,
      },
    ],
    totalAmount: 22000,
    totalItems: 1,
    kitchenStatus: "READY",
    paymentStatus: "PENDING",
    paymentMethod: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

function canUseStorage() {
  return typeof window !== "undefined"
}

function notifyOrdersUpdated() {
  if (!canUseStorage()) {
    return
  }

  window.dispatchEvent(new CustomEvent(ORDERS_UPDATED_EVENT))
}

function writeOrders(orders: LocalOrder[]) {
  if (!canUseStorage()) {
    return
  }

  window.localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders))
  notifyOrdersUpdated()
}

export function readStoredOrders() {
  if (!canUseStorage()) {
    return seedOrders
  }

  const rawValue = window.localStorage.getItem(ORDERS_STORAGE_KEY)

  if (!rawValue) {
    writeOrders(seedOrders)
    return seedOrders
  }

  try {
    return JSON.parse(rawValue) as LocalOrder[]
  } catch {
    writeOrders(seedOrders)
    return seedOrders
  }
}

export function createStoredOrder(
  order: Omit<LocalOrder, "id" | "createdAt" | "updatedAt">
) {
  const nextOrder: LocalOrder = {
    ...order,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  const currentOrders = readStoredOrders()
  writeOrders([nextOrder, ...currentOrders])

  return nextOrder
}

export function updateStoredOrder(
  orderId: string,
  updater: (order: LocalOrder) => LocalOrder
) {
  const updatedOrders = readStoredOrders().map((order) =>
    order.id === orderId
      ? {
          ...updater(order),
          updatedAt: new Date().toISOString(),
        }
      : order
  )

  writeOrders(updatedOrders)
}
