import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center px-4">
      <section className="w-full max-w-sm rounded-lg border border-[var(--line)] bg-[var(--panel)] p-6">
        <h1 className="text-2xl font-semibold">Вход в хранилище</h1>
        <p className="mb-5 mt-2 text-sm text-[var(--muted)]">Доступ только для пользователей с учетной записью.</p>
        <Suspense>
          <LoginForm />
        </Suspense>
      </section>
    </main>
  );
}
