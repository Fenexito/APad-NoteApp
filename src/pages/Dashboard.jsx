// src/pages/Dashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  CalendarRange,
  Calendar,
  Search,
  CheckCircle2,
  Truck,
  ClipboardList,
  AlertTriangle,
  Ticket,
  PhoneCall,
} from "lucide-react";
import Header from "../ui/Header";
import { getNotes } from "../db/notes";
import { useCallCounter } from "../db/useCallCounter";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

/** ================== Config ================== **/
const GT_TZ = "America/Guatemala";
const COLORS = {
  RESOLVED: "#22c55e",   // verde
  DISPATCH: "#7c3aed",   // morado
  FOLLOW_UP: "#ef4444",  // rojo
  BOSR_OR_NC: "#3b82f6", // azul
  OTHER: "#64748b",
};
const WEEKDAY_SHORT = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const DEBUG_DASHBOARD = false;

/** ================== Fecha ================== **/
function parseDateFlexible(v) {
  if (v instanceof Date) return new Date(v.getTime());
  if (typeof v === "number") {
    const ms = v < 1e12 ? v * 1000 : v;
    const d = new Date(ms);
    return isNaN(d) ? null : d;
  }
  if (v && typeof v === "object") {
    if (typeof v.seconds === "number") return new Date(v.seconds * 1000);
    if (typeof v._seconds === "number") return new Date(v._seconds * 1000);
  }
  if (typeof v === "string") {
    let s = v.trim();
    if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}(:\d{2})?$/.test(s)) s = s.replace(" ", "T");
    s = s.replace(/\//g, "-");
    const d1 = new Date(s);
    if (!isNaN(d1)) return d1;
    if (/^\d{4}-\d{2}-\d{2}t\d{2}:\d{2}(:\d{2})?$/i.test(s)) {
      const d2 = new Date(s + "Z");
      if (!isNaN(d2)) return d2;
    }
  }
  return null;
}
function parseDateSafe(v) { const d = parseDateFlexible(v); return d ?? null; }
function startOfDay(d) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
function endOfDay(d) { const x = new Date(d); x.setHours(23,59,59,999); return x; }
function startOfWeek(d) { const x = new Date(d); const day=(x.getDay()+6)%7; x.setDate(x.getDate()-day); x.setHours(0,0,0,0); return x; }
function endOfWeek(d) { const s=startOfWeek(d); const e=new Date(s); e.setDate(e.getDate()+6); e.setHours(23,59,59,999); return e; }
function startOfMonth(d) { const x=new Date(d.getFullYear(), d.getMonth(), 1); x.setHours(0,0,0,0); return x; }
function endOfMonth(d) { const x=new Date(d.getFullYear(), d.getMonth()+1, 0); x.setHours(23,59,59,999); return x; }
function addDays(d, n) { const x=new Date(d); x.setDate(x.getDate()+n); return x; }
function addWeeks(d, n) { return addDays(d, n*7); }
function addMonths(d, n) { const x=new Date(d); x.setMonth(x.getMonth()+n); return x; }

/** ================== Helpers Interacciones (store local) ================== **/
const TYPES_MANUAL = ["callback", "quick", "transfer", "others"]; // Outbound/Quick/Transfer/Others
function dateFromKey(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function sumManual(a = {}, b = {}) {
  const out = {};
  TYPES_MANUAL.forEach((t) => (out[t] = (a[t] || 0) + (b[t] || 0)));
  return out;
}
function countsForRangeManual(start, end, today, history) {
  const zero = { callback: 0, quick: 0, transfer: 0, others: 0 };
  let acc = { ...zero };
  for (const [k, day] of Object.entries(history || {})) {
    const d = dateFromKey(k);
    if (d >= start && d <= end) acc = sumManual(acc, day.counts || zero);
  }
  const tdk = today?.date;
  if (tdk) {
    const td = dateFromKey(tdk);
    if (td >= start && td <= end) acc = sumManual(acc, today.counts || zero);
  }
  // filtrar solo manuales
  return {
    callback: acc.callback || 0,
    quick: acc.quick || 0,
    transfer: acc.transfer || 0,
    others: acc.others || 0,
  };
}
function totalAll(manu, inbound) {
  return (inbound || 0) + (manu.callback || 0) + (manu.quick || 0) + (manu.transfer || 0) + (manu.others || 0);
}

/** ================== Extracción RESOLUTION ================== **/
// (mantenemos exactamente igual que antes)
function stripDiacritics(s = "") { try { return s.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); } catch { return s; } }
function canonicalizeResolutionOption(s) {
  let t = String(s || "").toLowerCase();
  t = stripDiacritics(t);
  t = t.replace(/[–—]/g, "-");
  t = t.replace(/\s*\|\s*/g, "|");
  t = t.replace(/\s+/g, " ").trim();
  t = t.replace(/\s*\(.*?\)\s*$/g, "");
  t = t.replace(/\bfollow\s*up\b/g, "follow up");
  t = t.replace(/\btech\s*booked\b/g, "tech booked");
  t = t.replace(/\bleft\s*vm\b/g, "left vm");
  t = t.replace(/\bcontact(ing)? core support\b/g, "contacting core support");
  t = t.replace(/\beoc( verified)?\b/g, "eoc");
  return t;
}
function getStringFromUnknown(v) {
  if (typeof v === "string") return v.trim();
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) {
    const firstStr = v.find((e) => typeof e === "string" && e.trim());
    if (firstStr) return firstStr.trim();
    const firstObjStr = v.find((e) => e && typeof e === "object" && (e.value || e.label || e.text));
    if (firstObjStr) return getStringFromUnknown(firstObjStr);
  }
  if (v && typeof v === "object") {
    if (v.value) return getStringFromUnknown(v.value);
    if (v.label) return getStringFromUnknown(v.label);
    if (v.text) return getStringFromUnknown(v.text);
  }
  return "";
}
function deepFindByResolutionKey(obj, _visited = new WeakSet(), depth = 0) {
  if (!obj || typeof obj !== "object" || _visited.has(obj) || depth > 8) return "";
  _visited.add(obj);
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const found = deepFindByResolutionKey(item, _visited, depth + 1);
      if (found) return found;
    }
    return "";
  }
  for (const [k, v] of Object.entries(obj)) {
    const key = String(k).toLowerCase();
    if (/(^|_|\.)resol/.test(key) || key.includes("resolution") || key.includes("resolved")) {
      const s = getStringFromUnknown(v);
      if (s) return s;
      if (v && typeof v === "object") {
        const inner = getStringFromUnknown(v);
        if (inner) return inner;
      }
    }
  }
  for (const v of Object.values(obj)) {
    if (v && typeof v === "object") {
      const found = deepFindByResolutionKey(v, _visited, depth + 1);
      if (found) return found;
    }
  }
  return "";
}
function collectAllStrings(obj, limit = 1000) {
  const out = [];
  const stack = [obj];
  const visited = new WeakSet();
  while (stack.length && out.length < limit) {
    const curr = stack.pop();
    if (!curr || typeof curr !== "object" || visited.has(curr)) continue;
    visited.add(curr);
    if (Array.isArray(curr)) {
      for (const v of curr) {
        if (typeof v === "string") out.push(v);
        else if (v && typeof v === "object") stack.push(v);
        else if (typeof v === "number" || typeof v === "boolean") out.push(String(v));
      }
    } else {
      for (const [k, v] of Object.entries(curr)) {
        out.push(String(k));
        if (typeof v === "string") out.push(v);
        else if (typeof v === "number" || typeof v === "boolean") out.push(String(v));
        else if (v && typeof v === "object") stack.push(v);
      }
    }
  }
  return out;
}
function extractResolutionOption(note) {
  const direct = [
    note?.RESOLUTION, note?.resolution, note?.RESOLVED, note?.resolved,
    note?.finalResolution, note?.form?.RESOLUTION, note?.form?.resolution,
    note?.meta?.RESOLUTION, note?.meta?.resolution, note?.data?.RESOLUTION, note?.data?.resolution,
  ].find((x) => x !== undefined && x !== null);
  if (direct) {
    const s = getStringFromUnknown(direct);
    if (s) return s;
  }
  const viaKey = deepFindByResolutionKey(note);
  if (viaKey) return viaKey;
  const strings = collectAllStrings(note, 1500);
  strings.sort((a, b) => a.length - b.length);
  for (const s of strings) {
    const canon = canonicalizeResolutionOption(s);
    if (!canon) continue;
    const bucket = bucketFromCanonical(canon);
    if (bucket !== "OTHER") return s;
  }
  return "";
}
function bucketFromCanonical(c) {
  const canon = (c || "").replace(/[–—]/g, "-").replace(/\s*\|\s*/g, "|").trim();
  if (canon.startsWith("yes|eoc") || /\beoc\b/.test(canon)) return "RESOLVED";
  if (canon.includes("bosr created") || canon.includes("nc ticket created") || /\b(bosr|nc ticket)\b/.test(canon)) return "BOSR_OR_NC";
  if (canon.includes("tech booked")) return "DISPATCH";
  if (
    canon.startsWith("no|follow up required") ||
    canon.includes("follow up required|set scb with Set SCB with Scheduler") ||
    canon.includes("contacting core support") ||
    canon.includes("call disconnected|left vm") ||
    canon.startsWith("no|cx needs to be transferred") ||
    canon.includes("follow up") ||
    canon.startsWith("cx ask for a manager|unable to de escalate|escalate to emt")
  ) return "FOLLOW_UP";
  const EXACT = {
    "yes|eoc": "RESOLVED",
    "no|tech booked": "DISPATCH",
    "no|bosr created": "BOSR_OR_NC",
    "no|nc ticket created": "BOSR_OR_NC",
    "no|follow up required": "FOLLOW_UP",
    "no|follow up required|set scb with scheduler": "FOLLOW_UP",
    "no|contacting core support": "FOLLOW_UP",
    "no|call disconnected|left vm": "FOLLOW_UP",
    "cx ask for a manager|unable to de escalate|escalate to emt": "FOLLOW_UP",
    "no|cx needs to be transferred": "FOLLOW_UP",
  };
  if (EXACT[canon]) return EXACT[canon];
  return "OTHER";
}
function normalizeResolutionBucket(note) {
  const opt = extractResolutionOption(note);
  const key = canonicalizeResolutionOption(opt);
  return bucketFromCanonical(key);
}
function resolutionDisplay(note) {
  const raw = extractResolutionOption(note);
  const canon = canonicalizeResolutionOption(raw);
  const bucket = bucketFromCanonical(canon);
  if (bucket === "RESOLVED") return "YES | EOC";
  if (bucket === "DISPATCH") return "No | Tech Booked";
  if (bucket === "BOSR_OR_NC") {
    if (canon.includes("bosr created")) return "No | BOSR Created";
    if (canon.includes("nc ticket created")) return "No | NC Ticket Created";
    return "BOSR / NC Ticket";
  }
  if (bucket === "FOLLOW_UP") {
    if (canon.startsWith("no|follow up required|set scb with scheduler")) return "No | Follow Up Required | Set SCB with Scheduler";
    if (canon.startsWith("no|follow up required")) return "No | Follow Up Required";
    if (canon.includes("contacting core support")) return "No | Contacting CORE SUPPORT";
    if (canon.includes("call disconnected|left vm")) return "No | Call Disconnected | Left VM";
    if (canon.startsWith("no|cx needs to be transferred")) return "No | Cx needs to be transferred";
    if (canon.startsWith("cx ask for a manager|unable to de escalate|escalate to emt")) return "Cx ask for a Manager | Unable to de escalate | Escalate to EMT";
    return "Follow Up";
  }
  if (raw) {
    const short = raw.length > 80 ? raw.slice(0, 77) + "…" : raw;
    return short;
  }
  return "(sin valor)";
}

/** ========= NUEVO: helpers de ticket (excluir "0"/"000...") ========= **/
function normalizeTicket(raw) {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (!digits) return null;           // vacío, null, undefined, espacios
  if (/^0+$/.test(digits)) return null; // solo ceros → NO ticket
  return digits;
}
function pickTicket(note, key) {
  // prioriza data.resolution[key], luego campo plano en la raíz
  const resVal = note?.data?.resolution?.[key];
  const flatVal = note?.[key];
  return normalizeTicket(resVal ?? flatVal);
}
function hasTicket(note) {
  // Cuenta como "con ticket" si CUALQUIERA de estos es un número válido
  return Boolean(
    pickTicket(note, "ticketFinal") ||
    pickTicket(note, "bosrTicket") ||
    pickTicket(note, "ncTicket")   ||
    pickTicket(note, "emtTicket")
  );
}

/** ================== UI ================== **/
function Section({ title, right, children }) {
  return (
    <section className="rounded-2xl bg-white p-4 shadow dark:bg-gray-800">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
        {right && <div className="min-w-0">{right}</div>}
      </div>
      {children}
    </section>
  );
}
function KpiCard({ title, value, subtitle, color = "slate", icon: Icon }) {
  const tone = {
    slate:  "border-slate-300/40 bg-white text-slate-700 dark:bg-slate-800 dark:text-slate-200",
    green:  "border-green-500/30 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300",
    purple: "border-violet-500/30 bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-300",
    blue:   "border-blue-500/30 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300",
    red:    "border-red-500/30 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300",
  }[color];

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${tone}`}>
      <div className="flex items-center gap-3">
        {Icon && <Icon className="h-5 w-5 opacity-80" />}
        <div className="text-sm font-medium uppercase tracking-wide">{title}</div>
      </div>
      <div className="mt-2 text-3xl font-semibold">{value}</div>
      {subtitle && <div className="mt-1 text-xs opacity-70">{subtitle}</div>}
    </div>
  );
}

/** ================== Dashboard ================== **/
export default function Dashboard() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState("day"); // 'day' | 'week' | 'month'
  const [baseDate, setBaseDate] = useState(() => new Date());

  // Call counter store
  const { today, history } = useCallCounter();

  // Carga notas (IndexedDB)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const list = (typeof getNotes === "function" ? await getNotes() : []) || [];
        const normalized = list.map((n) => {
          const parsed = parseDateSafe(
            n?.createdAt || n?.created || n?.createdAt || n?.timestamp || n?.ts
          );
          return { ...n, createdAt: parsed ?? null };
        });
        if (!alive) return;
        setNotes(normalized);
        if (DEBUG_DASHBOARD) {
          const ok = normalized.filter((x) => x.createdAt instanceof Date).length;
          const bad = normalized.length - ok;
          console.log("[Dashboard] Notas:", normalized.length, "OK:", ok, "Sin fecha:", bad);
        }
      } catch (err) {
        console.error("[Dashboard] No se pudieron cargar notas:", err);
        if (!alive) return;
        setNotes([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // Rangos
  const range = useMemo(() => {
    const d = new Date(baseDate);
    if (mode === "day") return { start: startOfDay(d), end: endOfDay(d) };
    if (mode === "week") return { start: startOfWeek(d), end: endOfWeek(d) };
    return { start: startOfMonth(d), end: endOfMonth(d) };
  }, [mode, baseDate]);

  const rangeLabel = useMemo(
    () =>
      `${String(range.start.getDate()).padStart(2, "0")}/${String(range.start.getMonth() + 1).padStart(2, "0")}/${String(range.start.getFullYear()).slice(-2)} - ${String(range.end.getDate()).padStart(2, "0")}/${String(range.end.getMonth() + 1).padStart(2, "0")}/${String(range.end.getFullYear()).slice(-2)}`,
    [range]
  );

  // Notas dentro del rango + búsqueda
  const periodNotes = useMemo(() => {
    const dated = notes.filter((n) => n.createdAt instanceof Date && !isNaN(n.createdAt));
    const inRange = dated.filter((n) => n.createdAt >= range.start && n.createdAt <= range.end);
    const q = query.trim().toLowerCase();
    if (!q) return inRange;
    return (inRange.length ? inRange : dated).filter((n) => {
      const haystack = [
        n?.title, n?.text, n?.body, n?.id, n?.RESOLUTION, n?.resolution, n?.finalNote,
      ].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [notes, range, query]);

  // ===== Interacciones del período (Troubleshoot desde notas; manuales desde store)
  const interactionsCurrent = useMemo(() => {
    // inbound (TS) = # de notas en el rango
    const inboundTS = periodNotes.length;

    // manuales desde store
    const manu = countsForRangeManual(range.start, range.end, today, history);

    return {
      counts: {
        troubleshoot: inboundTS,
        callback: manu.callback,
        quick: manu.quick,
        transfer: manu.transfer,
        others: manu.others,
      },
      total: totalAll(manu, inboundTS),
    };
  }, [periodNotes, range, today, history]);

  // KPIs de Resolution del período (mantenemos igual)
  const resolutionCounts = useMemo(() => {
    const acc = { RESOLVED: 0, DISPATCH: 0, FOLLOW_UP: 0, BOSR_OR_NC: 0, OTHER: 0 };
    periodNotes.forEach((n) => {
      const bucket = normalizeResolutionBucket(n);
      acc[bucket] = (acc[bucket] || 0) + 1;
    });
    return acc;
  }, [periodNotes]);

  const ticketsCount = useMemo(() => periodNotes.filter(hasTicket).length, [periodNotes]);

  // Datos para gráfico principal (semana/mes)
  const mainChartData = useMemo(() => {
    if (mode === "week") {
      const days = Array.from({ length: 7 }, (_, i) => ({ label: WEEKDAY_SHORT[i], count: 0 }));
      const weekStart = startOfWeek(baseDate);
      periodNotes.forEach((n) => {
        const diff = Math.floor((startOfDay(n.createdAt) - weekStart) / (24 * 3600 * 1000));
        if (diff >= 0 && diff < 7) days[diff].count += 1;
      });
      return days;
    }
    if (mode === "month") {
      const eom = endOfMonth(baseDate);
      let cursor = startOfWeek(startOfMonth(baseDate));
      const weeks = [];
      while (cursor <= eom) {
        weeks.push(new Date(cursor));
        cursor = addWeeks(cursor, 1);
      }
      const map = new Map(weeks.map((w, i) => [w.getTime(), { label: `Sem ${i + 1}`, count: 0 }]));
      periodNotes.forEach((n) => {
        const ws = startOfWeek(n.createdAt).getTime();
        if (map.has(ws)) map.get(ws).count += 1;
      });
      return Array.from(map.values());
    }
    return [];
  }, [mode, periodNotes, baseDate]);

  const pieData = useMemo(
    () => [
      { name: "Resolved",        value: resolutionCounts.RESOLVED,    color: COLORS.RESOLVED },
      { name: "Dispatch",        value: resolutionCounts.DISPATCH,    color: COLORS.DISPATCH },
      { name: "BOSR / NC Ticket",value: resolutionCounts.BOSR_OR_NC,  color: COLORS.BOSR_OR_NC },
      { name: "Follow Up",       value: resolutionCounts.FOLLOW_UP,   color: COLORS.FOLLOW_UP },
      { name: "Other",           value: resolutionCounts.OTHER,       color: COLORS.OTHER },
    ],
    [resolutionCounts]
  );

  const recent = useMemo(() => {
    const copy = [...periodNotes];
    copy.sort((a, b) => b.createdAt - a.createdAt);
    return copy.slice(0, 10);
  }, [periodNotes]);

  // Navegación de rango
  function goPrev() {
    if (mode === "day") setBaseDate((d) => addDays(d, -1));
    else if (mode === "week") setBaseDate((d) => addWeeks(d, -1));
    else setBaseDate((d) => addMonths(d, -1));
  }
  function goNext() {
    if (mode === "day") setBaseDate((d) => addDays(d, 1));
    else if (mode === "week") setBaseDate((d) => addWeeks(d, 1));
    else setBaseDate((d) => addMonths(d, 1));
  }
  function resetToday() { setBaseDate(new Date()); }

  const interactionsTitle = useMemo(() => {
    if (mode === "day") return "Interacciones — Día";
    if (mode === "week") return "Interacciones — Semana";
    return "Interacciones — Mes";
  }, [mode]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header fijo */}
      <Header
        title="Dashboard"
        rightContent={
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar en notas..."
                className="h-9 w-56 rounded-lg border border-slate-300 bg-white pl-8 pr-3 text-sm outline-none ring-0 placeholder:text-slate-400 focus:border-blue-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
          </div>
        }
      />

      <main className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        {/* ===== Barra de período (filtros) ===== */}
        <Section
          title="Período"
          right={
            <div className="grid w-full grid-cols-2 items-center gap-3">
              {/* Izquierda: modo Día/Semana/Mes */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMode("day")}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm ${mode === "day" ? "bg-blue-600 text-white" : "bg-white text-slate-700 dark:bg-slate-700 dark:text-slate-100"}`}
                  title="Día"
                >
                  <CalendarDays className="h-4 w-4" />
                  <span>Día</span>
                </button>
                <button
                  onClick={() => setMode("week")}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm ${mode === "week" ? "bg-blue-600 text-white" : "bg-white text-slate-700 dark:bg-slate-700 dark:text-slate-100"}`}
                  title="Semana"
                >
                  <CalendarRange className="h-4 w-4" />
                  <span>Semana</span>
                </button>
                <button
                  onClick={() => setMode("month")}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm ${mode === "month" ? "bg-blue-600 text-white" : "bg-white text-slate-700 dark:bg-slate-700 dark:text-slate-100"}`}
                  title="Mes"
                >
                  <Calendar className="h-4 w-4" />
                  <span>Mes</span>
                </button>
              </div>

              {/* Derecha: navegación del rango */}
              <div className="flex items-center justify-end gap-2 pl-2 md:pl-3">
                <button
                  onClick={goPrev}
                  className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white p-1 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  title="Anterior"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div
                  className="w-56 truncate text-center text-sm font-medium tabular-nums text-slate-700 dark:text-slate-100"
                  role="button"
                  onClick={resetToday}
                  title="Ir a hoy"
                >
                  {rangeLabel}
                </div>
                <button
                  onClick={goNext}
                  className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white p-1 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  title="Siguiente"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          }
        />

        {/* ===== Interacciones (compacto, según filtro actual) ===== */}
        <section className="mt-3 rounded-2xl bg-white p-3 shadow dark:bg-slate-800">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <KpiCard
              title={interactionsTitle}
              value={interactionsCurrent.total}
              subtitle={mode === "day" ? "Total de llamadas del día" : mode === "week" ? "Total de llamadas de la semana" : "Total de llamadas del mes"}
              color="blue"
              icon={PhoneCall}
            />
          </div>

          {/* Tabla mini por tipo (solo el período actual) */}
          <div className="mt-2 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 rounded-xl border border-slate-200 text-[12px] dark:divide-slate-700 dark:border-slate-700">
              <thead className="bg-slate-50/60 dark:bg-slate-800/60">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">
                    Tipo
                  </th>
                  <th className="px-3 py-2 text-center font-semibold text-slate-600 dark:text-slate-300">
                    Cantidad
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {[
                  ["Inbound Call (TS)", "troubleshoot"], // notas reales del período
                  ["Outbound Call (TS)", "callback"],
                  ["Quick Call / Information (No TS)", "quick"],
                  ["Transfer Call (No TS)", "transfer"],
                  ["Other Interactions", "others"],
                ].map(([label, key]) => (
                  <tr key={key}>
                    <td className="px-3 py-2">{label}</td>
                    <td className="px-3 py-2 text-center font-medium">
                      {interactionsCurrent.counts[key] || 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Indicador de carga */}
        {loading && (
          <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
            <div className="h-24 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-700" />
            <div className="h-24 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-700" />
            <div className="h-24 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-700" />
            <div className="h-24 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-700" />
          </div>
        )}

        {/* KPIs de Resolution */}
        {!loading && (
          <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
            <KpiCard
              title="Resolved"
              value={resolutionCounts.RESOLVED}
              subtitle={rangeLabel}
              color="green"
              icon={CheckCircle2}
            />
            <KpiCard
              title="Dispatch"
              value={resolutionCounts.DISPATCH}
              subtitle={rangeLabel}
              color="purple"
              icon={Truck}
            />
            <KpiCard
              title="BOSR / NC Ticket"
              value={resolutionCounts.BOSR_OR_NC}
              subtitle={rangeLabel}
              color="blue"
              icon={AlertTriangle}
            />
            <KpiCard
              title="Follow Up"
              value={resolutionCounts.FOLLOW_UP}
              subtitle={rangeLabel}
              color="red"
              icon={ClipboardList}
            />
          </div>
        )}

        {/* Notas con Ticket (período) */}
        {!loading && (
          <div className="mt-4 grid grid-cols-1">
            <Section
              title="Notas con Ticket"
              right={<span className="text-xs text-slate-500">Del período seleccionado</span>}
            >
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900/20">
                <div className="flex items-center gap-3">
                  <Ticket className="h-6 w-6 text-slate-500" />
                  <div>
                    <div className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      Total en el período
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{rangeLabel}</div>
                  </div>
                </div>
                <div className="text-3xl font-semibold text-slate-800 dark:text-slate-100">
                  {ticketsCount}
                </div>
              </div>
            </Section>
          </div>
        )}

        {/* Gráficos (Semana: por día, Mes: por semana). No se muestra en "Día". */}
        {!loading && (mode === "week" || mode === "month") && (
          <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-5">
            <Section
              title={mode === "week" ? "Actividad por día (semana)" : "Actividad por semana (mes)"}
              right={<span className="text-xs text-slate-500">Zona horaria: {GT_TZ}</span>}
            >
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={mainChartData}>
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="count" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Section>

            <Section title="Distribución por Resolution (período)">
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Legend />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Section>
          </div>
        )}

        {/* Lista de recientes del período */}
        {!loading && (
          <div className="mt-4">
            <Section title="Notas del período (recientes)">
              <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                  <thead className="bg-slate-50/50 dark:bg-slate-800/50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                        Fecha
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                        Título
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                        Resolution
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                        Ticket
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-700 dark:bg-slate-900/30">
                    {recent.map((n) => {
                      const d = n.createdAt;
                      const bucket = normalizeResolutionBucket(n);
                      const label = resolutionDisplay(n);
                      return (
                        <tr key={n.id || `${d?.getTime?.() ?? Math.random()}`}>
                          <td className="px-3 py-2 text-sm text-slate-700 dark:text-slate-200">
                            {d instanceof Date && !isNaN(d)
                              ? new Intl.DateTimeFormat("es-GT", {
                                  dateStyle: "medium",
                                  timeStyle: "short",
                                  timeZone: GT_TZ,
                                }).format(d)
                              : "—"}
                          </td>
                          <td className="px-3 py-2 text-sm text-slate-800 dark:text-slate-100">
                            {n.title || n.subject || "(sin título)"}
                          </td>
                          <td className="px-3 py-2 text-sm">
                            <span
                              className={`inline-flex items-center gap-1 font-medium ${
                                bucket === "RESOLVED"
                                  ? "text-green-600"
                                  : bucket === "DISPATCH"
                                  ? "text-violet-600"
                                  : bucket === "FOLLOW_UP"
                                  ? "text-red-600"
                                  : bucket === "BOSR_OR_NC"
                                  ? "text-blue-600"
                                  : "text-slate-600"
                              }`}
                            >
                              {label}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-sm">
                            {hasTicket(n) ? (
                              <span className="inline-flex items-center gap-1 text-blue-700 dark:text-blue-300">
                                <Ticket className="h-4 w-4" />
                                Sí
                              </span>
                            ) : (
                              <span className="text-slate-500">No</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {!recent.length && (
                      <tr>
                        <td className="px-3 py-6 text-center text-sm text-slate-500 dark:text-slate-400" colSpan={4}>
                          Sin notas en este período.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Section>
          </div>
        )}
      </main>
    </div>
  );
}
