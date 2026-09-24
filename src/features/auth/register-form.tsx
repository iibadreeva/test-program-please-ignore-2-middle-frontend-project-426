"use client";

import Link from "next/link";
import { useActionState } from "react";
import { registerAction, type AuthFormState } from "@/features/auth/actions";

const initial: AuthFormState = { ok: false };

export function RegisterForm() {
  const [state, action, pending] = useActionState(registerAction, initial);

  return (
    <form action={action} className="mt-6 space-y-4" data-testid="register-form" noValidate>
      <label className="block text-sm">
        <span className="text-muted">Имя</span>
        <input
          type="text"
          name="name"
          autoComplete="name"
          className="mt-1 w-full border border-border bg-bg px-3 py-2 text-text"
          data-testid="auth-name"
        />
      </label>

      <label className="block text-sm">
        <span className="text-muted">Email</span>
        <input
          type="email"
          name="email"
          autoComplete="email"
          required
          className="mt-1 w-full border border-border bg-bg px-3 py-2 text-text"
          data-testid="auth-email"
        />
      </label>

      <label className="block text-sm">
        <span className="text-muted">Пароль</span>
        <input
          type="password"
          name="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="mt-1 w-full border border-border bg-bg px-3 py-2 text-text"
          data-testid="auth-password"
        />
        <span className="mt-1 block text-xs text-muted">Не меньше 8 символов</span>
      </label>

      {state.message ? (
        <p className="text-sm text-danger" role="alert" data-testid="auth-error">
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full bg-accent px-5 py-2.5 font-medium text-bg hover:bg-accent-dim disabled:opacity-40"
        data-testid="auth-submit"
      >
        {pending ? "Создаём…" : "Зарегистрироваться"}
      </button>

      <p className="text-sm text-muted">
        Уже есть аккаунт?{" "}
        <Link href="/login" className="text-accent hover:underline" data-testid="register-to-login">
          Войти
        </Link>
      </p>
    </form>
  );
}
