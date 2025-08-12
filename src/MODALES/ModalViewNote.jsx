import { useEffect } from "react";
import { X } from "lucide-react";
import LockedNoteEditor from "./LockedNoteEditor";

export default function ModalViewNote({ open, onClose, note, isEditing, onChangeText }) {
  // ESC para cerrar modal
  useEffect(() => {
    if (!open) return;
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [open, onClose]);

  if (!open || !note) return null;

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
          bg-white/40 backdrop-blur-md
          rounded-2xl shadow-2xl border border-blue-100/60
          overflow-hidden
        "
      >
        {/* Cabecera */}
        <div className="flex items-center justify-between px-4 py-2 bg-white/60 border-b border-blue-100/40">
          <h3 className="text-base font-semibold text-gray-900">
            Full Note
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Cuerpo */}
        <div className="p-4">
          {isEditing ? (
            <LockedNoteEditor
              value={note.text || ""}
              onChange={onChangeText}
              editing={true}
              hardLockedLineRegexes={[
                /^\s*PFTS\s*\|/i, // bloquea completamente líneas tipo "PFTS | agente"
              ]}
            />
          ) : (
            <div className="h-[54vh] overflow-y-auto bg-white rounded-md border border-gray-200 p-3">
              <pre className="whitespace-pre-wrap text-[14px] leading-6 text-gray-900 font-sans">
                {note.text || note}
              </pre>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
