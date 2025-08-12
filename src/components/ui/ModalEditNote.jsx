import { useEffect, useMemo, useRef } from "react";
import { X } from "lucide-react";

/**
 * Modal de edición con grid 2 columnas (label/valor).
 * - Mismo panel/overlay/tipografía de ModalFull.
 * - ÚNICO no editable: "PFTS | <Agente>" (se conserva idéntico).
 * - Detecta "TRANSFER TO ..." y "OUTAGE" (con/sin ":") y también cuando OUTAGE viene INLINE al final: "... | OUTAGE: NONE"
 * - **NUEVO:** Detecta labels con coma: "ERROR FOUND IN NETCRACKER, 23123123"
 * - Si OUTAGE = NONE, limpia "NO ACTIVE OUTAGES / NO ERRORS ON NC" al final de "SERVICE ON CSR".
 * - Textareas auto-ajustables (crecen hasta un tope y luego scrollean).
 */

const LABEL_RX       = /^\s*([A-Z][A-Z0-9 ()/_|.\-]{1,50})\s*:\s*(.*)\s*$/i;
const COMMA_LABEL_RX = /^\s*([A-Z][A-Z0-9 ()/_|.\-]{1,50})\s*,\s*(.+)\s*$/i; // <-- NUEVO
const PFTS_RX        = /^\s*(PFTS\s*\|)\s*(.*)$/i;
const TRANSFER_RX    = /^\s*(TRANSFER\s+TO)\s*:?\s*(.*)\s*$/i;
const OUTAGE_RX      = /^\s*(OUTAGE(?:\s+STATUS)?)\s*:?\s*(.*)\s*$/i;

const READONLY_SET = new Set(["PFTS |"]); // única excepción no editable

/* ───────── Splitter de OUTAGE INLINE (solo cuando aparece al final) ───────── */
function splitInlineOutageAtEnd(value = "") {
  const rx = /(?:^|[ \t|/–—-]+)(OUTAGE(?:\s+STATUS)?)\s*:?\s*([A-Z0-9 _-]{1,60})\s*$/i;
  const m = value.match(rx);
  if (!m) return null;
  const keyRaw = m[1];
  const val = (m[2] || "").trim();
  const endIdx = m.index;
  const left = value.slice(0, endIdx).replace(/[ \t|/–—-]+$/g, "").trimEnd();
  return { leftVal: left, outageRawKey: "OUTAGE", outageVal: val };
}

/* ───────── Parseo robusto ───────── */
function parseNoteToEntries(fullText = "") {
  const lines = String(fullText).split(/\r?\n/);

  const entries = [];
  let prefaceLines = [];
  let foundFirst = false;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];

    // PFTS | <valor>
    const mp = raw.match(PFTS_RX);
    if (mp) {
      foundFirst = true;
      entries.push({ key: "PFTS |", rawKey: mp[1].trim(), value: (mp[2] ?? "").trim(), isPfts: true });
      continue;
    }

    // TRANSFER TO … (con/sin ":")
    const mt = raw.match(TRANSFER_RX);
    if (mt) {
      foundFirst = true;
      const key = (mt[1] || "").trim().toUpperCase(); // "TRANSFER TO"
      let value = (mt[2] ?? "");

      const chunk = [value];
      let j = i + 1;
      while (
        j < lines.length &&
        !LABEL_RX.test(lines[j]) &&
        !COMMA_LABEL_RX.test(lines[j]) &&
        !PFTS_RX.test(lines[j]) &&
        !TRANSFER_RX.test(lines[j]) &&
        !OUTAGE_RX.test(lines[j])
      ) {
        chunk.push(lines[j]);
        j++;
      }
      i = j - 1;
      value = chunk.join("\n").replace(/\s+$/g, "");

      const splitInline = splitInlineOutageAtEnd(value);
      if (splitInline) {
        const { leftVal, outageRawKey, outageVal } = splitInline;
        entries.push({ key, rawKey: mt[1].trim(), value: leftVal, isPfts: false });
        entries.push({ key: outageRawKey.toUpperCase(), rawKey: outageRawKey, value: outageVal, isPfts: false });
      } else {
        entries.push({ key, rawKey: mt[1].trim(), value, isPfts: false });
      }
      continue;
    }

    // OUTAGE (con/sin ":") como línea independiente
    const mo = raw.match(OUTAGE_RX);
    if (mo) {
      foundFirst = true;
      const key = "OUTAGE";
      let value = (mo[2] ?? "");

      const chunk = [value];
      let j = i + 1;
      while (
        j < lines.length &&
        !LABEL_RX.test(lines[j]) &&
        !COMMA_LABEL_RX.test(lines[j]) &&
        !PFTS_RX.test(lines[j]) &&
        !TRANSFER_RX.test(lines[j]) &&
        !OUTAGE_RX.test(lines[j])
      ) {
        chunk.push(lines[j]);
        j++;
      }
      i = j - 1;
      value = chunk.join("\n").replace(/\s+$/g, "");
      entries.push({ key, rawKey: "OUTAGE", value, isPfts: false });
      continue;
    }

    // *** NUEVO: LABEL con COMA => "LABEL, valor"
    const mc = raw.match(COMMA_LABEL_RX);
    if (mc) {
      foundFirst = true;
      const key = (mc[1] || "").trim().toUpperCase();
      let value = (mc[2] ?? "");

      const chunk = [value];
      let j = i + 1;
      while (
        j < lines.length &&
        !LABEL_RX.test(lines[j]) &&
        !COMMA_LABEL_RX.test(lines[j]) &&
        !PFTS_RX.test(lines[j]) &&
        !TRANSFER_RX.test(lines[j]) &&
        !OUTAGE_RX.test(lines[j])
      ) {
        chunk.push(lines[j]);
        j++;
      }
      i = j - 1;
      value = chunk.join("\n").replace(/\s+$/g, "");

      // OUTAGE inline al final → separar si aparece pegado
      const splitInline = splitInlineOutageAtEnd(value);
      if (splitInline) {
        const { leftVal, outageRawKey, outageVal } = splitInline;
        entries.push({ key, rawKey: mc[1].trim(), value: leftVal, isPfts: false });
        entries.push({ key: outageRawKey.toUpperCase(), rawKey: outageRawKey, value: outageVal, isPfts: false });
      } else {
        entries.push({ key, rawKey: mc[1].trim(), value, isPfts: false });
      }
      continue;
    }

    // LABEL estándar con ":"
    const m = raw.match(LABEL_RX);
    if (m) {
      foundFirst = true;
      const key = (m[1] || "").trim().toUpperCase();
      let value = (m[2] ?? "");

      const chunk = [value];
      let j = i + 1;
      while (
        j < lines.length &&
        !LABEL_RX.test(lines[j]) &&
        !COMMA_LABEL_RX.test(lines[j]) &&
        !PFTS_RX.test(lines[j]) &&
        !TRANSFER_RX.test(lines[j]) &&
        !OUTAGE_RX.test(lines[j])
      ) {
        chunk.push(lines[j]);
        j++;
      }
      i = j - 1;
      value = chunk.join("\n").replace(/\s+$/g, "");

      const splitInline = splitInlineOutageAtEnd(value);
      if (splitInline) {
        const { leftVal, outageRawKey, outageVal } = splitInline;
        entries.push({ key, rawKey: m[1].trim(), value: leftVal, isPfts: false });
        entries.push({ key: outageRawKey.toUpperCase(), rawKey: outageRawKey, value: outageVal, isPfts: false });
      } else {
        entries.push({ key, rawKey: m[1].trim(), value, isPfts: false });
      }
      continue;
    }

    // Prefacio o líneas sueltas
    if (!foundFirst) {
      prefaceLines.push(raw);
    } else if (entries.length) {
      entries[entries.length - 1].value =
        (entries[entries.length - 1].value ? entries[entries.length - 1].value + "\n" : "") + raw;
    } else {
      prefaceLines.push(raw);
    }
  }

  const preface = prefaceLines.join("\n").replace(/^\s+|\s+$/g, "");
  return { preface, entries };
}

/* ───────── Sanitización (SERVICE ON CSR) ───────── */
function sanitizeServiceOnCsr(entries) {
  const outageEntry = entries.find((e) => e.key === "OUTAGE");
  const isNone = outageEntry && /(^|\b)none\b/i.test(outageEntry.value || "");
  if (!isNone) return entries;

  return entries.map((e) => {
    if (e.key !== "SERVICE ON CSR") return e;

    let v = e.value || "";
    v = v.replace(
      /\s*(?:[-|/–—])?\s*NO\s+ACTIVE\s+OUTAGES(?:\s*\/\s*NO\s+ERRORS\s+ON\s+NC)?\s*$/i,
      ""
    );
    v = v.replace(/\s*(?:[-|/–—])?\s*NO\s+ERRORS\s+ON\s+NC\s*$/i, "");
    v = v.replace(/\s*(?:[-|/–—])?\s*NO\s+ACTIVE\s+OUTAGES\s*$/i, "");
    return { ...e, value: v.trimEnd() };
  });
}

/* ───────── Reconstrucción ───────── */
function rebuildNote(preface, entries) {
  const parts = [];
  if (preface) parts.push(preface);
  for (const e of entries) {
    if (e.isPfts) {
      parts.push(`${e.rawKey} ${e.value || ""}`.trimEnd());
    } else {
      parts.push(`${e.rawKey}: ${e.value || ""}`.replace(/\s+$/g, ""));
    }
  }
  return parts.join("\n");
}

/* ───────── Textarea auto-ajustable ───────── */
function TextareaAuto({
  value,
  onChange,
  placeholder = "Escribe aquí…",
  min = 22,
  max = 120,
  className = "",
}) {
  const ref = useRef(null);
  const resize = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    const scroll = el.scrollHeight;
    const next = Math.max(min, Math.min(scroll, max));
    el.style.height = next + "px";
    el.style.overflowY = scroll > next ? "auto" : "hidden";
  };
  useEffect(() => { resize(); }, []);
  useEffect(() => { resize(); }, [value]);
  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onInput={resize}
      placeholder={placeholder}
      className={
        "w-full resize-none rounded-md border border-gray-300 dark:border-gray-700 " +
        "bg-white dark:bg-gray-800 px-2 py-0.5 text-sm " +
        "text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-300 " +
        className
      }
      style={{ height: "auto" }}
    />
  );
}

/* ───────── Componente principal ───────── */
export default function ModalEditNote({ open, onClose, note, onChangeText }) {
  const text = note?.text ?? "";

  const { preface, entries: parsed } = useMemo(() => parseNoteToEntries(text), [text]);

  // Sanitiza y usa en UI
  const entries = useMemo(() => sanitizeServiceOnCsr(parsed), [parsed]);

  // ESC para cerrar
  useEffect(() => {
    const handleEsc = (e) => { if (e.key === "Escape" && open) onClose(); };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [open, onClose]);

  if (!open || !note) return null;

  const handleEntryChange = (entryIndex, newVal) => {
    const next = entries.map((e, i) => (i === entryIndex ? { ...e, value: newVal } : e));
    const combined = rebuildNote(preface, sanitizeServiceOnCsr(next));
    onChangeText && onChangeText(combined);
  };

  const handlePrefaceChange = (newVal) => {
    const combined = rebuildNote(newVal, sanitizeServiceOnCsr(entries));
    onChangeText && onChangeText(combined);
  };

  return (
    <>
      {/* Overlay idéntico a ModalFull */}
      <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" onClick={onClose} />

      {/* Panel idéntico a ModalFull + tipografía uniforme */}
      <div
        className="
          fixed top-1/2 left-1/2 z-50 
          w-full max-w-lg 
          -translate-x-1/2 -translate-y-1/2 
          bg-white dark:bg-gray-800 
          rounded-2xl shadow-2xl 
          overflow-hidden
          font-sans
        "
        role="dialog"
        aria-modal="true"
        aria-label="Edit Note"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-gray-100 dark:bg-gray-900">
          <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">Edit Note</h3>
          <button
            onClick={onClose}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            aria-label="Close"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Cuerpo (scrolleable) */}
        <div className="p-4">
          <div
            className="
              h-[54vh] overflow-y-auto 
              bg-gray-50 dark:bg-gray-900 
              rounded-md p-3
              space-y-1
            "
          >
            {/* Prefacio editable si existe */}
            {preface && (
              <>
                <div className="grid grid-cols-[110px,1fr] gap-x-2 gap-y-0.5">
                  <div className="text-right">
                    <span className="inline-block text-[13px] font-semibold text-gray-800 dark:text-gray-200 select-none">
                      PREFACE
                    </span>
                  </div>
                  <div className="min-w-0">
                    <TextareaAuto value={preface} onChange={handlePrefaceChange} />
                  </div>
                </div>
                <div className="h-px bg-gray-200 dark:bg-gray-700" />
              </>
            )}

            {/* Grid de edición de TODOS los campos */}
            <div className="grid grid-cols-[140px,1fr] gap-x-2 gap-y-1">
              {entries.map((e, idx) => {
                const isReadonly = READONLY_SET.has(e.key) || e.isPfts;
                const labelText = e.isPfts ? e.rawKey : `${e.rawKey}:`;
                return (
                  <div key={`${e.rawKey}-${idx}`} className="contents">
                    {/* Label (col izq) */}
                    <div className="text-right">
                      <span className="inline-block text-[13px] font-semibold text-gray-800 dark:text-gray-200 select-none">
                        {labelText}
                      </span>
                    </div>
                    {/* Valor (col der) */}
                    <div className="min-w-0">
                      {isReadonly ? (
                        <div
                          className="
                            text-sm text-gray-800 dark:text-gray-100
                            whitespace-pre-wrap
                            rounded-md px-2 py-0.5
                            bg-white/70 dark:bg-gray-800/70
                            border border-gray-200 dark:border-gray-700
                          "
                          title="Campo no editable"
                        >
                          {e.value || "—"}
                        </div>
                      ) : (
                        <TextareaAuto
                          value={e.value}
                          onChange={(val) => handleEntryChange(idx, val)}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
