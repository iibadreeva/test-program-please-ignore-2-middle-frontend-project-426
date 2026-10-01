"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  clearCheckoutCartSnapshot,
  markCheckoutCartPlaced,
  markCheckoutCartUnconfirmed,
  readCheckoutPending,
  saveCheckoutCartSnapshot,
} from "@/features/cart/checkout-cart-snapshot";
import { addRef, type CartRef } from "@/features/cart/cart-items";
import { useCartMerged } from "@/features/cart/use-cart-merged";
import { useCartStore } from "@/features/cart/store";
import { checkoutAction, type CheckoutFormState } from "@/features/checkout/actions";
import { CheckoutFields, type CheckoutValues } from "@/features/checkout/fields";
import { OrderErrorBlock } from "@/features/checkout/order-error";
import { CheckoutLoading, checkoutPreflight } from "@/features/checkout/preflight";
import { CheckoutSummary } from "@/features/checkout/summary";
import { UnconfirmedCheckoutNotice } from "@/features/checkout/unconfirmed-notice";
import {
  checkoutFieldNames,
  validateCheckoutFields,
  type CheckoutFieldErrors,
  type CheckoutFieldName,
} from "@/shared/checkout-fields-schema";
import { checkoutSuccessPath } from "@/shared/auth-next";

type Props = {
  defaultName?: string;
};

/** loading — снимок ещё не прочитан, пустую корзину не показываем. */
type CheckoutGate = "loading" | "ready" | "unconfirmed";

const initial: CheckoutFormState = { ok: false };

function pickCheckoutFieldErrors(errors: CheckoutFormState["fieldErrors"]): CheckoutFieldErrors {
  if (!errors) return {};
  const out: CheckoutFieldErrors = {};
  for (const name of checkoutFieldNames) {
    const messages = errors[name];
    if (messages && messages.length > 0) out[name] = messages;
  }
  return out;
}

function restoreCheckoutCart(snapshot: CartRef[]) {
  useCartStore.getState().replaceRefs(snapshot);
  clearCheckoutCartSnapshot();
}

function buildCheckoutFormData(values: CheckoutValues, refs: CartRef[]): FormData {
  const formData = new FormData();
  formData.set("deliveryType", values.deliveryType);
  if (values.deliveryType === "delivery") {
    formData.set("address", values.address);
  }
  formData.set("recipientName", values.recipientName);
  formData.set("phone", values.phone);
  formData.set(
    "items",
    JSON.stringify(
      refs.map((ref) => ({
        productId: ref.productId,
        quantity: ref.quantity,
      })),
    ),
  );
  return formData;
}

/** Пустую корзину подменяем снимком. Если после сбоя уже добавили товары — дописываем снимок. */
function mergeUnconfirmedRefs(): CartRef[] | null {
  const pending = readCheckoutPending();
  if (pending?.status !== "unconfirmed") return null;
  const current = useCartStore.getState().refs;
  if (current.length === 0) return pending.refs;
  return pending.refs.reduce((refs, ref) => addRef(refs, ref.productId, ref.quantity), current);
}

type PlaceCheckoutArgs = {
  state: CheckoutFormState;
  formData: FormData;
  snapshot: CartRef[];
  setState: (next: CheckoutFormState) => void;
  setFieldErrors: (errors: CheckoutFieldErrors) => void;
  onUnconfirmed: () => void;
};

async function placeCheckoutOrder({
  state,
  formData,
  snapshot,
  setState,
  setFieldErrors,
  onUnconfirmed,
}: PlaceCheckoutArgs): Promise<void> {
  try {
    saveCheckoutCartSnapshot(snapshot);
    useCartStore.getState().clear();
    const result = await checkoutAction(state, formData);
    if (!result.ok) {
      restoreCheckoutCart(snapshot);
      setFieldErrors(pickCheckoutFieldErrors(result.fieldErrors));
      setState({ ...result, fieldErrors: undefined });
      return;
    }
    markCheckoutCartPlaced();
    setState(result);
  } catch (error) {
    // Ответ мог потеряться уже после создания заказа. Корзину не возвращаем:
    // повторная отправка списала бы остаток второй раз.
    Sentry.captureException(error);
    markCheckoutCartUnconfirmed();
    setFieldErrors({});
    setState({ ok: false });
    onUnconfirmed();
  }
}

export function CheckoutForm({ defaultName = "" }: Props) {
  const router = useRouter();
  const submittingRef = useRef(false);
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState<CheckoutFormState>(initial);
  const [deliveryType, setDeliveryType] = useState<CheckoutValues["deliveryType"]>("delivery");
  const [address, setAddress] = useState("");
  const [recipientName, setRecipientName] = useState(defaultName);
  const [phone, setPhone] = useState("");
  const [fieldErrors, setFieldErrors] = useState<CheckoutFieldErrors>({});
  const [gate, setGate] = useState<CheckoutGate>("loading");

  // Без syncClamped: недоступные позиции доживают до сервера и попадают в атомарный отказ.
  const cart = useCartMerged({ syncClamped: false });

  useEffect(() => {
    setGate(readCheckoutPending()?.status === "unconfirmed" ? "unconfirmed" : "ready");
  }, []);

  useEffect(() => {
    if (!state.ok || !state.orderId) return;
    router.replace(checkoutSuccessPath(state.orderId));
  }, [state.ok, state.orderId, router]);

  const clearFieldError = (field: CheckoutFieldName) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submittingRef.current) return;

    const values = { deliveryType, address, recipientName, phone };
    const localErrors = validateCheckoutFields(values);
    if (Object.keys(localErrors).length > 0) {
      setFieldErrors(localErrors);
      setState({ ok: false });
      return;
    }

    setFieldErrors({});
    submittingRef.current = true;
    const formData = buildCheckoutFormData(values, cart.refs);

    startTransition(async () => {
      try {
        await placeCheckoutOrder({
          state,
          formData,
          snapshot: useCartStore.getState().refs,
          setState,
          setFieldErrors,
          onUnconfirmed: () => setGate("unconfirmed"),
        });
      } finally {
        submittingRef.current = false;
      }
    });
  };

  const onDeliveryType = (value: CheckoutValues["deliveryType"]) => {
    setDeliveryType(value);
    clearFieldError("deliveryType");
    if (value === "pickup") clearFieldError("address");
  };
  const onAddress = (value: string) => {
    setAddress(value);
    clearFieldError("address");
  };
  const onRecipientName = (value: string) => {
    setRecipientName(value);
    clearFieldError("recipientName");
  };
  const onPhone = (value: string) => {
    setPhone(value);
    clearFieldError("phone");
  };

  const finishUnconfirmed = (restore: boolean) => {
    if (restore) {
      const restored = mergeUnconfirmedRefs();
      if (restored) useCartStore.getState().replaceRefs(restored);
    }
    clearCheckoutCartSnapshot();
    setGate("ready");
    setState(initial);
  };

  const renderCheckout = () => {
    const placing = isPending || Boolean(state.ok && state.orderId);
    if (gate === "loading" && !placing) return <CheckoutLoading />;
    if (gate === "unconfirmed" && !placing) {
      return (
        <UnconfirmedCheckoutNotice
          onRestore={() => finishUnconfirmed(true)}
          onKeep={() => finishUnconfirmed(false)}
        />
      );
    }

    const preflight = checkoutPreflight(cart, placing);
    if (preflight) return preflight;

    return (
      <form
        onSubmit={handleSubmit}
        className="grid gap-8 lg:grid-cols-[1fr_320px]"
        data-testid="checkout-form"
        noValidate
      >
        <div className="space-y-6">
          <CheckoutFields
            values={{ deliveryType, address, recipientName, phone }}
            errors={fieldErrors}
            onDeliveryType={onDeliveryType}
            onAddress={onAddress}
            onRecipientName={onRecipientName}
            onPhone={onPhone}
          />
          <OrderErrorBlock state={state} />
        </div>
        <CheckoutSummary
          merged={cart.merged}
          refsCount={cart.refs.length}
          pending={isPending || state.ok}
        />
      </form>
    );
  };

  return renderCheckout();
}
