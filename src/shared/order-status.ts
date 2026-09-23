/** Человекочитаемый статус заказа для UI. */
export function orderStatusLabel(status: string): string {
  return status === "paid" ? "Оплачен" : status;
}
