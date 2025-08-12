import React, { useEffect } from "react";
import { X } from "lucide-react";

/**
 * Modal de confirmación GENÉRICO (backwards-compatible)
 *
 * Props:
 * - open (bool)
 * - title (string)
 * - description (string)
 * - onConfirm () => void
 * - onCancel () => void
 * - confirmText = "Limpiar"
 * - cancelText = "Cancelar"
 * - confirmTone = "danger"  // "danger" | "primary" | "success" | "warning" | "neutral"
 *
 * Extras opcionales (NUEVOS):
 * - secondaryText (string)         // etiqueta del botón secundario (p.ej. "Guardar y salir")
 * - onSecondary () => void         // handler del botón secundario
 * - secondaryTone = "primary"
 * - secondaryDisabled = false
 * - confirmDisabled = false
 * - closeOnOverlay = true          // click en overlay dispara onCancel
 */
export default function ConfirmModal({
  open,
  title,
  description,
  onConfirm,
  onCancel,
  confirmText = "Limpiar",
  cancelText = "Cancelar",
  confirmTone = "danger",

  // nuevos
  secondaryText,
  onSecondary,
  secondaryTone = "primary",
  secondaryDisabled = false,
  confirmDisabled = false,
  closeOnOverlay = true,
}) {
  const toneClass = (tone) => {
    switch (tone) {
      case "primary": return "bg-blue-600 hover:bg-blue-700 text-white";
      case "success": return "bg-green-600 hover:bg-green-700 text-white";
      case "warning": return "bg-amber-500 hover:bg-amber-600 text-black";
      case "neutral": return "bg-gray-700 hover:bg-gray-800 text-white";
      default:        return "bg-red-600 hover:bg-red-700 text-white"; // danger
    }
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onCancel?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      role="dialog"
      aria-modal="true"
    >
      {/* overlay: bloquea interacción y desenfoca fondo */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={closeOnOverlay ? onCancel : undefined}
      />

      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 z-[10000]">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {title}
          </h2>
          <button onClick={onCancel} aria-label="Cerrar">
            <X size={18} className="text-gray-500 hover:text-gray-700" />
          </button>
        </div>

        {description && (
          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line mb-6">
            {description}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-800"
          >
            {cancelText}
          </button>

          {secondaryText && (
            <button
              onClick={onSecondary}
              disabled={secondaryDisabled}
              className={`px-4 py-2 rounded-lg font-semibold ${toneClass(secondaryTone)} disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {secondaryText}
            </button>
          )}

          <button
            onClick={onConfirm}
            disabled={confirmDisabled}
            className={`px-4 py-2 rounded-lg font-semibold ${toneClass(confirmTone)} disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
