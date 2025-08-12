import { ClipboardCopy, Pencil, Trash2, FileSearch, ScissorsSquare, UserCog, Save, RefreshCw } from "lucide-react";
import Button from "../ui/Button";

export default function HistoryBar({
  selectedNote, onCopy, onEdit, onDelete, onView,
  onSee, onSplit, onCopilot, onResolution, onSave, onCancel,
  isEditing, canSplit
}) {
  // Estilo reutilizable para disabled
  const grayDisabled =
    "text-gray-400 border-gray-200 bg-white/50 cursor-not-allowed dark:text-gray-500 dark:border-gray-700 dark:bg-gray-800/50";

  // Lógica SEE/SPLIT exclusiva basada en tamaño de la nota
  const longNote = (selectedNote?.text || "").length > 999;

  // Helpers para envolver clicks y evitar propagación accidental
  const wrap = (fn) => (e) => { e.stopPropagation(); fn && fn(); };

  return (
    <div
      data-history-bar
      className="fixed bottom-0 left-0 z-50 w-full
                 sticky-surface shadow-xl shadow-blue-100/40 dark:shadow-black/30
                 border-t border-base"
      style={{ minHeight: "50px" }}
    >
      <div className="mx-auto max-w-[500px] flex justify-between items-center gap-2 py-2">

        {isEditing ? (
          <>
            {/* COPY */}
            <Button
              onClick={wrap(onCopy)}
              disabled={!selectedNote}
              className={`!px-4 !py-2 text-xs flex flex-col items-center gap-0.5 font-semibold
                          w-[70px] border shadow-md transition
                          ${selectedNote
                            ? "text-emerald-700 border-emerald-200 bg-white/70 hover:bg-emerald-50 dark:text-emerald-300 dark:border-emerald-800/40 dark:bg-gray-800/70 dark:hover:bg-emerald-900/30"
                            : grayDisabled}`}
            >
              <ClipboardCopy size={18} />
              <span>COPY</span>
            </Button>

            {/* COPILOT */}
            <Button
              onClick={wrap(onCopilot)}
              disabled={!selectedNote}
              className={`!px-4 !py-2 text-xs flex flex-col items-center gap-0.5 font-semibold
                          w-[70px] border shadow-md transition
                          ${selectedNote
                            ? "text-fuchsia-700 border-fuchsia-200 bg-white/70 hover:bg-fuchsia-50 dark:text-fuchsia-300 dark:border-fuchsia-800/40 dark:bg-gray-800/70 dark:hover:bg-fuchsia-900/30"
                            : grayDisabled}`}
            >
              <UserCog size={18} />
              <span>COPILOT</span>
            </Button>

            {/* RESOLUTION */}
            <Button
              onClick={wrap(onResolution)}
              disabled={!selectedNote}
              className={`!px-4 !py-2 text-xs flex flex-col items-center gap-0.5 font-semibold
                          w-[80px] border shadow-md transition
                          ${selectedNote
                            ? "text-cyan-700 border-cyan-200 bg-white/70 hover:bg-cyan-50 dark:text-cyan-300 dark:border-cyan-800/40 dark:bg-gray-800/70 dark:hover:bg-cyan-900/30"
                            : grayDisabled}`}
            >
              <ClipboardCopy size={18} />
              <span>RESOLUTION</span>
            </Button>

            {/* SPLIT (solo si aplica en modo edición) */}
            {canSplit && (
              <Button
                onClick={wrap(onSplit)}
                disabled={!selectedNote}
                className={`!px-4 !py-2 text-xs flex flex-col items-center gap-0.5 font-semibold
                            w-[70px] border shadow-md transition
                            ${selectedNote
                              ? "text-amber-700 border-amber-200 bg-white/70 hover:bg-amber-50 dark:text-amber-300 dark:border-amber-800/40 dark:bg-gray-800/70 dark:hover:bg-amber-900/30"
                              : grayDisabled}`}
              >
                <ScissorsSquare size={18} />
                <span>SPLIT</span>
              </Button>
            )}

            {/* SAVE */}
            <Button
              onClick={wrap(onSave)}
              disabled={!selectedNote}
              className={`!px-4 !py-2 text-xs flex flex-col items-center gap-0.5 font-semibold
                          w-[70px] border shadow-md transition
                          ${selectedNote
                            ? "text-green-700 border-green-200 bg-white/70 hover:bg-green-50 dark:text-green-300 dark:border-green-800/40 dark:bg-gray-800/70 dark:hover:bg-green-900/30"
                            : grayDisabled}`}
            >
              <Save size={18} />
              <span>SAVE</span>
            </Button>

            {/* CANCEL */}
            <Button
              onClick={wrap(onCancel)}
              disabled={!selectedNote}
              className={`!px-4 !py-2 text-xs flex flex-col items-center gap-0.5 font-semibold
                          w-[70px] border shadow-md transition
                          ${selectedNote
                            ? "text-red-700 border-red-200 bg-white/70 hover:bg-red-50 dark:text-red-300 dark:border-red-800/40 dark:bg-gray-800/70 dark:hover:bg-red-900/30"
                            : grayDisabled}`}
            >
              <RefreshCw size={18} />
              <span>CANCEL</span>
            </Button>
          </>
        ) : (
          <>
            {/* SEE / SPLIT (exclusivo por tamaño de nota > 999) */}
            {!longNote ? (
              <Button
                onClick={wrap(onSee)}
                disabled={!selectedNote}
                className={`!px-4 !py-2 text-xs flex flex-col items-center gap-0.5 font-semibold
                            w-[70px] border shadow-md transition
                            ${selectedNote
                              ? "text-blue-700 border-blue-200 bg-white/70 hover:bg-blue-50 dark:text-blue-300 dark:border-blue-800/40 dark:bg-gray-800/70 dark:hover:bg-blue-900/40"
                              : grayDisabled}`}
              >
                <FileSearch size={18} />
                <span>SEE</span>
              </Button>
            ) : (
              <Button
                onClick={wrap(onSplit)}
                disabled={!selectedNote}
                className={`!px-4 !py-2 text-xs flex flex-col items-center gap-0.5 font-semibold
                            w-[70px] border shadow-md transition
                            ${selectedNote
                              ? "text-amber-700 border-amber-200 bg-white/70 hover:bg-amber-50 dark:text-amber-300 dark:border-amber-800/40 dark:bg-gray-800/70 dark:hover:bg-amber-900/30"
                              : grayDisabled}`}
              >
                <ScissorsSquare size={18} />
                <span>SPLIT</span>
              </Button>
            )}

            {/* COPY */}
            <Button
              onClick={wrap(onCopy)}
              disabled={!selectedNote}
              className={`!px-4 !py-2 text-xs flex flex-col items-center gap-0.5 font-semibold
                          w-[70px] border shadow-md transition
                          ${selectedNote
                            ? "text-emerald-700 border-emerald-200 bg-white/70 hover:bg-emerald-50 dark:text-emerald-300 dark:border-emerald-800/40 dark:bg-gray-800/70 dark:hover:bg-emerald-900/30"
                            : grayDisabled}`}
            >
              <ClipboardCopy size={18} />
              <span>COPY</span>
            </Button>

            {/* COPILOT */}
            <Button
              onClick={wrap(onCopilot)}
              disabled={!selectedNote}
              className={`!px-4 !py-2 text-xs flex flex-col items-center gap-0.5 font-semibold
                          w-[70px] border shadow-md transition
                          ${selectedNote
                            ? "text-fuchsia-700 border-fuchsia-200 bg-white/70 hover:bg-fuchsia-50 dark:text-fuchsia-300 dark:border-fuchsia-800/40 dark:bg-gray-800/70 dark:hover:bg-fuchsia-900/30"
                            : grayDisabled}`}
            >
              <UserCog size={18} />
              <span>COPILOT</span>
            </Button>

            {/* RESOLUTION */}
            <Button
              onClick={wrap(onResolution)}
              disabled={!selectedNote}
              className={`!px-4 !py-2 text-xs flex flex-col items-center gap-0.5 font-semibold
                          w-[80px] border shadow-md transition
                          ${selectedNote
                            ? "text-cyan-700 border-cyan-200 bg-white/70 hover:bg-cyan-50 dark:text-cyan-300 dark:border-cyan-800/40 dark:bg-gray-800/70 dark:hover:bg-cyan-900/30"
                            : grayDisabled}`}
            >
              <ClipboardCopy size={18} />
              <span>RESOLUTION</span>
            </Button>

            {/* EDIT */}
            <Button
              onClick={wrap(onEdit)}
              disabled={!selectedNote}
              className={`!px-4 !py-2 text-xs flex flex-col items-center gap-0.5 font-semibold
                          w-[70px] border shadow-md transition
                          ${selectedNote
                            ? "text-green-700 border-green-200 bg-white/70 hover:bg-green-50 dark:text-green-300 dark:border-green-800/40 dark:bg-gray-800/70 dark:hover:bg-green-900/30"
                            : grayDisabled}`}
            >
              <Pencil size={18} />
              <span>EDIT</span>
            </Button>

            {/* DELETE */}
            <Button
              onClick={wrap(onDelete)}
              disabled={!selectedNote}
              className={`!px-4 !py-2 text-xs flex flex-col items-center gap-0.5 font-semibold
                          w-[70px] border shadow-md transition
                          ${selectedNote
                            ? "text-red-700 border-red-200 bg-white/70 hover:bg-red-50 dark:text-red-300 dark:border-red-800/40 dark:bg-gray-800/70 dark:hover:bg-red-900/30"
                            : grayDisabled}`}
            >
              <Trash2 size={18} />
              <span>DELETE</span>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
