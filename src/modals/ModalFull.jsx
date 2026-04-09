import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import NoteCharCounter from "../ui/NoteCharCounter";

export default function ModalFull({ open, onClose, note }) {
  const containerRef = useRef(null);

  // Snapshot del texto al abrir, para que no desaparezca si afuera cambian la nota seleccionada
  const [stableNote, setStableNote] = useState("");
  useEffect(() => {
    if (open) {
      setStableNote(String(note || ""));
    }
  }, [open, note]);

  // ESC para cerrar modal
  useEffect(() => {
    if (!open) return;
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [open, onClose]);

  if (!open) return null;

  const noteText = stableNote;

  return (
    <>
      {/* Fondo oscuro y borroso */}
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel centrado */}
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
        // Evita que el listener global del historial limpie selección al click interno
        onPointerDownCapture={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="flex items-center justify-between px-4 py-2 bg-gray-100 dark:bg-gray-900">
          <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">
            Nota completa
          </h3>

          <div className="flex items-center gap-2">
            {/* Contador de caracteres */}
            <NoteCharCounter noteText={noteText} />

            {/* Botón cerrar */}
            <button
              onClick={onClose}
              className="p-1 rounded text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-black/5 dark:hover:bg-white/10 transition"
              aria-label="Cerrar"
              title="Cerrar"
              type="button"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Cuerpo */}
        <div className="p-4">
          <div
            className="
              h-[54vh] overflow-y-auto
              bg-gray-50 dark:bg-gray-900
              rounded-md p-3
            "
          >
            <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-200">
              {noteText}
            </pre>
          </div>
        </div>
      </div>
    </>
  );
}
