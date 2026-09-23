import { redirect } from "next/navigation";

/** Старый URL списка заказов → кабинет. */
export default function AccountOrdersRedirectPage() {
  redirect("/account");
}
