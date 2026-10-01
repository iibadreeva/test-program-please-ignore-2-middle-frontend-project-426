"use client";

import { useLayoutEffect, useRef } from "react";
import { applyPhoneMask } from "@/shared/phone-mask";
import type { CheckoutFieldErrors } from "@/shared/checkout-fields-schema";

type DeliveryType = "delivery" | "pickup";

export type CheckoutValues = {
  deliveryType: DeliveryType;
  address: string;
  recipientName: string;
  phone: string;
};

const DELIVERY_ERROR_ID = "checkout-delivery-type-error";
const ADDRESS_ERROR_ID = "checkout-address-error";
const NAME_ERROR_ID = "checkout-name-error";
const PHONE_ERROR_ID = "checkout-phone-error";
const PHONE_HINT_ID = "checkout-phone-hint";

function inputBorderClass(hasError: boolean): string {
  return hasError
    ? "border-danger focus:border-danger text-danger focus:ring-danger"
    : "border-border";
}

/** Ошибка связана с полем: aria-invalid + aria-describedby, текст в role="alert". */
function invalidFieldProps(errorId: string, hasError: boolean, validDescribedBy?: string) {
  if (!hasError) {
    return validDescribedBy ? { "aria-describedby": validDescribedBy } : {};
  }
  return {
    "aria-invalid": true as const,
    "aria-describedby": errorId,
  };
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <span id={id} role="alert" className="text-danger mt-1 block text-xs">
      {message}
    </span>
  );
}

function PhoneInput({
  value,
  hasError,
  onValue,
}: {
  value: string;
  hasError: boolean;
  onValue: (value: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const caretRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    const input = inputRef.current;
    const caret = caretRef.current;
    if (!input || caret === null) return;
    caretRef.current = null;
    input.setSelectionRange(caret, caret);
  });

  return (
    <input
      ref={inputRef}
      type="tel"
      name="phone"
      value={value}
      onChange={(event) => {
        const next = applyPhoneMask(
          event.target.value,
          event.target.selectionStart ?? event.target.value.length,
        );
        caretRef.current = next.selectionStart;
        onValue(next.value);
      }}
      required
      placeholder="+7 (999) 000-00-00"
      className={`bg-bg text-text mt-1 w-full border px-3 py-2 ${inputBorderClass(hasError)}`}
      data-testid="checkout-phone"
      {...invalidFieldProps(PHONE_ERROR_ID, hasError, PHONE_HINT_ID)}
    />
  );
}

function DeliveryTypeField({
  value,
  error,
  onChange,
}: {
  value: DeliveryType;
  error?: string;
  onChange: (value: DeliveryType) => void;
}) {
  return (
    <label className="block text-sm">
      <span className="text-muted">Способ получения</span>
      <select
        name="deliveryType"
        className={`bg-bg text-text mt-1 w-full border px-3 py-2 ${inputBorderClass(Boolean(error))}`}
        value={value}
        onChange={(event) => {
          onChange(event.target.value === "pickup" ? "pickup" : "delivery");
        }}
        data-testid="checkout-method"
        {...invalidFieldProps(DELIVERY_ERROR_ID, Boolean(error))}
      >
        <option value="delivery">Доставка</option>
        <option value="pickup">Самовывоз</option>
      </select>
      <FieldError id={DELIVERY_ERROR_ID} message={error} />
    </label>
  );
}

function AddressField({
  value,
  error,
  onChange,
}: {
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm">
      <span className="text-muted">Адрес доставки</span>
      <textarea
        name="address"
        rows={3}
        className={`bg-bg text-text mt-1 w-full border px-3 py-2 ${inputBorderClass(Boolean(error))}`}
        placeholder="Улица, дом, квартира"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        data-testid="checkout-address"
        {...invalidFieldProps(ADDRESS_ERROR_ID, Boolean(error))}
      />
      <FieldError id={ADDRESS_ERROR_ID} message={error} />
    </label>
  );
}

function RecipientNameField({
  value,
  error,
  onChange,
}: {
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm">
      <span className="text-muted">Получатель</span>
      <input
        type="text"
        name="recipientName"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
        className={`bg-bg text-text mt-1 w-full border px-3 py-2 ${inputBorderClass(Boolean(error))}`}
        data-testid="checkout-name"
        {...invalidFieldProps(NAME_ERROR_ID, Boolean(error))}
      />
      <FieldError id={NAME_ERROR_ID} message={error} />
    </label>
  );
}

function PhoneField({
  value,
  error,
  onChange,
}: {
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm">
      <span className="text-muted">Телефон</span>
      <PhoneInput value={value} hasError={Boolean(error)} onValue={onChange} />
      {error ? (
        <FieldError id={PHONE_ERROR_ID} message={error} />
      ) : (
        <span
          id={PHONE_HINT_ID}
          className="text-muted mt-1 block text-xs"
          data-testid="checkout-phone-hint"
        >
          Формат: +7 (XXX) XXX-XX-XX (10 цифр номера)
        </span>
      )}
    </label>
  );
}

export function CheckoutFields({
  values,
  errors,
  onDeliveryType,
  onAddress,
  onRecipientName,
  onPhone,
}: {
  values: CheckoutValues;
  errors: CheckoutFieldErrors;
  onDeliveryType: (value: DeliveryType) => void;
  onAddress: (value: string) => void;
  onRecipientName: (value: string) => void;
  onPhone: (value: string) => void;
}) {
  return (
    <>
      <DeliveryTypeField
        value={values.deliveryType}
        error={errors.deliveryType?.[0]}
        onChange={onDeliveryType}
      />
      {values.deliveryType === "delivery" ? (
        <AddressField value={values.address} error={errors.address?.[0]} onChange={onAddress} />
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <RecipientNameField
          value={values.recipientName}
          error={errors.recipientName?.[0]}
          onChange={onRecipientName}
        />
        <PhoneField value={values.phone} error={errors.phone?.[0]} onChange={onPhone} />
      </div>
    </>
  );
}
