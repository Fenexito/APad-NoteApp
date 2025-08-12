import React from "react";
import { ClipboardCopy } from "lucide-react";
import NoteCharCounter from "./NoteCharCounter";

export default function NoteInfoBar({ ban, cid, name, cbr, noteText = "", toast }) {
  const handleCopy = (label, value) => {
    if (!value) return;
    navigator.clipboard.writeText(value);
    if (toast) toast(`${label} copiado`, "success");
  };

  return (
    <div
      className="
        fixed left-0 bottom-[71px] z-50 w-full
        flex justify-center pointer-events-none
      "
    >
      <div
        className="
          max-w-[580px] w-full mx-auto
          bg-white/60 backdrop-blur-md border border-blue-100/70 shadow-lg
          dark:bg-gray-900/60 dark:border-gray-700/70 dark:shadow-black/30
          rounded-xl px-3 py-1
          pointer-events-auto
          overflow-x-auto
        "
        style={{ scrollbarWidth: "thin" }}
      >
        <div className="flex w-full items-center gap-3">
          {/* Bloque izquierdo: BAN / CID / NAME / CBR */}
          <div className="flex flex-row flex-wrap justify-center items-center gap-x-3 gap-y-0">
            {/* BAN */}
            <span className="flex flex-col items-center min-w-[80px]">
              <span className="text-[12px] text-blue-800/70 dark:text-blue-200/70 font-semibold uppercase leading-tight mb-[1px]">
                BAN
              </span>
              <span className="flex items-center justify-center min-h-[24px]">
                <span className="font-mono text-[14px] font-bold text-blue-900 dark:text-blue-100 px-1">
                  {ban || "--"}
                </span>
                <button
                  onClick={() => handleCopy("BAN", ban)}
                  className="p-1 rounded hover:bg-emerald-100/60 dark:hover:bg-emerald-900/40 transition"
                  aria-label="Copiar BAN"
                  title="Copiar BAN"
                  tabIndex={0}
                  type="button"
                >
                  <ClipboardCopy size={15} className="text-emerald-500 dark:text-emerald-300" />
                </button>
              </span>
            </span>

            {/* CID */}
            <span className="flex flex-col items-center min-w-[80px]">
              <span className="text-[12px] text-blue-800/70 dark:text-blue-200/70 font-semibold uppercase leading-tight mb-[1px]">
                CID
              </span>
              <span className="flex items-center justify-center min-h-[24px]">
                <span className="font-mono text-[14px] font-bold text-blue-900 dark:text-blue-100 px-1">
                  {cid || "--"}
                </span>
                <button
                  onClick={() => handleCopy("CID", cid)}
                  className="p-1 rounded hover:bg-emerald-100/60 dark:hover:bg-emerald-900/40 transition"
                  aria-label="Copiar CID"
                  title="Copiar CID"
                  tabIndex={0}
                  type="button"
                >
                  <ClipboardCopy size={15} className="text-emerald-500 dark:text-emerald-300" />
                </button>
              </span>
            </span>

            {/* NAME (no copiable) */}
            <span className="flex flex-col items-center min-w-[80px]">
              <span className="text-[12px] text-blue-800/70 dark:text-blue-200/70 font-semibold uppercase leading-tight mb-[1px]">
                NAME
              </span>
              <span className="flex items-center justify-center min-h-[24px]">
                <span className="font-mono text-[14px] font-bold text-blue-900 dark:text-blue-100 px-1">
                  {name || "--"}
                </span>
              </span>
            </span>

            {/* CBR */}
            <span className="flex flex-col items-center min-w-[80px]">
              <span className="text-[12px] text-blue-800/70 dark:text-blue-200/70 font-semibold uppercase leading-tight mb-[1px]">
                CBR
              </span>
              <span className="flex items-center justify-center min-h-[24px]">
                <span className="font-mono text-[14px] font-bold text-blue-900 dark:text-blue-100 px-1">
                  {cbr || "--"}
                </span>
                <button
                  onClick={() => handleCopy("CBR", cbr)}
                  className="p-1 rounded hover:bg-emerald-100/60 dark:hover:bg-emerald-900/40 transition"
                  aria-label="Copiar CBR"
                  title="Copiar CBR"
                  tabIndex={0}
                  type="button"
                >
                  <ClipboardCopy size={15} className="text-emerald-500 dark:text-emerald-300" />
                </button>
              </span>
            </span>
          </div>

          {/* Contador a la derecha */}
          <div className="ml-auto">
            <NoteCharCounter noteText={noteText} />
          </div>
        </div>
      </div>
    </div>
  );
}
