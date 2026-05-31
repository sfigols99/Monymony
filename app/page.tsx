import { createClient } from "@/lib/supabase/server";
import { signOut } from "./login/actions";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <header className="mb-10 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Monymony</h1>
          <p className="text-sm text-neutral-500">
            Gastos compartidos del hogar
          </p>
        </div>
        <form action={signOut}>
          <button
            type="submit"
            className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium transition hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            Cerrar sesión
          </button>
        </form>
      </header>

      <section className="rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
        <p className="text-sm text-neutral-500">Sesión iniciada como</p>
        <p className="text-lg font-medium">{user?.email}</p>
        <p className="mt-4 text-sm text-neutral-500">
          🚧 Base del proyecto lista. Las siguientes fases (hogares,
          presupuesto, conceptos, gastos, alertas, OCR) están en el{" "}
          <code className="rounded bg-neutral-100 px-1 dark:bg-neutral-800">
            ROADMAP.md
          </code>
          .
        </p>
      </section>
    </main>
  );
}
