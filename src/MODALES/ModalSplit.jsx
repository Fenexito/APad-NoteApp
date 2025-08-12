import { useEffect } from "react";
import { X, ClipboardCopy } from "lucide-react";
import { useToast } from "../ui/ToastContext"; // Ajusta ruta si es necesario
import NoteCharCounter from "./NoteCharCounter";

export default function ModalSplit({ open, onClose, parts = [] }) {
  const toast = useToast();

  useEffect(() => {
    if (!open) return;
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [open, onClose]);

  if (!open) return null;

  // Tamaño compacto para mostrar hasta 3 partes
  const maxParts = Math.max(2, parts.length);
  const height = maxParts === 2 ? "h-[28vh]" : "h-[18vh]";

  return (
    <>
      {/* Fondo oscuro */}
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="
          fixed top-1/2 left-1/2 z-50
          w-full max-w-lg
          -translate-x-1/2 -translate-y-1/2
          bg-white dark:bg-gray-800
          rounded-2xl shadow-2xl
          overflow-hidden
        "
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

        {/* Parts */}
        <div className="p-4 flex flex-col gap-5">
          {parts.map((p, i) => (
            <div
              key={i}
              className={`
                relative flex flex-col rounded-lg bg-gray-100 dark:bg-gray-900
                p-3 ${height} min-h-[80px] overflow-hidden
                border border-gray-200 dark:border-gray-700
              `}
            >
              {/* Título + contador por parte */}
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-bold text-blue-700 dark:text-blue-300">
                  {`PARTE ${i + 1}`}
                </span>
                <NoteCharCounter noteText={String(p || "")} />
              </div>

              {/* Contenido */}
              <pre className="whitespace-pre-wrap text-sm flex-1 overflow-y-auto text-gray-700 dark:text-gray-200 pr-2">
                {p}
              </pre>

              {/* Acciones (copiar) */}
              <div className="mt-2 flex justify-end">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(p || "");
                    toast && toast(`Part ${i + 1} COPIED`, "success");
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
