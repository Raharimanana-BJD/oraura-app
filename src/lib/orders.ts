export const ORDERS_UPDATED_EVENT = "oraura://orders-updated"

export type OrderMode = "sur-place" | "a-emporter" | "livraison"
export type KitchenStatus = "PREPARING" | "READY"
export type PaymentStatus = "PENDING" | "COMPLETED"
export type PaymentMethod = "CASH" | "CARD" | "MOBILE_MONEY"

export type OrderLine = {
  id: string
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

export type CreateOrderLineInput = Pick<OrderLine, "productId" | "quantity">

export type CreateOrderInput = Pick<
  LocalOrder,
  "orderNumber" | "customerName" | "orderMode" | "notes"
> & {
  lines: CreateOrderLineInput[]
}
