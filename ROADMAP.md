# Monymony — Roadmap

Aplicación para **gestionar gastos conjuntos en el hogar**. Permite planificar
gastos mensuales según un presupuesto (suma de los salarios de los miembros,
ponderado por porcentaje), registrar gastos por formulario o por foto de ticket
(OCR), categorizarlos con conceptos personalizables (color + icono de Google), y
recibir alertas cuando se gasta de más. Divisa: **euros (€)**.

**Stack:** Next.js (App Router) · Supabase (Auth + Postgres + Storage) · Vercel.
Objetivo de **coste 0** usando los planes gratuitos.

---

## Fase 0 — Fundamentos ✅ (en curso)

- [x] Scaffold Next.js 15 + TypeScript + Tailwind v4
- [x] Integración Supabase (`@supabase/ssr`): clientes browser/server + middleware de sesión
- [x] Esquema de base de datos inicial con RLS (hogares, miembros, conceptos, presupuestos, gastos, alertas)
- [x] Autenticación: login / registro / logout con email + contraseña
- [x] `CLAUDE.md` + `ROADMAP.md`
- [ ] Configurar proyecto Supabase real y aplicar migración
- [ ] Despliegue inicial en Vercel

## Fase 1 — Hogares y miembros ✅

- [x] Crear / unirse a un hogar (invitaciones por **código**)
- [x] Roster de miembros y rol (owner/member)
- [x] Registrar el **salario** de cada miembro y calcular su **porcentaje de aportación**
- [x] Onboarding: tras el registro, crear o unirse a un hogar
- [x] Salir del hogar
- [ ] Invitaciones por email (pendiente; de momento por código)
- [ ] Soporte multi-hogar / cambio de hogar (de momento se usa el primero)

## Fase 2 — Presupuesto mensual ✅

- [x] Presupuesto derivado de la suma de salarios
- [x] Override **manual** del presupuesto por mes (con reset a salarios)
- [x] **N presupuestos con nombre** (hipoteca, súper…), cada uno con su importe
- [x] **Reparto por presupuesto**: proporcional a los ingresos o a partes iguales
- [x] Prioridad del total: override-mes > suma de presupuestos > salarios
- [x] Vista de planificación mensual (presupuesto vs. gastado) con navegación por meses
- [x] Reparto de aportaciones por miembro según porcentaje
- [x] Gasto agrupado por concepto en el mes
- [x] Página `/budget`

## Fase 3 — Conceptos (categorías) ✅

- [x] CRUD de conceptos por hogar (energía, supermercado, préstamos, impuestos, mascotas, electrodomésticos…)
- [x] Selector de **color** (paleta)
- [x] Selector de **icono** desde catálogo de Google Material Symbols
- [x] Límite de gasto opcional por concepto
- [x] Página `/categories` con alta, edición inline y borrado

## Fase 4 — Gastos por formulario ✅

- [x] Alta de gasto: importe (€), concepto, fecha, pagado por, descripción
- [x] Listado, edición y borrado de gastos (inline)
- [x] Filtros (mes, concepto, miembro) y total filtrado
- [x] Página `/expenses`; los gastos alimentan el presupuesto (Fase 2)

## Fase 5 — Alertas ✅

- [x] Definir reglas de alerta (por % del presupuesto/límite o importe absoluto)
- [x] Alertas globales (todo el hogar), por concepto y **por presupuesto**
- [x] Conceptos asignables a un presupuesto (gasto del presupuesto = sus conceptos)
- [x] Activar/desactivar, editar y borrar alertas
- [x] Indicadores visuales: banner de alertas disparadas en dashboard y `/alerts`

## Fase 6 — Gastos por foto de ticket (OCR)

- [ ] Subida de foto a Supabase Storage
- [ ] Pipeline OCR para extraer importe (y opcionalmente comercio/fecha)
- [ ] Gasto en estado `pending` para **validación del usuario** antes de confirmar
- [ ] Edición del resultado OCR y confirmación

## Fase 7 — Análisis y predicción

- [ ] Dashboard con gráficos (gasto por concepto, evolución mensual)
- [ ] Algoritmo de **predicción de gastos** futuros
- [ ] Recomendaciones de ahorro

## Transversal

- [ ] Tests (unitarios + e2e)
- [ ] Diseño responsive / PWA
- [x] i18n con **next-intl** (es/en/ca, selección por cookie; español por defecto)
  - [x] Mensajes de error de las Server Actions traducidos (devuelven claves del namespace `errors`)
- [ ] Accesibilidad
