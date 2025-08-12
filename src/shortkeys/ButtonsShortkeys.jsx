import React from "react";
import { Plus, Copy, Pencil, Trash2, Save, RefreshCw } from "lucide-react";
import Button from "../components/ui/Button";

/**
 * Props:
 * - onNew, onDuplicate, onEdit, onDelete
 * - canDuplicate=false, canEdit=false, canDelete=false
 * - inEditor=false            -> activa el modo Editor (NEW disabled, DUPLICATE->SAVE, EDIT->CANCEL)
 * - onSave, onCancel          -> handlers usados en modo Editor
 * - canSave=true              -> habilita/deshabilita SAVE en modo Editor
 */
export default function ButtonsShortkeys({
  onNew,
  onDuplicate,
  onEdit,
  onDelete,
  canDuplicate = false,
  canEdit = false,
  canDelete = false,
  inEditor = false,
  onSave,
  onCancel,
  canSave = true,
}) {
  const grayDisabled =
    "text-gray-400 border-gray-200 bg-white/50 cursor-not-allowed dark:text-gray-500 dark:border-gray-700 dark:bg-gray-800/50";

  return (
    <div
      className="fixed bottom-0 left-0 z-50 w-full
                 sticky-surface shadow-xl shadow-blue-100/40 dark:shadow-black/30
                 border-t border-base"
      style={{ minHeight: "50px" }}
    >
      <div className="mx-auto max-w-[500px] flex justify-between items-center gap-2 py-2">
        {/* NEW (en editor: deshabilitado) */}
        <Button
          onClick={onNew}
          disabled={inEditor}
          className={`!px-4 !py-2 text-xs flex flex-col items-center gap-0.5 font-semibold
                      w-[70px] border shadow-md transition
                      ${
                        inEditor
                          ? grayDisabled
                          : "text-blue-700 border-blue-200 bg-white/70 hover:bg-blue-50 dark:text-blue-300 dark:border-blue-800/40 dark:bg-gray-800/70 dark:hover:bg-blue-900/40"
                      }`}
        >
          <Plus size={18} />
          <span>NEW</span>
        </Button>

        {/* DUPLICATE -> SAVE en modo editor */}
        {!inEditor ? (
          <Button
            onClick={onDuplicate}
            disabled={!canDuplicate}
            className={`!px-4 !py-2 text-xs flex flex-col items-center gap-0.5 font-semibold
                        w-[70px] border shadow-md transition
                        ${
                          canDuplicate
                            ? "text-emerald-700 border-emerald-200 bg-white/70 hover:bg-emerald-50 dark:text-emerald-300 dark:border-emerald-800/40 dark:bg-gray-800/70 dark:hover:bg-emerald-900/30"
                            : grayDisabled
                        }`}
          >
            <Copy size={18} />
            <span>DUPLICATE</span>
          </Button>
        ) : (
          <Button
            onClick={onSave}
            disabled={!canSave}
            className={`!px-4 !py-2 text-xs flex flex-col items-center gap-0.5 font-semibold
                        w-[70px] border shadow-md transition
                        ${
                          canSave
                            ? "text-green-700 border-green-200 bg-white/70 hover:bg-green-50 dark:text-green-300 dark:border-green-800/40 dark:bg-gray-800/70 dark:hover:bg-green-900/30"
                            : grayDisabled
                        }`}
          >
            <Save size={18} />
            <span>SAVE</span>
          </Button>
        )}

        {/* EDIT -> CANCEL en modo editor */}
        {!inEditor ? (
          <Button
            onClick={onEdit}
            disabled={!canEdit}
            className={`!px-4 !py-2 text-xs flex flex-col items-center gap-0.5 font-semibold
                        w-[70px] border shadow-md transition
                        ${
                          canEdit
                            ? "text-cyan-700 border-cyan-200 bg-white/70 hover:bg-cyan-50 dark:text-cyan-300 dark:border-cyan-800/40 dark:bg-gray-800/70 dark:hover:bg-cyan-900/30"
                            : grayDisabled
                        }`}
          >
            <Pencil size={18} />
            <span>EDIT</span>
          </Button>
        ) : (
          <Button
            onClick={onCancel}
            className={`!px-4 !py-2 text-xs flex flex-col items-center gap-0.5 font-semibold
                        w-[70px] border shadow-md transition
                        text-red-700 border-red-200 bg-white/70 hover:bg-red-50
                        dark:text-red-300 dark:border-red-800/40 dark:bg-gray-800/70 dark:hover:bg-red-900/30`}
          >
            <RefreshCw size={18} />
            <span>CANCEL</span>
          </Button>
        )}

        {/* DELETE (igual que antes) */}
        <Button
          onClick={onDelete}
          disabled={!canDelete}
          className={`!px-4 !py-2 text-xs flex flex-col items-center gap-0.5 font-semibold
                      w-[70px] border shadow-md transition
                      ${
                        canDelete
                          ? "text-red-700 border-red-200 bg-white/70 hover:bg-red-50 dark:text-red-300 dark:border-red-800/40 dark:bg-gray-800/70 dark:hover:bg-red-900/30"
                          : grayDisabled
                      }`}
        >
          <Trash2 size={18} />
          <span>DELETE</span>
        </Button>
      </div>
    </div>
  );
}
