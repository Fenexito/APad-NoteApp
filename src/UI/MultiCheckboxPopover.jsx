// src/components/ui/MultiCheckboxPopover.jsx
import React, { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

export default function MultiCheckboxPopover({
  options = [],
  value = [],
  onChange,
  label = "Select...",
  missing = false,
  visible = true,     // <-- NUEVO: visibilidad controlada desde el padre
  clearOnHide = true, // <-- NUEVO: limpiar cuando se oculte
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const maxSelect = 3;

  /* ==== Limpiar al ocultar el campo ==== */
  useEffect(() => {
    if (!visible) {
      // cerrar el popover si estaba abierto
      if (open) setOpen(false);
      // limpiar selección si corresponde
      if (clearOnHide && value.length > 0) {
        onChange([]);
      }
    }
    // cuando vuelva a ser visible, aparece vacío porque ya limpiamos arriba
    // no seleccionamos nada automáticamente
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  /* ==== Cerrar cuando el usuario hace click/touch fuera ==== */
  useEffect(() => {
    if (!open) return;
    const handleOutside = (ev) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(ev.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleOutside, true);
    document.addEventListener("touchstart", handleOutside, true);
    return () => {
      document.removeEventListener("mousedown", handleOutside, true);
      document.removeEventListener("touchstart", handleOutside, true);
    };
  }, [open]);

  /* ==== Cerrar con tecla Escape ==== */
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  /* ==== Selección con tope de 3 y cierre automático al alcanzar 3 ==== */
  const limitReached = value.length >= maxSelect;

  const toggleOption = (opt) => {
    const has = value.includes(opt);
    if (!has && limitReached) {
      // ya hay 3 seleccionadas: no permitir la cuarta
      return;
    }
    const next = has ? value.filter((v) => v !== opt) : [...value, opt];
    onChange(next);
    // cerrar cuando acabamos de llegar a 3
    if (!has && next.length >= maxSelect) setOpen(false);
  };

  /* ==== Texto mostrado (1 línea, truncado) ==== */
  const displayText = value.length ? value.join(", ") : label;
  const titleText = value.length ? `${value.length} selected: ${value.join(", ")}` : label;

  // si no es visible, no renderizamos nada (opcional). Si preferís mantener el placeholder en DOM, podés devolver null aquí.
  if (!visible) {
    return null;
  }

  return (
    <div ref={rootRef} className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex h-7 w-full items-center justify-between rounded border px-2 text-xs leading-none dark:bg-gray-800 ${
          missing ? "border-red-500 dark:border-red-500" : "border-gray-300"
        }`}
        aria-expanded={open ? "true" : "false"}
        aria-haspopup="listbox"
        title={titleText}
      >
        <span className="min-w-0 flex-1 truncate text-left">{displayText}</span>
        <ChevronDown size={12} className="ml-1 shrink-0" />
      </button>

      {open && (
        <div
          role="listbox"
          className={`absolute mt-1 min-w-full w-auto max-w-[28rem] rounded border border-gray-300 bg-white p-1 shadow-lg dark:border-gray-700 dark:bg-gray-800 ${
            open ? "z-[42]" : "z-40"
          }`}
        >
          {options.map((opt) => {
            const checked = value.includes(opt);
            const disableThis = !checked && limitReached; // sólo deshabilita los que NO están marcados si ya hay 3
            return (
              <label
                key={opt}
                className={`flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-xs hover:bg-gray-50 dark:hover:bg-gray-700 ${
                  disableThis ? "opacity-60 cursor-not-allowed" : ""
                }`}
                title={opt}
              >
                <input
                  type="checkbox"
                  className="h-3 w-3"
                  checked={checked}
                  disabled={disableThis}
                  onChange={() => toggleOption(opt)}
                  aria-checked={checked}
                />
                <span className="whitespace-nowrap">{opt}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
