// src/components/ImproveFieldButton.jsx
import React, { useState } from "react";
import { Loader2, Check, Wand2 } from "lucide-react";

/** Botón AI mini, como el chip STRICT (gris). Loading y OK en verde. */
export default function ImproveFieldButton({ onTrigger, title = "Mejorar con IA" }) {
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);

  async function handleClick(e) {
    // Solo click directo en el botón:
    e.preventDefault();
    e.stopPropagation();
    console.log("[AI] ImproveFieldButton clicked"); // ← confirmación en consola
    if (busy) return;
    setBusy(true);
    try {
      if (onTrigger) await onTrigger();
      else await new Promise(r => setTimeout(r, 600));
      setOk(true);
      setTimeout(() => setOk(false), 900);
    } finally {
      setBusy(false);
    }
  }

  const baseStrict =
    "shrink-0 rounded-full border px-1.5 py-[1px] text-[9px] font-semibold uppercase tracking-wide leading-none " +
    "border-gray-300 text-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700";
  const okGreen =
    "shrink-0 rounded-full border px-1.5 py-[1px] text-[9px] font-semibold uppercase tracking-wide leading-none " +
    "border-green-500 text-green-700 bg-green-50 dark:bg-green-900/20";

  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={handleClick}
      className={ok ? okGreen : baseStrict}
    >
      {busy ? (
        <span className="inline-flex items-center gap-1">
          <Loader2 size={11} className="animate-spin" />
          <span>AI</span>
        </span>
      ) : ok ? (
        <span className="inline-flex items-center gap-1">
          <Check size={11} />
          <span>OK</span>
        </span>
      ) : (
        <span className="inline-flex items-center gap-1">
          <Wand2 size={11} />
          <span>AI</span>
        </span>
      )}
    </button>
  );
}
