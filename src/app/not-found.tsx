import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-start justify-center gap-4 px-4 py-16">
      <p className="font-mono text-sm text-muted">404</p>
      <h1 className="font-display text-3xl font-semibold">Страница не найдена</h1>
      <p className="text-muted">Запрошенный адрес не существует или был перемещён.</p>
      <Link href="/" className="text-accent underline-offset-4 hover:underline">
        На главную
      </Link>
    </main>
  );
}
