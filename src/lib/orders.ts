export const ORDER_STATUSES = ["pending", "approved", "preparing", "shipped", "delivered", "rejected"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STEPS: OrderStatus[] = ["pending", "approved", "preparing", "shipped", "delivered"];

export const ORDER_LABELS: Record<OrderStatus, string> = {
  pending: "Awaiting approval",
  approved: "Approved",
  preparing: "Being prepared",
  shipped: "On its way",
  delivered: "Delivered",
  rejected: "Declined",
};

export type OrderItem = { collection: string; package: string; name?: string; quantity: number; unit_price: number };

export function parseList(text: string) {
  return text.split(/\n|,/).map((line) => line.trim()).filter(Boolean);
}
