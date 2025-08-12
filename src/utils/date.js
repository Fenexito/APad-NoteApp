// utils/date.js
export const GT_TZ = "America/Guatemala";

/**
 * Devuelve claves normalizadas (YYYY-MM y YYYY-MM-DD) calculadas
 * SIEMPRE en la zona horaria de Guatemala.
 */
function keysFrom(dateLike) {
  const d = new Date(dateLike ?? Date.now());

  // Usamos 'en-CA' para obtener YYYY-MM-DD con ceros a la izquierda.
  const y   = d.toLocaleString("en-CA", { timeZone: GT_TZ, year: "numeric" });
  const mon = d.toLocaleString("en-CA", { timeZone: GT_TZ, month: "2-digit" });
  const day = d.toLocaleString("en-CA", { timeZone: GT_TZ, day: "2-digit" });

  return {
    monthKey: `${y}-${mon}`,       // YYYY-MM
    dayKey:   `${y}-${mon}-${day}` // YYYY-MM-DD
  };
}

/**
 * Agrupa notas por MES y luego por DÍA, usando la hora de Guatemala.
 * Estructura: { '2025-07': { '2025-07-10': [nota1, nota2], ... }, ... }
 */
export function groupNotesByMonthDay(notes = []) {
  const out = {};
  for (const n of notes) {
    // Toma la mejor fecha disponible
    const created = n.createdAt || n.created || n.timestamp || n.id || Date.now();
    const { monthKey, dayKey } = keysFrom(created);

    if (!out[monthKey]) out[monthKey] = {};
    if (!out[monthKey][dayKey]) out[monthKey][dayKey] = [];

    out[monthKey][dayKey].push(n);
  }
  return out;
}

/**
 * Formatea el encabezado del mes (en español de Guatemala).
 * Ej: "agosto de 2025" (si quieres mayúsculas, aplica .toUpperCase()).
 */
export function formatMonth(monthKey) {
  const [y, m] = String(monthKey).split("-");
  // Creamos una fecha del primer día del mes en GT
  const date = new Date(`${y}-${m}-01T00:00:00`);
  const label = date.toLocaleDateString("es-GT", {
    timeZone: GT_TZ,
    month: "long",
    year: "numeric",
  });
  return label.toUpperCase(); // conserva tu estilo en mayúsculas
}

/**
 * Formatea el encabezado del día (en español de Guatemala).
 * Ej: "vie, 09 ago 2025"
 */
export function formatDay(dayKey) {
  const date = new Date(`${dayKey}T00:00:00`);
  return date.toLocaleDateString("es-GT", {
    timeZone: GT_TZ,
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
