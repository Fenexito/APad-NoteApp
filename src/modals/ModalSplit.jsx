import { useEffect, useMemo, useRef } from "react";
import { X, ClipboardCopy } from "lucide-react";
import { useToast } from "../ui/ToastContext";
import NoteCharCounter from "../ui/NoteCharCounter";
import { splitNoteFinal } from "../ui/utils/splitnote";

/* ============================ MODAL SPLIT ============================ */

export default function ModalSplit({
  open,
  onClose,
  text = "",
  parts = [], // compat: si en el Form ya me mandan las partes, las puedo mostrar tal cual
}) {
  const toast = useToast();
  const containerRef = useRef(null);

  // Cerrar con ESC (hook siempre registrado; el handler respeta `open`)
  useEffect(() => {
    if (!open) return;
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [open, onClose]);

  // ⚠️ No hagas early-return aquí; primero define todos los hooks para no romper el orden.

  // Prioridad:
  // 1) Si viene `text`, SIEMPRE calculo con el mismo algoritmo del Form (splitNoteFinal).
  // 2) Si no hay `text`, pero recibí `parts` no vacío, muestro esas partes (modo compat con el Form actual).
  const computedParts = useMemo(() => {
    const src = (text ?? "").trim();
    if (src) return splitNoteFinal(src);
    if (Array.isArray(parts) && parts.length > 0) return parts.filter(Boolean);
    return [];
  }, [text, parts]);

  // Ahora sí: si está cerrado, no renderizo
  if (!open) return null;

  // Altura por cantidad de partes
  const h = computedParts.length <= 2 ? "h-[28vh]" : "h-[18vh]";

  return (
    <>
      {/* Fondo */}
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        ref={containerRef}
        className="
          fixed top-1/2 left-1/2 z-50
          w-full max-w-lg
          -translate-x-1/2 -translate-y-[55%]
          bg-white dark:bg-gray-800
          rounded-2xl shadow-2xl
          overflow-hidden
        "
        data-history-modal
        role="dialog"
        aria-modal="true"
        // Evita que el listener global del historial cierre al hacer click adentro
        onPointerDownCapture={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-gray-100 dark:bg-gray-900">
          <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">
            Nota dividida
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-black/5 dark:hover:bg-white/10 transition"
            aria-label="Cerrar"
            title="Cerrar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-4 flex flex-col gap-5">
          {!computedParts.length && (
            <div className="text-sm text-slate-600 dark:text-slate-300">
              No hay contenido para dividir. Asegúrate de pasar <code>text</code> o <code>parts</code>.
            </div>
          )}

          {computedParts.map((p, i) => (
            <div
              key={i}
              className={`
                relative flex flex-col rounded-lg bg-gray-100 dark:bg-gray-900
                p-3 ${h} min-h-[80px] overflow-hidden
                border border-gray-200 dark:border-gray-700
              `}
            >
              {/* Título + contador */}
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-bold text-blue-700 dark:text-blue-300">
                  {`PARTE ${i + 1}`}
                </span>
                <NoteCharCounter noteText={String(p || "")} />
              </div>

              {/* Texto */}
              <pre className="whitespace-pre-wrap text-sm flex-1 overflow-y-auto text-gray-700 dark:text-gray-200 pr-2">
                {p}
              </pre>

              {/* Copiar */}
              <div className="mt-2 flex justify-end">
                <button
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(p || "");
                      if (toast?.success) toast.success(`Part ${i + 1} copied`);
                      else if (typeof toast === "function") toast(`Part ${i + 1} copied`, "success");
                    } catch (err) {
                      console.error(err);
                      if (toast?.error) toast.error("Copy failed");
                      else if (typeof toast === "function") toast("Copy failed", "error");
                    }
                  }}
                  className="inline-flex items-center gap-1.5 rounded-2xl border px-3 py-1.5 text-xs font-semibold shadow-md transition
                             text-blue-700 border-blue-200 bg-white/70 hover:bg-blue-50
                             dark:text-blue-300 dark:border-blue-800/40 dark:bg-gray-800/70 dark:hover:bg-blue-900/30
                             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-gray-900"
                  title={`Copy Part ${i + 1}`}
                  aria-label={`Copy Part ${i + 1}`}
                  type="button"
                >
                  <ClipboardCopy size={16} />
                  Copy Part {i + 1}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
