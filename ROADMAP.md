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

## Fase 1 — Hogares y miembros

- [ ] Crear / unirse a un hogar (invitaciones por código o email)
- [ ] Gestión de miembros y roles
- [ ] Registrar el **salario** de cada miembro y calcular su **porcentaje de aportación**
- [ ] Onboarding: tras el registro, crear o unirse a un hogar

## Fase 2 — Presupuesto mensual

- [ ] Presupuesto derivado de la suma de salarios
- [ ] Override **manual** del presupuesto por mes
- [ ] Vista de planificación mensual (presupuesto vs. gastado)
- [ ] Reparto de aportaciones por miembro según porcentaje

## Fase 3 — Conceptos (categorías)

- [ ] CRUD de conceptos por hogar (energía, supermercado, préstamos, impuestos, mascotas, electrodomésticos…)
- [ ] Selector de **color**
- [ ] Selector de **icono** desde catálogo de Google Material Symbols
- [ ] Límite de gasto opcional por concepto

## Fase 4 — Gastos por formulario

- [ ] Alta de gasto: importe (€), concepto, fecha, pagado por, descripción
- [ ] Listado, edición y borrado de gastos
- [ ] Filtros (mes, concepto, miembro) y totales

## Fase 5 — Alertas

- [ ] Definir reglas de alerta (por % del presupuesto o importe absoluto)
- [ ] Alertas globales y por concepto
- [ ] Indicadores visuales + notificaciones cuando se supera el umbral

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
- [ ] i18n (español por defecto)
- [ ] Accesibilidad
