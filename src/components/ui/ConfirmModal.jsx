// src/components/ui/ConfirmModal.jsx
import React from "react";
import { X } from "lucide-react";

export default function ConfirmModal({
  open,
  title,
  description,
  onConfirm,
  onCancel,
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {title}
          </h2>
          <button onClick={onCancel}>
            <X size={18} className="text-gray-500 hover:text-gray-700" />
          </button>
        </div>
        {description && (
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-6">
            {description}
          </p>
        )}
        <div className="flex justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-gray-800"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white"
          >
            Limpiar
          </button>
        </div>
      </div>
    </div>
  );
}
