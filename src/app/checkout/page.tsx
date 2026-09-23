import { redirect } from "next/navigation";
import { CheckoutForm } from "@/features/checkout-form";
import { requireUser } from "@/server/auth/session";
import { loginHref } from "@/shared/auth-next";

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const user = await requireUser().catch(() => null);
  if (!user) redirect(loginHref("/checkout"));

  return (
    <div data-testid="checkout-page" className="space-y-6">
      <h1 className="font-display text-3xl font-semibold">Оформление заказа</h1>
      <CheckoutForm defaultName={user.name} />
    </div>
  );
}
