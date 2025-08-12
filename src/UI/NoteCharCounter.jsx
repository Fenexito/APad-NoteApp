import React from "react";

/**
 * Pastilla de contador de caracteres con umbrales visuales.
 *
 * Props:
 *  - noteText: string (contenido completo de la nota a medir)
 *  - limit?: número (default 999)  → solo para colores, no se muestra
 *  - warnAt?: número (default 900) → solo para colores, no se muestra
 *  - className?: string (clases extra opcionales)
 */
export default function NoteCharCounter({
  noteText = "",
  limit = 999,
  warnAt = 900,
  className = "",
}) {
  const count = (noteText || "").length;

  const tone =
    count > limit
      ? // rojo
        "bg-red-50/95 border-red-300 text-red-900 dark:bg-red-900/80 dark:border-red-700 dark:text-red-100"
      : count > warnAt
      ? // ámbar
        "bg-amber-50/95 border-amber-300 text-amber-900 dark:bg-amber-900/80 dark:border-amber-700 dark:text-amber-100"
      : // normal (azul/slate)
        "bg-blue-50/95 border-blue-300 text-blue-900 dark:bg-slate-900/80 dark:border-slate-700 dark:text-slate-100";

  return (
    <span
      className={`
        inline-flex items-center rounded-full border px-3 py-1
        text-[12px] font-bold shadow-sm tabular-nums
        ${tone} ${className}
      `}
      title={`Caracteres: ${count}`}
      aria-label={`Caracteres: ${count}`}
      role="status"
      aria-live="polite"
    >
      {count}
    </span>
  );
}
