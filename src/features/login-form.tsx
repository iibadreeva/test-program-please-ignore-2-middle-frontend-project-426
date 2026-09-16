"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction, type AuthFormState } from "@/features/auth-actions";

const initial: AuthFormState = { ok: false };

type Props = {
  next?: string;
};

export function LoginForm({ next = "/account" }: Props) {
  const [state, action, pending] = useActionState(loginAction, initial);

  return (
    <form action={action} className="mt-6 space-y-4" data-testid="login-form" noValidate>
      <input type="hidden" name="next" value={next} />

      <label className="block text-sm">
        <span className="text-muted">Email</span>
        <input
          type="email"
          name="email"
          autoComplete="email"
          required
          className="mt-1 w-full border border-border bg-bg px-3 py-2 text-text"
          data-testid="login-email"
        />
      </label>

      <label className="block text-sm">
        <span className="text-muted">Пароль</span>
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          required
          className="mt-1 w-full border border-border bg-bg px-3 py-2 text-text"
          data-testid="login-password"
        />
      </label>

      {state.message ? (
        <p className="text-sm text-danger" role="alert" data-testid="login-error">
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full bg-accent px-5 py-2.5 font-medium text-bg hover:bg-accent-dim disabled:opacity-40"
        data-testid="login-submit"
      >
        {pending ? "Входим…" : "Войти"}
      </button>

      <p className="text-sm text-muted">
        Нет аккаунта?{" "}
        <Link href="/register" className="text-accent hover:underline" data-testid="login-to-register">
          Зарегистрироваться
        </Link>
      </p>
    </form>
  );
}
