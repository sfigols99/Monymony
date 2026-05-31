/**
 * Curated list of Google Material Symbols relevant to household expenses.
 * Store the symbol name (e.g. "bolt") in the DB; render with
 * <span className="material-symbols-rounded">{name}</span>.
 */
export const EXPENSE_ICONS = [
  "category",
  "bolt", // energía / luz
  "water_drop", // agua
  "local_fire_department", // gas
  "wifi", // internet
  "shopping_cart", // supermercado
  "restaurant", // comida / restaurantes
  "local_grocery_store",
  "home", // hogar / alquiler
  "house",
  "payments", // préstamos / pagos
  "credit_card",
  "account_balance", // impuestos / banco
  "receipt_long", // facturas
  "savings", // ahorro
  "pets", // mascotas
  "kitchen", // electrodomésticos
  "chair", // muebles
  "directions_car", // coche / transporte
  "local_gas_station", // gasolina
  "directions_bus", // transporte público
  "flight", // viajes
  "school", // educación
  "medical_services", // salud
  "medication", // farmacia
  "fitness_center", // gimnasio
  "sports_esports", // ocio
  "movie", // entretenimiento
  "celebration", // fiestas / regalos
  "checkroom", // ropa
  "child_care", // niños
  "cleaning_services", // limpieza
  "build", // reparaciones
  "phone_iphone", // teléfono
  "subscriptions", // suscripciones
  "card_giftcard", // regalos
] as const;

export type ExpenseIcon = (typeof EXPENSE_ICONS)[number];

/** Palette for category colors. */
export const CATEGORY_COLORS = [
  "#6366f1", // indigo
  "#ef4444", // red
  "#f97316", // orange
  "#f59e0b", // amber
  "#eab308", // yellow
  "#22c55e", // green
  "#10b981", // emerald
  "#14b8a6", // teal
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#d946ef", // fuchsia
  "#ec4899", // pink
  "#78716c", // stone
] as const;
