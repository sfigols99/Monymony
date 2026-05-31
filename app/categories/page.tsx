import Link from "next/link";
import { redirect } from "next/navigation";
import { getActiveHousehold } from "@/lib/household";
import { getCategories } from "@/lib/categories";
import { CategoryForm } from "@/components/CategoryForm";
import { CategoryItem } from "@/components/CategoryItem";

export default async function CategoriesPage() {
  const household = await getActiveHousehold();
  if (!household) {
    redirect("/onboarding");
  }

  const categories = await getCategories(household.id);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <Link
            href="/"
            className="text-sm text-neutral-500 hover:text-indigo-600"
          >
            ← {household.name}
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">Conceptos</h1>
          <p className="text-sm text-neutral-500">
            Categorías de gasto del hogar, con color e icono.
          </p>
        </div>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        {/* New category */}
        <section className="rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="mb-4 text-lg font-semibold">Nuevo concepto</h2>
          <CategoryForm />
        </section>

        {/* Existing categories */}
        <section className="rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="mb-4 text-lg font-semibold">
            Tus conceptos{" "}
            <span className="text-sm font-normal text-neutral-400">
              ({categories.length})
            </span>
          </h2>
          {categories.length === 0 ? (
            <p className="text-sm text-neutral-400">
              Aún no hay conceptos. Crea el primero (energía, supermercado,
              préstamos…).
            </p>
          ) : (
            <ul className="space-y-2">
              {categories.map((c) => (
                <CategoryItem key={c.id} category={c} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
