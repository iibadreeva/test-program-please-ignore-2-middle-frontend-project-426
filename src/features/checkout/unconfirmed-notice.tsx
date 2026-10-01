import Link from "next/link";
import { routes } from "@/shared/routes";

/** Ответ потерян: заказ мог уже создаться, форму отправки не показываем. */
export function UnconfirmedCheckoutNotice({
  onRestore,
  onKeep,
}: {
  onRestore: () => void;
  onKeep: () => void;
}) {
  return (
    <div className="space-y-4" data-testid="checkout-unconfirmed">
      <p className="border-border bg-surface text-danger border p-6" role="alert">
        Не удалось подтвердить, что заказ создан. Проверьте заказы в личном кабинете. Если заказа
        нет, верните корзину и оформите ещё раз. Если заказ уже есть, оставьте текущую корзину.
      </p>
      <div className="flex flex-wrap gap-4">
        <Link href={routes.account} className="text-accent inline-block hover:underline">
          К заказам
        </Link>
        <button
          type="button"
          onClick={onRestore}
          className="border-border hover:border-accent border px-5 py-2.5"
          data-testid="checkout-restore-cart"
        >
          Вернуть корзину
        </button>
        <button
          type="button"
          onClick={onKeep}
          className="border-border hover:border-accent border px-5 py-2.5"
          data-testid="checkout-keep-cart"
        >
          Оставить текущую корзину
        </button>
      </div>
    </div>
  );
}
