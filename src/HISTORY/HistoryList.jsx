import { useEffect, useMemo, useState, useRef } from "react";
import {
  ChevronRight,
  Search,
  X,
  Minimize,
  StretchVertical,
  Upload,
  Download,
} from "lucide-react";
import { groupNotesByMonthDay, formatMonth, formatDay } from "../UI/UTILS/date";
import { parseMetaFromText } from "./history";
import { useToast } from "../UI/ToastContext";
import { getNotes, addNote, deleteNote } from "../db/notes";

const GT_TZ = "America/Guatemala";

/* ========================= Helpers ========================= */
function pick(obj, path, fallback = undefined) {
  try {
    const parts = path.split(".");
    let cur = obj;
    for (const p of parts) cur = cur?.[p];
    return cur ?? fallback;
  } catch {
    return fallback;
  }
}
function parseDate(dstr) {
  const d = new Date(dstr || Date.now());
  return isNaN(d.getTime()) ? new Date() : d;
}
function getCreated(n) {
  return n.createdAt || n.created || n.timestamp;
}

function getService(n) {
  const top = n.service ?? "";
  const nested = pick(n, "issue.service", "");
  if (top || nested) return top || nested;
  const meta = parseMetaFromText(n.text || "");
  return meta.service || "";
}
function getWorkflow(n) {
  const top = n.workflow ?? "";
  const nested = pick(n, "issue.workflow", "");
  if (top || nested) return top || nested;
  const meta = parseMetaFromText(n.text || "");
  return meta.workflow || "";
}
function getResolutionText(n) {
  return resolveOutcome(n).text;
 }

/** Normaliza la “resolución” para badge/color:
 *  Busca en resolution.summary/outcome, en note.outcome, en meta y si no,
 *  lo deduce del texto ("EOC", "Follow Up", "Tech/Dispatch"). */
function resolveOutcome(note) {
  const fromFields =
    pick(note, "resolution.summary") ||
    pick(note, "resolution.outcome") ||
    note.outcome ||
    "";
  const meta = parseMetaFromText(note.text || "");
  const fromMeta = meta.resolutionText || meta.outcome || "";
  let raw = String(fromFields || fromMeta || "").trim();

  // Heurísticas sobre el texto si sigue vacío o es muy genérico
  if (!raw) {
    const txt = String(note.text || "");
    if (/\bfollow[\s-]?up\b/i.test(txt)) raw = "Follow Up";
    else if (/\b(tech|dispatch(?:ed)?)\b/i.test(txt)) raw = "Tech Booked";
    else if (/\b(eoc|end of call|resolved)\b/i.test(txt)) raw = "EOC";
  }

  const lc = raw.toLowerCase();
  let category = "";
  if (/\bfollow[\s-]?up\b/.test(lc)) category = "followup";
  else if (/\b(tech|dispatch(?:ed)?)\b/.test(lc)) category = "tech";
  else if (/\beoc\b/.test(lc) || lc.startsWith("yes") || lc.includes("resolved")) category = "yes";
  else if (lc.startsWith("no") || lc.includes("not resolved")) category = "no";

  // Texto visible en badge (fallbacks simpáticos)
  const text =
    raw ||
    (category === "followup" ? "Follow Up" :
     category === "tech" ? "Tech Booked" :
     category === "yes" ? "EOC" :
     category === "no" ? "No" : "");

  return { text, category };
}

/** Decide agenda a mostrar (DISPATCH / FOLLOW UP) */
function pickScheduleToShow(note) {
  const outcome = (note.resolution?.outcome || note.outcome || "").toLowerCase();

  let techD = note.resolution?.techDate || "";
  let techT = note.resolution?.techTime || "";
  let fuD = note.resolution?.followUpDate || "";
  let fuT = note.resolution?.followUpTime || "";

  if (!techD && !techT && !fuD && !fuT) {
    const meta = parseMetaFromText(note.text || "");
    techD = meta.techDate || "";
    techT = meta.techTime || "";
    fuD = meta.followUpDate || "";
    fuT = meta.followUpTime || "";
  }

  if (outcome.includes("follow up")) {
    if (fuD || fuT) return { label: "FOLLOW UP", d: fuD, t: fuT };
    return { label: "", d: "", t: "" };
  }
  if (outcome.includes("tech")) {
    if (techD || techT) return { label: "DISPATCH", d: techD, t: techT };
    return { label: "", d: "", t: "" };
  }

  if (fuD || fuT) return { label: "FOLLOW UP", d: fuD, t: fuT };
  if (techD || techT) return { label: "DISPATCH", d: techD, t: techT };
  return { label: "", d: "", t: "" };
}

/** Etiqueta/valor correctos para special ticket */
function getSpecialTicket(note) {
  const txt = (note.text || "").toUpperCase();
  const meta = parseMetaFromText(note.text || "");

  const bosr =
    note.bosrTicket ||
    meta.bosrTicket ||
    (txt.includes("BOSR TICKET") ? note.resolution?.ticketSpecial || meta.specialTicket : "");
  if (bosr) return { label: "BOSR TICKET", value: bosr };

  const nc =
    note.ncTicket ||
    meta.ncTicket ||
    (txt.includes("NC TICKET") ? note.resolution?.ticketSpecial || meta.specialTicket : "");
  if (nc) return { label: "NC TICKET", value: nc };

  const emt =
    note.emtTicket ||
    meta.emtTicket ||
    (txt.includes("EMT TICKET") ? note.resolution?.ticketSpecial || meta.specialTicket : "");
  if (emt) return { label: "EMT TICKET", value: emt };

  const fallback = note.resolution?.ticketSpecial || meta.specialTicket || "";
  if (fallback) return { label: "TICKET", value: fallback };

  return { label: "", value: "" };
}

/** Tonos por outcome (badge/contorno base) */
function outcomeTone(n) {
  const { category } = resolveOutcome(n);
  const out = (n.resolution?.outcome || n.outcome || "").toLowerCase();
  const hasBOSR = !!n.bosrTicket || out.includes("bosr");
  const hasNC = !!n.ncTicket || out.includes("nc ticket");

  if (category === "no" && (hasBOSR || hasNC))
    return { badge: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200", ring: "ring-1 ring-blue-200 dark:ring-blue-700/50" };
  if (category === "followup")
    return { badge: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200", ring: "ring-1 ring-rose-200 dark:ring-rose-700/50" };
  if (category === "tech")
    return { badge: "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200", ring: "ring-1 ring-violet-200 dark:ring-violet-700/50" };
  if (category === "yes")
    return { badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200", ring: "ring-1 ring-emerald-200 dark:ring-emerald-700/50" };
  return {
    badge:
      "bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200",
    ring: "ring-1 ring-slate-200 dark:ring-slate-700/50",
  };
}

/** Chevron */
const Chevron = ({ open }) => (
  <ChevronRight
    size={18}
    className={`transition-transform ${open ? "rotate-90" : "rotate-0"} text-slate-600 dark:text-slate-300`}
  />
);

/** Density toggle con íconos (persistente) */
function useDensity() {
  const [density, setDensity] = useState(
    () => localStorage.getItem("history_density") || "comfortable"
  );
  useEffect(() => {
    localStorage.setItem("history_density", density);
  }, [density]);
  return [density, setDensity];
}
function DensityToggle({ density, onChange }) {
  const baseBtn =
    "inline-flex items-center justify-center gap-1 px-2.5 py-1 text-xs font-semibold transition";
  return (
    <div className="inline-flex items-center rounded-full border border-blue-100/60 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 backdrop-blur shadow-sm overflow-hidden">
      <button
        onClick={() => onChange("comfortable")}
        className={`${baseBtn} ${
          density === "comfortable"
            ? "bg-blue-600 text-white"
            : "text-blue-700 dark:text-blue-300 hover:bg-blue-50/60 dark:hover:bg-slate-700/60"
        }`}
        title="Comfortable"
        aria-label="Comfortable density"
      >
        <StretchVertical size={16} />
      </button>
      <button
        onClick={() => onChange("compact")}
        className={`${baseBtn} border-l border-blue-100/60 dark:border-slate-700 ${
          density === "compact"
            ? "bg-blue-600 text-white"
            : "text-blue-700 dark:text-blue-300 hover:bg-blue-50/60 dark:hover:bg-slate-700/60"
        }`}
        title="Compact"
        aria-label="Compact density"
      >
        <Minimize size={16} />
      </button>
    </div>
  );
}

/* ========================= Adaptador de backups viejos ========================= */
/** Convierte backups viejos (finalNoteText + formData + timestamp)
 *  o backups nuevos, al esquema actual de notas. */
function adaptBackupPayloadToCurrent(payload) {
  // Acepta: [ ... ] o { notes: [ ... ] }
  const list = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.notes)
    ? payload.notes
    : [];

  if (!Array.isArray(list)) return [];

  const looksLegacy = !!list[0]?.finalNoteText || !!list[0]?.formData;

  const safeId =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID.bind(crypto)
      : () => String(Date.now()) + Math.random().toString(36).slice(2);

  const normNew = (n) => {
    const createdAt =
      n.createdAt || n.created || n.timestamp || new Date().toISOString();
    const id = n.id || safeId();
    const text = n.text || "";
    return {
      ...n,
      id,
      createdAt,
      created: n.created ?? createdAt,
      timestamp: n.timestamp ?? createdAt,
      text,
    };
  };

  const mapLegacy = (it) => {
    const fd = it.formData || {};
    const clean = (v) => (typeof v === "string" ? v.trim() : v);
    const createdAt =
      it.timestamp || it.createdAt || new Date().toISOString();
    const id = it.id || safeId();
    const text = it.finalNoteText || it.text || "";

    return {
      id,
      createdAt,
      created: createdAt,
      timestamp: createdAt,
      text,
      // Campos útiles para búsqueda/pills si existen
      ban: clean(fd.ban) || undefined,
      cid: clean(fd.cid) || undefined,
      name: clean(fd.name) || undefined,
      cbr: clean(fd.cbr) || undefined,
      ticket:
        fd.ticketInput && fd.ticketInput !== "0"
          ? clean(fd.ticketInput)
          : undefined,
    };
  };

  const normalized = list.map((x) => (looksLegacy ? mapLegacy(x) : normNew(x)));

  // De-dupe por id o por (text+createdAt)
  const seen = new Set();
  return normalized.filter((n) => {
    const key = n.id || `${n.text}@@${n.createdAt}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/* ========================= Tarjeta de Nota ========================= */
function NoteCard({ n, selected, dense, onOpenView, setSelectedNote }) {
  const service = getService(n) || "--";
  const workflow = getWorkflow(n) || "--";
  const resolution = getResolutionText(n) || "--";
  const schedule = pickScheduleToShow(n);
  const { label: ticketLabel, value: ticketValue } = getSpecialTicket(n);
  const tone = outcomeTone(n);

  const rowTextSize = dense ? "text-[12px]" : "text-[13px]";
  const chipTextSize = dense ? "text-[11px]" : "text-[12px]";

  return (
    <li
      data-note-card
      tabIndex={0}
      aria-selected={selected}
      className={`
        rounded-lg p-2 border bg-white/80 dark:bg-slate-900/60 shadow-sm cursor-pointer transition-colors
        focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/70 dark:focus-visible:ring-blue-300/60
        ${tone.ring}
        ${
          selected
            ? "relative pl-3 border-2 border-blue-500 dark:border-blue-400 bg-blue-50/70 dark:bg-blue-900/30 shadow-md \
               before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1.5 \
               before:bg-blue-500 dark:before:bg-sky-400 before:rounded-r-md"
            : "hover:bg-white dark:hover:bg-slate-900"
        }
      `}
      onClick={() => setSelectedNote(n)}
      onDoubleClick={() => {
        setSelectedNote(n);
        onOpenView && onOpenView();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          setSelectedNote(n);
          onOpenView && onOpenView();
        }
      }}
    >
      {/* Fila 1: Identificación + Resolution badge */}
      <div
        className={`flex items-center justify-between ${rowTextSize} text-slate-800 dark:text-slate-200`}
      >
        {/* Lado izquierdo: BAN/CID/NAME/CBR */}
        <div
          className={`flex-1 min-w-0 flex items-center gap-x-3 gap-y-1 flex-wrap ${
            dense ? "leading-tight" : ""
          }`}
        >
          <span>
            <b className="mr-1">BAN:</b>
            {n.ban || "--"}
          </span>
          <span>
            <b className="mr-1">CID:</b>
            {n.cid || "--"}
          </span>
          <span className="max-w-[160px] truncate">
            <b className="mr-1">NAME:</b>
            {n.name || "--"}
          </span>
          <span>
            <b className="mr-1">CBR:</b>
            {n.cbr || "--"}
          </span>
        </div>

        {/* Badge de RESOLUTION visible y consistente */}
        <span
          className={`
            ml-2 inline-flex items-center rounded-full px-2 ${
              dense ? "py-[1px]" : "py-0.5"
            } font-semibold ${tone.badge}
            border border-transparent shrink-0 overflow-hidden max-w-[45%]
          `}
          title="Outcome / Resolution"
        >
          <span className={`truncate ${dense ? "text-[11px]" : "text-[12px]"}`}>
            {resolution}
          </span>
        </span>
      </div>

      {/* Comfortable = solo 1 fila; Compact = muestra pills */}
      {dense && (
        <>
          {/* Fila 2: SERVICE + WORKFLOW */}
          <div
            className={`mt-1 flex items-center gap-2 flex-wrap ${chipTextSize} text-slate-700 dark:text-slate-300`}
          >
            <span className="inline-flex items-center rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-[2px]">
              <b className="mr-1">SERVICE:</b>
              <span className="truncate max-w-[220px]">{service}</span>
            </span>
            <span className="inline-flex items-center rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-[2px]">
              <b className="mr-1">WORKFLOW:</b>
              <span className="truncate max-w-[220px]">{workflow}</span>
            </span>
          </div>

          {/* Fila 3: Agenda + Tickets */}
          <div
            className={`mt-1 flex items-center gap-2 flex-wrap ${chipTextSize} text-slate-700 dark:text-slate-300`}
          >
            {schedule.label && (schedule.d || schedule.t) && (
              <span className="inline-flex items-center rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-[2px]">
                <b className="mr-1">{schedule.label}:</b>
                {schedule.d} {schedule.t || ""}
              </span>
            )}
            {ticketValue && (
              <span className="inline-flex items-center rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-[2px]">
                <b className="mr-1">{ticketLabel}:</b>
                <span className="truncate max-w-[240px]">{ticketValue}</span>
              </span>
            )}
            {n.ticket && (
              <span className="inline-flex items-center rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-[2px]">
                <b className="mr-1">TICKET:</b>
                <span className="truncate max-w-[240px]">{n.ticket}</span>
              </span>
            )}
          </div>
        </>
      )}
    </li>
  );
}

/* ========================= Componente principal ========================= */
export default function HistoryList({
  notes,
  selectedNote,
  setSelectedNote,
  onOpenView,
}) {
  // búsqueda
  const [query, setQuery] = useState("");

  // density
  const [density, setDensity] = useDensity();
  const dense = density === "compact"; // compact = muestra todas las pills; comfortable = solo 1 fila

  // colapsables
  const [collapsedMonths, setCollapsedMonths] = useState({});
  const [collapsedDays, setCollapsedDays] = useState({}); // { [monthKey]: { [dayKey]: boolean } }

  // toast & file input
  const toast = useToast?.() || null;
  const importRef = useRef(null);
  const importModeRef = useRef("merge"); // "merge" | "replace"

  // helpers export/import
  function tsName() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const name = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(
      d.getHours()
    )}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
    return name;
  }

  function handleExportAll() {
    try {
      const data = Array.isArray(notes) ? notes : [];
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `apad-notes-export-${tsName()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast?.success?.("Notas exportadas.");
    } catch (err) {
      console.error(err);
      toast?.error?.("No se pudo exportar.");
    }
  }

    async function importNotes(newNotes, mode = "merge") {
    try {
      const list = Array.isArray(newNotes) ? newNotes : [];
      // Normaliza timestamps
      const normalized = list.map((n) => {
        const createdOrig = getCreated(n) ?? Date.now();
        return {
          ...n,
          createdAt: n.createdAt ?? createdOrig,
          created: n.created ?? createdOrig,
          timestamp: n.timestamp ?? createdOrig,
        };
      });

      const existing = await getNotes();

      if (mode === "replace") {
        // Borrar todo y cargar desde cero
        for (const n of existing) {
          if (n?.id != null) {
            // eslint-disable-next-line no-await-in-loop
            await deleteNote(n.id);
          }
        }
        for (const n of normalized) {
          // eslint-disable-next-line no-await-in-loop
          await addNote(n);
        }
      } else {
        // MERGE: no borrar; actualizar si coincide por id o por (text+createdAt)
        const byId = new Map(existing.map((e) => [e.id, e]));
        const byComposite = new Map(
          existing.map((e) => [`${e.text || ""}@@${getCreated(e) || ""}`, e])
        );
        for (const n of normalized) {
          const key = `${n.text || ""}@@${getCreated(n) || ""}`;
          const same = n.id && byId.get(n.id);
          const comp = byComposite.get(key);
          const upsert = comp && !same ? { ...n, id: comp.id } : n;
          // eslint-disable-next-line no-await-in-loop
          await addNote(upsert); // put: crea o actualiza por id
        }
      }

      toast?.success?.(mode === "replace" ? "Notas importadas (reemplazo)." : "Notas importadas (merge).");
      window.dispatchEvent?.(new CustomEvent("apad:notes-imported"));
      setTimeout(() => { try { location.reload(); } catch {} }, 60);
    } catch (e) {
      console.error(e);
      toast?.error?.("No se pudo importar.");
    }
  }

  async function onPickImportFile(e) {
    try {
      const file = e.target.files?.[0];
      if (!file) return;
      const text = await file.text();
      const parsed = JSON.parse(text);

      // Adaptar formato viejo o aceptar el nuevo
      const normalizedNotes = adaptBackupPayloadToCurrent(parsed);

    const mode = importModeRef.current || "merge";
      await importNotes(normalizedNotes, mode);    } catch (err) {

      console.error(err);
      toast?.error?.("Archivo inválido o error al importar.");
    } finally {
      if (importRef.current) importRef.current.value = "";
    }
  }

  /* ========= filtro en tiempo real ========= */
  // --- Búsqueda avanzada: soporta frases "entre comillas", exclusiones con -palabra y busca en el texto completo ---
  function tokenizeQuery(q) {
    // Extrae "frases exactas" y términos sueltos; soporta -negaciones
    // Ej:  wifi "no navega" -router
    const tokens = [];
    const re = /"([^"]+)"|(\S+)/g;
    let m;
    while ((m = re.exec(q))) {
      const raw = (m[1] ?? m[2] ?? "").trim();
      if (!raw) continue;
      const neg = raw.startsWith("-");
      const val = (neg ? raw.slice(1) : raw).toLowerCase();
      if (val) tokens.push({ neg, val });
    }
    const positives = tokens.filter(t => !t.neg).map(t => t.val);
    const negatives = tokens.filter(t =>  t.neg).map(t => t.val);
    return { positives, negatives };
  }

  const filteredNotes = useMemo(() => {
    const q = query.trim();
    if (!q) return notes;
    const { positives, negatives } = tokenizeQuery(q);
    if (positives.length === 0 && negatives.length === 0) return notes;

    return notes.filter((n) => {
      const meta = parseMetaFromText(n.text || "");
      // Haystack: campos clave + TODO el texto de la nota
      const hay = [
        n.ban, n.cid, n.cbr, n.name,
        n.ticket, n.bosrTicket, n.ncTicket, n.emtTicket,
        getService(n) || meta.service,
        getWorkflow(n) || meta.workflow,
        getResolutionText(n) || meta.resolutionText,
        meta.specialTicket,
        n.text, // contenido completo
      ]
        .filter(Boolean)
        .join(" \n ")
        .toLowerCase();

      // Debe cumplir: todas las positivas (AND) y ninguna negativa presente
      const hasAllPos = positives.every(t => hay.includes(t));
      const hasNeg   = negatives.some(t => hay.includes(t));
      return hasAllPos && !hasNeg;
    });
  }, [notes, query]);

  /* ========= agrupar ========= */
  const groupedFiltered = useMemo(
    () => groupNotesByMonthDay(filteredNotes),
    [filteredNotes]
  );

  /* ========= claves de hoy / mes actual (zona GT) ========= */
  const now = new Date();
  const y = now.toLocaleString("en-CA", { timeZone: GT_TZ, year: "numeric" });
  const m = now.toLocaleString("en-CA", { timeZone: GT_TZ, month: "2-digit" });
  const d = now.toLocaleString("en-CA", { timeZone: GT_TZ, day: "2-digit" });
  const todayDayKey = `${y}-${m}-${d}`;
  const currentMonthKey = `${y}-${m}`;

  /* ========= estado colapsable por defecto (sin búsqueda) ========= */
  useEffect(() => {
    if (query.trim()) return; // si hay búsqueda, no aplicar defaults
    const newCollapsedMonths = {};
    const newCollapsedDays = {};
    Object.keys(groupedFiltered).forEach((monthKey) => {
      const dayMap = groupedFiltered[monthKey] || {};
      newCollapsedDays[monthKey] = {};

      if (monthKey === currentMonthKey) {
        // mes actual: sin encabezado; días → solo HOY abierto
        Object.keys(dayMap).forEach((dayKey) => {
          newCollapsedDays[monthKey][dayKey] = dayKey !== todayDayKey;
        });
      } else {
        // meses previos → colapsados
        newCollapsedMonths[monthKey] = true;
        Object.keys(dayMap).forEach((dayKey) => {
          newCollapsedDays[monthKey][dayKey] = true;
        });
      }
    });
    setCollapsedMonths(newCollapsedMonths);
    setCollapsedDays(newCollapsedDays);
  }, [groupedFiltered, currentMonthKey, todayDayKey, query]);

  /* ========= si hay búsqueda, expandir todo con resultados ========= */
  useEffect(() => {
    const q = query.trim();
    if (!q) return; // manejar default arriba
    const openMonths = {};
    const openDays = {};
    Object.keys(groupedFiltered).forEach((monthKey) => {
      openMonths[monthKey] = false; // expandido
      openDays[monthKey] = {};
      Object.keys(groupedFiltered[monthKey] || {}).forEach((dayKey) => {
        openDays[monthKey][dayKey] = false; // expandido
      });
    });
    setCollapsedMonths(openMonths);
    setCollapsedDays(openDays);
  }, [groupedFiltered, query]);

  /* ========= orden descendente ========= */
  const allMonths = Object.keys(groupedFiltered).sort((a, b) =>
    b.localeCompare(a)
  );
  const prevMonths = allMonths.filter((k) => k !== currentMonthKey);
  const currentMonthDaysMap = groupedFiltered[currentMonthKey] || {};
  const currentMonthSortedDays = Object.keys(currentMonthDaysMap).sort((a, b) =>
    b.localeCompare(a)
  );

  /* ========= toggles ========= */
  const toggleMonth = (monthKey) =>
    setCollapsedMonths((prev) => ({
      ...prev,
      [monthKey]: !prev[monthKey],
    }));
  const toggleDay = (monthKey, dayKey) =>
    setCollapsedDays((prev) => ({
      ...prev,
      [monthKey]: {
        ...(prev[monthKey] || {}),
        [dayKey]: !prev[monthKey]?.[dayKey],
      },
    }));

  /* ========= deseleccionar con ESC o clic fuera de una nota ========= */
  useEffect(() => {
    const onEsc = (e) => {
      if (e.key === "Escape") {
        setSelectedNote && setSelectedNote(null);
      }
    };
    const onOutside = (e) => {
      const el = e.target;
      // Ignorar clicks dentro de una tarjeta, dentro de la HistoryBar o dentro de un modal/dialog
      const onCard = el.closest("[data-note-card]");
      const onBar = el.closest("[data-history-bar]");
      const onModal = el.closest("[data-history-modal]") || el.closest("[role='dialog']");
      if (onCard || onBar || onModal) return;
      setSelectedNote && setSelectedNote(null);
    };
    window.addEventListener("keydown", onEsc);
    document.addEventListener("pointerdown", onOutside, { capture: true });
    return () => {
      window.removeEventListener("keydown", onEsc);
      document.removeEventListener("pointerdown", onOutside, { capture: true });
    };
  }, [setSelectedNote]);

  /* ========================= UI ========================= */
  return (
    <div className="mx-auto max-w-4xl px-4 pt-2 pb-10">
      {/* Barra superior STICKY */}
      <div
        className="
          sticky top-14 md:top-16 z-20
          mb-5 flex items-center gap-3
          bg-white/70 dark:bg-slate-900/70 backdrop-blur
          border-b border-blue-100/60 dark:border-slate-700
          px-2 py-2 rounded-xl
        "
      >
        <div
          className="
            relative flex flex-1 items-center
            rounded-full border border-blue-100/60 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 backdrop-blur
            shadow-sm focus-within:ring-2 focus-within:ring-blue-300
          "
        >
          <span className="pl-3">
            <Search size={18} className="text-blue-500/80" />
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setQuery("");
            }}
            type="text"
            placeholder="Search using key words, ban/cid/name/ticket, etc"
            className="
              w-full bg-transparent outline-none px-3 py-2 text-[14px]
              placeholder:text-slate-400 dark:placeholder:text-slate-500 text-slate-800 dark:text-slate-100
            "
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-2 p-1 rounded-full hover:bg-blue-100/60 dark:hover:bg-slate-700/60"
              aria-label="Clear search"
              title="Clear"
            >
              <X size={16} className="text-blue-700/80 dark:text-blue-300/80" />
            </button>
          )}
        </div>

        <DensityToggle density={density} onChange={setDensity} />

        {/* Import / Export (icon-only, discretos, a la derecha) */}
        <div className="flex items-center gap-1 ml-1">
          <button
            onClick={handleExportAll}
            className="inline-flex items-center justify-center p-1.5 rounded-full border border-emerald-200 bg-emerald-50/70 text-emerald-700 hover:bg-emerald-100/70 dark:border-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200 dark:hover:bg-emerald-900/60 transition"
            title="Export all notes"
            aria-label="Export all notes"
          >
            <Download size={14} />
          </button>
          <button
            onMouseDown={(e) => {
              importModeRef.current = (e.shiftKey || e.altKey) ? "replace" : "merge";
            }}
            onClick={() => importRef.current?.click()}
            className="inline-flex items-center justify-center p-1.5 rounded-full border border-violet-200 bg-violet-50/70 text-violet-700 hover:bg-violet-100/70 dark:border-violet-700 dark:bg-violet-900/40 dark:text-violet-200 dark:hover:bg-violet-900/60 transition"
            title="Import notes (JSON) — Click: Merge • Shift/Alt+Click: Replace"
            aria-label="Import notes"
          >
            <Upload size={14} />
          </button>
          <input
            ref={importRef}
            type="file"
            accept="application/json"
            onChange={onPickImportFile}
            className="hidden"
          />
        </div>
      </div>

      {/* Sin resultados */}
      {Object.keys(groupedFiltered).length === 0 && (
        <div className="text-center text-gray-400 dark:text-gray-500">
          No hay notas que coincidan.
        </div>
      )}

      {/* === Mes actual === */}
      {Object.keys(currentMonthDaysMap).length > 0 && (
        <div className="mb-6 space-y-3">
          {currentMonthSortedDays.map((dayKey) => {
            const notesList = currentMonthDaysMap[dayKey] || [];
            const sortedNotes = [...notesList].sort(
              (a, b) =>
                parseDate(getCreated(b)).getTime() -
                parseDate(getCreated(a)).getTime()
            );
            const isDayCollapsed = !!collapsedDays?.[currentMonthKey]?.[dayKey];

            return (
              <div
                key={dayKey}
                className="rounded-xl bg-white/80 dark:bg-slate-900/60 border border-blue-100/50 dark:border-slate-700 shadow overflow-hidden"
              >
                {/* Encabezado de Día */}
                <button
                  onClick={() => toggleDay(currentMonthKey, dayKey)}
                  className={`flex w-full items-center justify-between px-3 ${
                    dense ? "py-1.5" : "py-2"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Chevron open={!isDayCollapsed} />
                    <span
                      className={`font-semibold text-blue-700 dark:text-blue-300 ${
                        dense ? "text-sm" : "text-base"
                      }`}
                    >
                      {formatDay(dayKey)}
                    </span>
                  </div>
                </button>

                {/* Contenido del día */}
                {!isDayCollapsed && (
                  <div className="border-t border-blue-100/40 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-950/30 px-3 py-2">
                    <ul className="space-y-2">
                      {sortedNotes.map((n) => {
                        const selected = selectedNote?.id === n.id;
                        return (
                          <NoteCard
                            key={n.id}
                            n={n}
                            selected={selected}
                            dense={dense}
                            setSelectedNote={setSelectedNote}
                            onOpenView={onOpenView}
                          />
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* === Meses anteriores === */}
      {Object.keys(groupedFiltered)
        .sort((a, b) => b.localeCompare(a))
        .filter((k) => k !== currentMonthKey)
        .map((monthKey) => {
          const daysMap = groupedFiltered[monthKey] || {};
          const sortedDays = Object.keys(daysMap).sort((a, b) =>
            b.localeCompare(a)
          );
          const isMonthCollapsed = !!collapsedMonths[monthKey];

          return (
            <div
              key={monthKey}
              className="mb-5 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-blue-100/50 dark:border-slate-700 shadow overflow-hidden"
            >
              {/* Encabezado de Mes */}
              <button
                onClick={() => toggleMonth(monthKey)}
                className={`flex w-full items-center justify-between px-3 ${
                  dense ? "py-1.5" : "py-2"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Chevron open={!isMonthCollapsed} />
                  <span
                    className={`font-bold text-blue-700 dark:text-blue-300 ${
                      dense ? "text-base" : "text-lg"
                    }`}
                  >
                    {formatMonth(monthKey)}
                  </span>
                </div>
              </button>

              {/* Días del mes */}
              {!isMonthCollapsed && (
                <div className="border-t border-blue-100/40 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950/30 px-2 py-2">
                  <div className="space-y-3">
                    {sortedDays.map((dayKey) => {
                      const notesList = daysMap[dayKey] || {};
                      const dayNotes = Array.isArray(notesList) ? notesList : [];
                      const sortedNotes = [...dayNotes].sort(
                        (a, b) =>
                          parseDate(getCreated(b)).getTime() -
                          parseDate(getCreated(a)).getTime()
                      );
                      const isDayCollapsed = !!collapsedDays?.[monthKey]?.[dayKey];

                      return (
                        <div
                          key={dayKey}
                          className="rounded-xl bg-white/80 dark:bg-slate-900/60 border border-blue-100/50 dark:border-slate-700 shadow overflow-hidden"
                        >
                          {/* Encabezado de Día */}
                          <button
                            onClick={() => toggleDay(monthKey, dayKey)}
                            className={`flex w-full items-center justify-between px-3 ${
                              dense ? "py-1.5" : "py-2"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <Chevron open={!isDayCollapsed} />
                              <span
                                className={`font-semibold text-blue-700 dark:text-blue-300 ${
                                  dense ? "text-sm" : "text-base"
                                }`}
                              >
                                {formatDay(dayKey)}
                              </span>
                            </div>
                          </button>

                          {/* Notas del día */}
                          {!isDayCollapsed && (
                            <div className="border-t border-blue-100/40 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-950/30 px-3 py-2">
                              <ul className="space-y-2">
                                {sortedNotes.map((n) => {
                                  const selected = selectedNote?.id === n.id;
                                  return (
                                    <NoteCard
                                      key={n.id}
                                      n={n}
                                      selected={selected}
                                      dense={dense}
                                      setSelectedNote={setSelectedNote}
                                      onOpenView={onOpenView}
                                    />
                                  );
                                })}
                              </ul>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
    </div>
  );
}
