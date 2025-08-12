import React, { useEffect, useMemo, useRef, useState } from "react";
import { ClipboardCopy, ScissorsSquare, FileSearch, UserCog, Save, RefreshCw } from "lucide-react";
import Button from "../ui/Button";
import { addNote } from "../../db/notes";

// --- COPILOT NOTE UTILITY ---
function buildCopilotNote(text) {
  const lines = text.split("\n");
  const idx = lines.findIndex(line =>
    line.trim().toUpperCase().startsWith("CX ISSUE:")
  );
  if (idx !== -1) {
    return lines.slice(idx).join("\n");
  }
  return text;
}

// --- Mandate Validation Helper ---
function allMandatesCompleted(checklist) {
  const ids = Object.keys(checklist || {}).length
    ? Object.keys(checklist)
    : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  return ids.every(
    id =>
      checklist?.[id] === "YES" ||
      checklist?.[id] === "NO" ||
      checklist?.[id] === "NA"
  );
}

// --- Utils de igualdad/clonado seguros ---
function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;

  if (a && b && typeof a === "object") {
    // Arrays
    if (Array.isArray(a) || Array.isArray(b)) {
      if (!Array.isArray(a) || !Array.isArray(b)) return false;
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
        if (!deepEqual(a[i], b[i])) return false;
      }
      return true;
    }
    // Objetos
    const ak = Object.keys(a);
    const bk = Object.keys(b);
    if (ak.length !== bk.length) return false;
    for (const k of ak) {
      if (!Object.prototype.hasOwnProperty.call(b, k)) return false;
      if (!deepEqual(a[k], b[k])) return false;
    }
    return true;
  }

  // strings, numbers, booleans, null/undefined ya cubiertos por === arriba
  return false;
}

function safeClone(obj) {
  try {
    return obj == null ? obj : JSON.parse(JSON.stringify(obj));
  } catch {
    return obj;
  }
}

export default function Buttons({
  noteText, parts, data,
  copilotUsed, setCopilotUsed,
  checklist,
  setShowFull,
  setShowSplit,
  setShowReset,
  isFormComplete, toast,
  handleReset,
  baselineKey,       // <- clave que cambia cuando el padre re-baselinea
  pristineVersion,   // <- contador para re-baseline explícito (montaje / reset)
  // ⬇️ agregado para reset silencioso (sin toast de "FORM RESETED")
  reset,
}) {
  // ---------- SNAPSHOT CONTROLADO POR baselineKey ----------
  const initialRef = useRef(null);

  // Estabiliza el snapshot: espera un tick para que el store asiente defaults
  const [baselineReady, setBaselineReady] = useState(baselineKey != null);
  const snapshotTimerRef = useRef(null);
  useEffect(() => {
    // En el enfoque nuevo, RESET no desaparece: quedará deshabilitado mientras baseline no esté listo
    setBaselineReady(false);
    if (snapshotTimerRef.current) clearTimeout(snapshotTimerRef.current);
    snapshotTimerRef.current = setTimeout(() => {
      initialRef.current = {
        noteText: (noteText || ""),
        data: safeClone(data),
        parts: safeClone(parts),
        checklist: safeClone(checklist),
        copilotUsed: !!copilotUsed,
      };
      setBaselineReady(true);
    }, 0);
    return () => {
      if (snapshotTimerRef.current) clearTimeout(snapshotTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baselineKey, pristineVersion]);

  // ¿Está sucio vs snapshot actual?
  const isDirtyAgainstSnapshot = useMemo(() => {
    const init = initialRef.current;
    if (!init) return false;
    if (!deepEqual((noteText || ""), init.noteText)) return true;
    if (!deepEqual(parts, init.parts)) return true;
    if (!deepEqual(data, init.data)) return true;
    if (!deepEqual(checklist, init.checklist)) return true;
    if (!!copilotUsed !== init.copilotUsed) return true;
    return false;
  }, [noteText, parts, data, checklist, copilotUsed]);

  // ---------- HABILITACIÓN (ya no visibilidad) ----------
  const canSave = isFormComplete && allMandatesCompleted(checklist);
  const canCopilot = canSave;
  const hasCxIssue = /^CX ISSUE:.*(?:\n(?![A-Z ]+:).*)*/m.test(noteText || "");
  const hasTsSteps = /^TS STEPS:.*(?:\n(?![A-Z ]+:).*)*/m.test(noteText || "");
  const canResolution = hasCxIssue && hasTsSteps;
  const canReset = (baselineKey != null) && baselineReady && isDirtyAgainstSnapshot;

  // ---------- HANDLERS ----------
  const handleSplitCopy = (txt, idx, total) => {
    navigator.clipboard.writeText(txt);
    toast(`PART ${idx + 1} copied to clipboard`, "success");
  };

  const handleCopy = async (txt) => {
    await navigator.clipboard.writeText(txt);
    toast("FULL NOTE copied to clipboard", "success");
  };

  const handleCopilotClick = async () => {
    if (!canCopilot) return;
    await navigator.clipboard.writeText(buildCopilotNote(noteText));
    toast("COPILOT copied to clipboard", "success");
    setCopilotUsed(true);
    setTimeout(() => {
      toast("Opening FUELIX in a new tab", "error");
      setTimeout(() => {
        window.open("https://app.fuelix.ai/en/copilots/copilot-490597fe4c554160b59b/chats/new", "_blank");
      }, 900);
    }, 1000);
  };

  const handleResolutionClick = () => {
    if (!canResolution) return;
    const cxIssueMatch = noteText.match(/^CX ISSUE:.*(?:\n(?![A-Z ]+:).*)*/m);
    const tsStepsMatch = noteText.match(/^TS STEPS:.*(?:\n(?![A-Z ]+:).*)*/m);

    let toCopy = "";
    if (!cxIssueMatch && !tsStepsMatch) {
      toast("CX ISSUE & TS STEPS are empty", "warning");
      return;
    }
    if (cxIssueMatch && !tsStepsMatch) {
      toast("TS STEPS is empty", "warning");
      toCopy = cxIssueMatch[0];
    } else if (!cxIssueMatch && tsStepsMatch) {
      toast("CX ISSUE is empty", "warning");
      toCopy = tsStepsMatch[0];
    } else {
      toCopy = `${cxIssueMatch[0]}\n${tsStepsMatch[0]}`;
      if (toCopy.length > 999) {
        toCopy = tsStepsMatch[0];
        toast("CX ISSUE + TS STEPS exceed 999, only TS STEPS copied.", "warning");
      } else {
        toast("RESOLUTION copied to clipboard", "success");
      }
    }
    navigator.clipboard.writeText(toCopy);
  };

  // ⬇️ SAVE: exige COPILOT usado; guarda; toast de éxito; reset silencioso
  const handleSaveClick = async () => {
    if (!canSave) return;

    // 1) Confirmar que ya se usó COPILOT
    if (!copilotUsed) {
      toast?.("Primero usa COPILOT para generar la nota.", "warning");
      return;
    }

    // 2) Guardar
    try {
      await addNote({
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        text: noteText,
        data,
        ban: data?.customer?.ban,
        cid: data?.customer?.cid,
        name: data?.customer?.name,
        cbr: data?.customer?.cbr,
        ticket: data?.resolution?.ticketFinal,
        bosrTicket: data?.resolution?.bosrTicket,
        ncTicket: data?.resolution?.ncTicket,
        emtTicket: data?.resolution?.emtTicket,
        resolution: data?.resolution,
      });

      // 3) Mostrar SOLO el toast de guardado OK
      toast?.("Note SAVED successfully", "success");

      // 4) Reset silencioso para evitar el toast de "FORM RESETED"
      if (typeof reset === "function") {
        reset();
      } else {
        // Fallback (si el padre no provee reset()): hará reset con su propio toast
        console.warn("[Buttons] reset() no provisto, usando handleReset() (generará toast).");
        handleReset?.();
      }
    } catch (e) {
      console.error(e);
      toast?.("Error saving note", "error");
    }
  };

  // ---------- RENDER ----------
  return (
    <div
      className="fixed bottom-0 left-0 z-50 w-full
                 sticky-surface shadow-xl shadow-blue-100/40 dark:shadow-black/30
                 border-t border-base"
      style={{ minHeight: "50px" }}
    >
      <div className="mx-auto max-w-[500px] flex justify-between items-center gap-2 py-2">
        {/* SEE / SPLIT (se mantiene exclusivo por longitud de la nota) */}
        {noteText.length <= 999 ? (
          <Button
            onClick={() => setShowFull(true)}
            className="!px-4 !py-2 text-xs flex flex-col items-center gap-0.5 font-semibold
                       w-[70px] border shadow-md transition
                       text-blue-700 border-blue-200 bg-white/70 hover:bg-blue-50
                       dark:text-blue-300 dark:border-blue-800/40 dark:bg-gray-800/70 dark:hover:bg-blue-900/40"
          >
            <FileSearch size={18} />
            <span>SEE</span>
          </Button>
        ) : (
          <Button
            onClick={() => setShowSplit(true)}
            className="!px-4 !py-2 text-xs flex flex-col items-center gap-0.5 font-semibold
                       w-[70px] border shadow-md transition
                       text-amber-700 border-amber-200 bg-white/70 hover:bg-amber-50
                       dark:text-amber-300 dark:border-amber-800/40 dark:bg-gray-800/70 dark:hover:bg-amber-900/30"
          >
            <ScissorsSquare size={18} />
            <span>SPLIT</span>
          </Button>
        )}

        {/* COPY */}
        <Button
          onClick={() => handleCopy(noteText)}
          className="!px-4 !py-2 text-xs flex flex-col items-center gap-0.5 font-semibold
                     w-[70px] border shadow-md transition
                     text-emerald-700 border-emerald-200 bg-white/70 hover:bg-emerald-50
                     dark:text-emerald-300 dark:border-emerald-800/40 dark:bg-gray-800/70 dark:hover:bg-emerald-900/30"
        >
          <ClipboardCopy size={18} />
          <span>COPY</span>
        </Button>

        {/* COPILOT (si no aplica, queda deshabilitado) */}
        <Button
          onClick={handleCopilotClick}
          disabled={!canCopilot}
          className={`!px-4 !py-2 text-xs flex flex-col items-center gap-0.5 font-semibold
                      w-[70px] border shadow-md transition
                      ${canCopilot
                        ? "text-fuchsia-700 border-fuchsia-200 bg-white/70 hover:bg-fuchsia-50 dark:text-fuchsia-300 dark:border-fuchsia-800/40 dark:bg-gray-800/70 dark:hover:bg-fuchsia-900/30"
                        : "text-gray-400 border-gray-200 bg-white/50 cursor-not-allowed dark:text-gray-500 dark:border-gray-700 dark:bg-gray-800/50"}`}
        >
          <UserCog size={18} />
          <span>COPILOT</span>
        </Button>

        {/* RESOLUTION (si no hay CX ISSUE + TS STEPS, queda deshabilitado) */}
        <Button
          onClick={handleResolutionClick}
          disabled={!canResolution}
          className={`!px-4 !py-2 text-xs flex flex-col items-center gap-0.5 font-semibold
                      w-[80px] border shadow-md transition
                      ${canResolution
                        ? "text-cyan-700 border-cyan-200 bg-white/70 hover:bg-cyan-50 dark:text-cyan-300 dark:border-cyan-800/40 dark:bg-gray-800/70 dark:hover:bg-cyan-900/30"
                        : "text-gray-400 border-gray-200 bg-white/50 cursor-not-allowed dark:text-gray-500 dark:border-gray-700 dark:bg-gray-800/50"}`}
        >
          <ClipboardCopy size={18} />
          <span>RESOLUTION</span>
        </Button>

        {/* SAVE (si no aplica, queda deshabilitado) */}
        <Button
          onClick={handleSaveClick}
          disabled={!canSave}
          className={`!px-4 !py-2 text-xs flex flex-col items-center gap-0.5 font-semibold
                      w-[70px] border shadow-md transition
                      ${canSave
                        ? "text-green-700 border-green-200 bg-white/70 hover:bg-green-50 dark:text-green-300 dark:border-green-800/40 dark:bg-gray-800/70 dark:hover:bg-green-900/30"
                        : "text-gray-400 border-gray-200 bg-white/50 cursor-not-allowed dark:text-gray-500 dark:border-gray-700 dark:bg-gray-800/50"}`}
        >
          <Save size={18} />
          <span>SAVE</span>
        </Button>

        {/* RESET (ya no se oculta; queda deshabilitado si no hay cambios o snapshot no listo) */}
        <Button
          onClick={() => setShowReset(true)}
          disabled={!canReset}
          className={`!px-4 !py-2 text-xs flex flex-col items-center gap-0.5 font-semibold
                      w-[70px] border shadow-md transition
                      ${canReset
                        ? "text-red-700 border-red-200 bg-white/70 hover:bg-red-50 dark:text-red-300 dark:border-red-800/40 dark:bg-gray-800/70 dark:hover:bg-red-900/30"
                        : "text-gray-400 border-gray-200 bg-white/50 cursor-not-allowed dark:text-gray-500 dark:border-gray-700 dark:bg-gray-800/50"}`}
        >
          <RefreshCw size={18} />
          <span>RESET</span>
        </Button>
      </div>
    </div>
  );
}
