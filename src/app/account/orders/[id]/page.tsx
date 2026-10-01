import { redirect } from "next/navigation";
import { accountOrderListPath } from "@/shared/auth-next";

type Props = {
  params: Promise<{ id: string }>;
};

/** Старый URL карточки заказа → кабинет с раскрытым заказом. */
export default async function AccountOrderDetailRedirectPage({ params }: Props) {
  const { id } = await params;
  redirect(accountOrderListPath(id));
}
