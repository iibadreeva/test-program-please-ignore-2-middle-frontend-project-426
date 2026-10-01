import { redirect } from "next/navigation";
import { routes } from "@/shared/routes";

/** Старый URL списка заказов → кабинет. */
export default function AccountOrdersRedirectPage() {
  redirect(routes.account);
}
