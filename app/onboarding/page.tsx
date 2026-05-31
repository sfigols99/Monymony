"use client";

import { useActionState, useState } from "react";
import {
  createHousehold,
  joinHousehold,
  type ActionState,
} from "@/app/household/actions";

export default function OnboardingPage() {
  const [mode, setMode] = useState<"create" | "join">("create");

  const [createState, createAction, creating] = useActionState<
    ActionState,
    FormData
  >(createHousehold, null);
  const [joinState, joinAction, joining] = useActionState<ActionState, FormData>(
    joinHousehold,
    null,
  );

  return (
    <main className="flex min-h-dvh items-center justify-center bg-neutral-50 p-4 dark:bg-neutral-950">
      <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold tracking-tight">¡Bienvenido/a!</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Crea un hogar o únete a uno con un código de invitación.
          </p>
        </div>

        <div className="mb-6 grid grid-cols-2 rounded-lg bg-neutral-100 p-1 text-sm font-medium dark:bg-neutral-800">
          <button
            type="button"
            onClick={() => setMode("create")}
            className={`rounded-md px-3 py-1.5 transition ${
              mode === "create"
                ? "bg-white shadow-sm dark:bg-neutral-700"
                : "text-neutral-500"
            }`}
          >
            Crear hogar
          </button>
          <button
            type="button"
            onClick={() => setMode("join")}
            className={`rounded-md px-3 py-1.5 transition ${
              mode === "join"
                ? "bg-white shadow-sm dark:bg-neutral-700"
                : "text-neutral-500"
            }`}
          >
            Unirme
          </button>
        </div>

        {mode === "create" ? (
          <form action={createAction} className="space-y-4">
            <div>
              <label htmlFor="name" className="mb-1 block text-sm font-medium">
                Nombre del hogar
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                placeholder="Casa de la playa"
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-neutral-700 dark:bg-neutral-800"
              />
            </div>
            {createState?.error && (
              <p className="text-sm text-red-600">{createState.error}</p>
            )}
            <button
              type="submit"
              disabled={creating}
              className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-60"
            >
              {creating ? "Creando…" : "Crear hogar"}
            </button>
          </form>
        ) : (
          <form action={joinAction} className="space-y-4">
            <div>
              <label htmlFor="code" className="mb-1 block text-sm font-medium">
                Código de invitación
              </label>
              <input
                id="code"
                name="code"
                type="text"
                required
                autoCapitalize="characters"
                placeholder="A1B2C3"
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm uppercase tracking-widest outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-neutral-700 dark:bg-neutral-800"
              />
            </div>
            {joinState?.error && (
              <p className="text-sm text-red-600">{joinState.error}</p>
            )}
            <button
              type="submit"
              disabled={joining}
              className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-60"
            >
              {joining ? "Uniéndome…" : "Unirme al hogar"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
