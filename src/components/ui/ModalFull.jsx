// src/components/ui/ModalFull.jsx
import { X } from "lucide-react";

export default function ModalFull({ open, onClose, text }) {
  if (!open) return null;

  return (
    <>
      {/* Fondo oscuro y borroso */}
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel centrado */}
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
        {/* Cabecera */}
        <div className="flex items-center justify-between px-4 py-2 bg-gray-100 dark:bg-gray-900">
          <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">
            Nota completa
          </h3>
          <button
            onClick={onClose}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
          >
            <X size={20} />
          </button>
        </div>

        {/* Cuerpo */}
        <div className="p-4">
          <div
            className="
              h-[60vh] overflow-y-auto 
              bg-gray-50 dark:bg-gray-900 
              rounded-md p-3
            "
          >
            <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-200">
              {text}
            </pre>
          </div>

          {/* Botones */}
          <div className="mt-4 flex justify-end space-x-2">
            <button
              onClick={() => navigator.clipboard.writeText(text)}
              className="
                px-3 py-1 text-sm font-medium 
                bg-blue-600 text-white rounded-md 
                hover:bg-blue-700
              "
            >
              Copiar todo
            </button>
            <button
              onClick={onClose}
              className="
                px-3 py-1 text-sm font-medium 
                bg-gray-200 dark:bg-gray-700 
                text-gray-800 dark:text-gray-200 
                rounded-md hover:bg-gray-300 dark:hover:bg-gray-600
              "
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
