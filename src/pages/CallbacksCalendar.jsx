// src/pages/CallbacksCalendar.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import Header from "../ui/Header";
import { getNotes } from "../db/notes";
import { pickScheduleToShow, parseMetaFromText, getService, getWorkflow } from "../history/history";

import {
  CalendarDays,
  CalendarRange,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";
import ModalFull from "../modals/ModalFull";

/* ===== Helpers ===== */
function fmtShort(d) {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
}
function startOfDay(d) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
function endOfDay(d)   { const x = new Date(d); x.setHours(23,59,59,999); return x; }
function startOfWeek(d){ const x = new Date(d); const day=(x.getDay()+6)%7; x.setDate(x.getDate()-day); x.setHours(0,0,0,0); return x; }
function endOfWeek(d)  { const s=startOfWeek(d); const e=new Date(s); e.setDate(e.getDate()+6); e.setHours(23,59,59,999); return e; }
function startOfMonth(d){ const x=new Date(d.getFullYear(), d.getMonth(), 1); x.setHours(0,0,0,0); return x; }
function endOfMonth(d)  { const x=new Date(d.getFullYear(), d.getMonth()+1, 0); x.setHours(23,59,59,999); return x; }
function addDays(d,n)  { const x=new Date(d); x.setDate(x.getDate()+n); return x; }
function addWeeks(d,n) { return addDays(d, n*7); }
function addMonths(d,n){ const x=new Date(d); x.setMonth(x.getMonth()+n); return x; }

/* ================== TIME ================== */
function parseTimeToHoursMinutes(s="") {
  const head = s.split("-")[0]?.trim() || s.trim();
  const m = head.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return {h:9,mn:0};
  return {h: parseInt(m[1],10), mn: parseInt(m[2],10)};
}

// Normaliza “08:00-9:00” → “08:00 - 09:00”; o “08:00” → “08:00”
function formatSlotLabel(slot = "", fallbackDate) {
  const raw = String(slot || "").trim();
  if (!raw) {
    if (fallbackDate instanceof Date && !isNaN(fallbackDate)) {
      const hh = String(fallbackDate.getHours()).padStart(2, "0");
      const mm = String(fallbackDate.getMinutes()).padStart(2, "0");
      return `${hh}:${mm}`;
    }
    return "";
  }
  const [a, b] = raw.split("-").map(s => s?.trim()).filter(Boolean);
  const pad = (t="") => {
    const m = t.match(/^(\d{1,2})(?::(\d{2}))?$/);
    if (!m) return t;
    const hh = String(parseInt(m[1] || "0", 10)).padStart(2, "0");
    const mm = String(parseInt(m[2] || "0") || 0).toString().padStart(2, "0");
    return `${hh}:${mm}`;
  };
  if (a && b) return `${pad(a)} - ${pad(b)}`;
  return pad(a || raw);
}

/* ================== DATE (ROBUST ES) ================== */
const ES_MONTHS = {
  "enero":0,"ene":0,
  "febrero":1,"feb":1,
  "marzo":2,"mar":2,
  "abril":3,"abr":3,
  "mayo":4,"may":4,
  "junio":5,"jun":5,
  "julio":6,"jul":6,
  "agosto":7,"ago":7,
  "septiembre":8,"setiembre":8,"sep":8,"set":8,
  "octubre":9,"oct":9,
  "noviembre":10,"nov":10,
  "diciembre":11,"dic":11,
};
const ES_WEEKDAYS = ["lunes","martes","miercoles","miércoles","jueves","viernes","sabado","sábado","domingo","lun","mar","mie","mié","jue","vie","sab","sáb","dom"];

function parseLocalFlexibleDate(str="") {
  const s0 = String(str || "").trim();
  if (!s0) return null;

  let s = s0.replace(/[,]/g," ").replace(/\s+/g," ").trim().toLowerCase();

  const EN_WEEKDAYS = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday","mon","tue","wed","thu","thur","thurs","fri","sat","sun"];
  const ALL_WEEKDAYS = new Set([...ES_WEEKDAYS, ...EN_WEEKDAYS]);
  const tokens = s.split(" ");
  if (tokens.length > 1 && ALL_WEEKDAYS.has(tokens[0])) {
    tokens.shift();
    s = tokens.join(" ");
  }

  { // YYYY-MM-DD
    const m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
    if (m) return new Date(+m[1], +m[2]-1, +m[3]);
  }
  { // DD-MM-YYYY
    const m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (m) return new Date(+m[3], +m[2]-1, +m[1]);
  }
  { // D/M sin año
    const m = s.match(/^(\d{1,2})[-/](\d{1,2})$/);
    if (m) return adjustYearForward(new Date(new Date().getFullYear(), +m[2]-1, +m[1]));
  }
  { // 19 de junio (opcional año)
    const m = s.match(/^(\d{1,2})\s+(?:de\s+)?([a-záéíóúñ]+)\s*(?:de\s+)?(\d{4})?$/i);
    if (m) {
      const d = +m[1];
      const moName = normalizeEs(m[2]);
      const y = m[3] ? +m[3] : new Date().getFullYear();
      const mo = ES_MONTHS[moName];
      if (mo != null) return adjustYearForward(new Date(y, mo, d));
    }
  }
  { // 19 jun (opcional año)
    const m = s.match(/^(\d{1,2})\s+([a-záéíóúñ]+)\s*(\d{4})?$/i);
    if (m) {
      const d = +m[1];
      const moName = normalizeEs(m[2]);
      const y = m[3] ? +m[3] : new Date().getFullYear();
      const mo = ES_MONTHS[moName];
      if (mo != null) return adjustYearForward(new Date(y, mo, d));
    }
  }
  { // Inglés que Date entiende
    const probe = new Date(s0);
    if (!isNaN(probe)) return new Date(probe.getFullYear(), probe.getMonth(), probe.getDate());
  }
  { // 19-06-25 -> 2025
    const m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2})$/);
    if (m) return new Date(2000 + (+m[3]), +m[2]-1, +m[1]);
  }
  return null;
}
function normalizeEs(monthStr="") {
  return monthStr
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z]/g,"")
    .toLowerCase();
}
function adjustYearForward(dt) {
  const now = new Date();
  const diffDays = Math.floor((startOfDay(dt) - startOfDay(now)) / (1000*60*60*24));
  if (diffDays < -180) {
    return new Date(dt.getFullYear()+1, dt.getMonth(), dt.getDate());
  }
  return dt;
}

/** buildDate: arma fecha local (Y/M/D) + hora:minuto desde el slot */
function buildDate(dStr="", tStr="") {
  if (!dStr && !tStr) return null;
  const base = parseLocalFlexibleDate(dStr) || null;
  if (!base) return null;
  const {h, mn} = parseTimeToHoursMinutes(tStr || "");
  return new Date(base.getFullYear(), base.getMonth(), base.getDate(), h, mn, 0, 0);
}

/* ========== Lectores de datos en texto ========== */
function readLabelFromText(note, label) {
  const txt = String(note?.text || "");
  const re = new RegExp(`^\\s*${label}\\s*:\\s*(.+)$`, "mi");
  const m = txt.match(re);
  return m ? m[1].trim() : "";
}
function readName(note) {
  const fromText = readLabelFromText(note, "NAME");
  if (fromText) return fromText;
  const fromObj = note?.customer?.name;
  if (fromObj && String(fromObj).trim()) return String(fromObj).trim();
  return "";
}
function readCidCbr(note) {
  const cidText = readLabelFromText(note, "CID");
  const cbrText = readLabelFromText(note, "CBR");
  const cid = cidText || (note?.customer?.cid ? String(note.customer.cid).trim() : "");
  const cbr = cbrText || (note?.customer?.cbr ? String(note.customer.cbr).trim() : "");
  return { cid, cbr };
}
function readServiceWorkflow(note) {
  return {
    service: getService(note) || "",
    workflow: getWorkflow(note) || ""
  };
}

/* ===== Persistencia (localStorage) ===== */
const STORAGE_KEY = "callbacks_done_v1";
function loadDoneMap() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const obj = JSON.parse(raw);
    return obj && typeof obj === "object" ? obj : {};
  } catch {
    return {};
  }
}
function saveDoneMap(map) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(map)); } catch {}
}
function hashStr(s="") {
  let h = 5381; for (let i=0;i<s.length;i++) h = ((h<<5)+h) + s.charCodeAt(i);
  return (h>>>0).toString(36);
}
function makeCallbackKey(note, sch) {
  const baseId = note?.id ? String(note.id) : `tx-${hashStr(String(note?.text||""))}`;
  return `${baseId}::${String(sch?.d||"")}:${String(sch?.t||"")}`;
}

/* ===== Alertas: estado por callback ===== */
const ALERTS_STORAGE_KEY = "callbacks_alert_state_v1";
function loadAlertState() {
  try {
    const raw = localStorage.getItem(ALERTS_STORAGE_KEY);
    if (!raw) return {};
    const obj = JSON.parse(raw);
    return obj && typeof obj === "object" ? obj : {};
  } catch {
    return {};
  }
}
function saveAlertState(map) {
  try { localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(map)); } catch {}
}

/* ===== Events ===== */
function toFollowUpEvents(notes=[]) {
  const evs = [];
  for (const n of notes) {
    const sch = pickScheduleToShow(n) || {};
    if ((sch.label || "").toUpperCase() !== "FOLLOW UP") continue;
    const when = buildDate(sch.d || "", sch.t || "");
    if (!when) continue;
    evs.push({
      id: n.id || Math.random().toString(36).slice(2),
      storageKey: makeCallbackKey(n, sch),
      when,
      dateStr: sch.d || "",
      timeStr: sch.t || "",
      title: "Follow Up Call",
      note: n,
    });
  }
  evs.sort((a,b)=>a.when-b.when);
  return evs;
}

/* ===== UI Helpers ===== */
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

function EventItem({ ev, onClick, done=false, onToggle }) {
  const timeLabel = formatSlotLabel(ev.timeStr, ev.when);
  const name = readName(ev.note) || "Cliente";
  const { cid, cbr } = readCidCbr(ev.note);
  const { service, workflow } = readServiceWorkflow(ev.note);
  return (
    <div
      onClick={onClick}
      className={`flex cursor-pointer items-start justify-between rounded-lg border px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700/30 ${
        done
          ? "bg-green-50 dark:bg-green-900/30 border-green-400 dark:border-green-500"
          : "border-slate-200 dark:border-slate-700"
      }`}
    >
      <div className="flex flex-col">
        <span className="font-medium">
          {timeLabel ? `${timeLabel} - ${name}` : name}
        </span>
        <span className="text-xs opacity-70">
          <strong>CID:</strong> {cid || "—"} |{" "}
          <strong>CBR:</strong> {cbr || "—"} |{" "}
          <strong>SERVICE:</strong> {service || "—"} |{" "}
          <strong>WORKFLOW:</strong> {workflow || "—"}
        </span>
      </div>
      {/* Botón checkmark persistente */}
      <button
        onClick={(e)=>{ e.stopPropagation(); onToggle?.(); }}
        className={`ml-3 flex h-6 w-6 items-center justify-center rounded-full border text-xs transition ${
          done
            ? "border-green-500 bg-green-500 text-white"
            : "border-slate-300 hover:border-green-500 hover:text-green-600 dark:border-slate-500"
        }`}
        title={done ? "Callback completado" : "Marcar como completado"}
      >
        {done ? "✓" : ""}
      </button>
    </div>
  );
}

/* ===== Reminder Toasts UI ===== */
function ReminderToasts({ reminders, onOpen, onDone, onSnooze, onClose }) {
  if (!reminders?.length) return null;
  return (
    <div className="fixed bottom-4 right-4 z-[60] flex w-[320px] flex-col gap-3">
      {reminders.map(({ ev, priority, timeLabel }) => {
        const name = readName(ev.note) || "Cliente";
        const { cid, cbr } = readCidCbr(ev.note);
        const { service, workflow } = readServiceWorkflow(ev.note);
        const border =
          priority === "due"
            ? "border-amber-400"
            : "border-blue-400";
        const bg =
          priority === "due"
            ? "bg-amber-50 dark:bg-amber-900/20"
            : "bg-blue-50 dark:bg-blue-900/20";
        return (
          <div
            key={ev.storageKey}
            className={`rounded-xl border p-3 shadow ${bg} ${border} dark:border-slate-600`}
          >
            <div className="mb-1 text-xs uppercase tracking-wide opacity-70">
              {priority === "due" ? "Venciendo" : "Próximo"} · {timeLabel}
            </div>
            <div className="text-sm font-semibold">{name}</div>
            <div className="mb-2 text-xs opacity-80">
              <strong>CID:</strong> {cid || "—"} · <strong>CBR:</strong> {cbr || "—"}
              <br />
              <strong>Service:</strong> {service || "—"} · <strong>Workflow:</strong> {workflow || "—"}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={()=>onOpen(ev)}
                className="rounded-lg border px-2 py-1 text-xs hover:bg-white/60 dark:hover:bg-slate-800/60"
              >Abrir</button>
              <button
                onClick={()=>onDone(ev.storageKey)}
                className="rounded-lg border border-green-500 px-2 py-1 text-xs text-green-700 hover:bg-green-100 dark:text-green-300 dark:hover:bg-green-900/30"
              >Done ✓</button>
              <div className="ml-auto flex gap-1">
                <button onClick={()=>onSnooze(ev.storageKey, 5)}  className="rounded px-2 py-1 text-xs hover:bg-white/60 dark:hover:bg-slate-800/60">+5</button>
                <button onClick={()=>onSnooze(ev.storageKey, 10)} className="rounded px-2 py-1 text-xs hover:bg-white/60 dark:hover:bg-slate-800/60">+10</button>
                <button onClick={()=>onSnooze(ev.storageKey, 15)} className="rounded px-2 py-1 text-xs hover:bg-white/60 dark:hover:bg-slate-800/60">+15</button>
                <button onClick={()=>onClose(ev.storageKey)} className="rounded px-2 py-1 text-xs hover:bg-white/60 dark:hover:bg-slate-800/60">Cerrar</button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ===== Page ===== */
export default function CallbacksCalendar() {
  const [notes, setNotes] = useState([]);
  const [mode, setMode] = useState("week"); // semana por defecto
  const [baseDate, setBaseDate] = useState(() => new Date());
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [doneMap, setDoneMap] = useState({});
  const [alertMap, setAlertMap] = useState({});
  const [reminders, setReminders] = useState([]);

  // ===== Carga de datos principales
  useEffect(() => { (async()=>{ setNotes(await getNotes()); })(); }, []);
  useEffect(() => { setDoneMap(loadDoneMap()); }, []);
  useEffect(() => { setAlertMap(loadAlertState()); }, []);

  // ===== Done helpers
  const isDone = (key) => !!doneMap[key];
  const toggleDone = (key) => {
    setDoneMap(prev => {
      const next = { ...prev, [key]: !prev[key] };
      saveDoneMap(next);
      return next;
    });
  };

  // ===== Alert helpers
  const markShown = (key) => {
    setAlertMap(prev => {
      const next = { ...prev, [key]: { ...(prev[key]||{}), lastShownAt: Date.now() } };
      saveAlertState(next);
      return next;
    });
  };
  const snooze = (key, minutes) => {
    const until = Date.now() + minutes*60*1000;
    setAlertMap(prev => {
      const next = { ...prev, [key]: { ...(prev[key]||{}), snoozeUntil: until } };
      saveAlertState(next);
      return next;
    });
    setReminders(rs => rs.filter(r => r.ev.storageKey !== key));
  };
  const dismiss = (key) => {
    setAlertMap(prev => {
      const next = { ...prev, [key]: { ...(prev[key]||{}), dismissedAt: Date.now() } };
      saveAlertState(next);
      return next;
    });
    setReminders(rs => rs.filter(r => r.ev.storageKey !== key));
  };

  const allEvents = useMemo(() => toFollowUpEvents(notes), [notes]);
  const filtered = useMemo(()=>{
    const q=query.trim().toLowerCase();
    if(!q) return allEvents;
    return allEvents.filter(ev=>{
      const name = readName(ev.note);
      const { cid } = readCidCbr(ev.note);
      const hay=[
        ev.title,
        ev.note?.text,
        name,
        cid
      ].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q);
    });
  },[allEvents,query]);

  const range = useMemo(()=>{
    const d=new Date(baseDate);
    if(mode==="day")   return {start:startOfDay(d), end:endOfDay(d)};
    if(mode==="week")  return {start:startOfWeek(d), end:endOfWeek(d)};
    return {start:startOfMonth(d), end:endOfMonth(d)};
  },[mode,baseDate]);
  const eventsInRange = filtered.filter(ev=>ev.when>=range.start && ev.when<=range.end);
  const rangeLabel = `${fmtShort(range.start)} - ${fmtShort(range.end)}`;

  function goPrev(){ if(mode==="day") setBaseDate(d=>addDays(d,-1)); else if(mode==="week") setBaseDate(d=>addWeeks(d,-1)); else setBaseDate(d=>addMonths(d,-1)); }
  function goNext(){ if(mode==="day") setBaseDate(d=>addDays(d,1)); else if(mode==="week") setBaseDate(d=>addWeeks(d,1)); else setBaseDate(d=>addMonths(d,1)); }

  /* === Reminder Engine (cada 15 minutos) === */
  const CHECK_INTERVAL_MS = 15 * 60 * 1000; // 15 min
  const WINDOW_PRE_MS  = 10 * 60 * 1000;    // mostrar desde 10 min antes
  const WINDOW_POST_MS =  5 * 60 * 1000;    // y hasta 5 min después
  const THROTTLE_MS    = 60 * 1000;         // si se mostró hace < 60s, no repetir
  const DISMISS_COOLDOWN_MS = 2 * 60 * 1000;// si se cerró hace < 120s, no repetir

  const checkRef = useRef(null);

  useEffect(() => {
    const evaluate = () => {
      const now = Date.now();
      const nextReminders = [];

      for (const ev of allEvents) {
        const key = ev.storageKey;
        if (!key) continue;
        if (isDone(key)) continue;

        const ts = ev.when.getTime();
        const inPre  = (ts - WINDOW_PRE_MS) <= now && now < ts;           // próximo
        const inPost = ts <= now && now <= (ts + WINDOW_POST_MS);         // venciendo
        if (!inPre && !inPost) continue;

        const st = alertMap[key] || {};
        if (st.snoozeUntil && now < st.snoozeUntil) continue;
        if (st.dismissedAt && (now - st.dismissedAt) < DISMISS_COOLDOWN_MS) continue;
        if (st.lastShownAt && (now - st.lastShownAt) < THROTTLE_MS) continue;

        nextReminders.push({
          ev,
          priority: inPost ? "due" : "upcoming",
          timeLabel: formatSlotLabel(ev.timeStr, ev.when),
        });
      }

      if (nextReminders.length) {
        // Marcar como mostrado ahora (anti-spam suave)
        setAlertMap(prev => {
          const nowMap = { ...prev };
          const nowTs = Date.now();
          for (const r of nextReminders) {
            const key = r.ev.storageKey;
            nowMap[key] = { ...(nowMap[key]||{}), lastShownAt: nowTs };
          }
          saveAlertState(nowMap);
          return nowMap;
        });
      }
      setReminders(nextReminders);
    };

    // Ejecuta inmediatamente al montar / cuando cambian dependencias
    evaluate();

    // Intervalo cada 15 minutos
    if (checkRef.current) clearInterval(checkRef.current);
    checkRef.current = setInterval(evaluate, CHECK_INTERVAL_MS);

    return () => {
      if (checkRef.current) clearInterval(checkRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allEvents, alertMap, doneMap]); // dependencias: cambios en eventos/estado alertas/done

  /* === Renders === */
  function WeekBoard() {
    const start=startOfWeek(baseDate);
    const cols=Array.from({length:7},(_,i)=>addDays(start,i));
    return (
      <div className="flex flex-col gap-3">
        {cols.map((d,i)=>{
          const s=startOfDay(d), e=endOfDay(d);
          const evs=eventsInRange.filter(ev=>ev.when>=s&&ev.when<=e);
          return (
            <div key={i} className="rounded-lg border border-slate-200 p-2 dark:border-slate-700">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-xs font-medium opacity-70">
                  {d.toLocaleDateString("es-GT",{weekday:"short",day:"numeric",month:"short"})}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                {evs.length===0 && <div className="text-xs opacity-50">Sin callbacks</div>}
                {evs.map(ev=>(
                  <EventItem
                    key={ev.id}
                    ev={ev}
                    done={isDone(ev.storageKey)}
                    onToggle={()=>toggleDone(ev.storageKey)}
                    onClick={()=>setSelected(ev)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  }
  function DayAgenda(){
    const s=startOfDay(baseDate), e=endOfDay(baseDate);
    const list=eventsInRange.filter(ev=>ev.when>=s&&ev.when<=e);
    return (
      <div className="flex flex-col gap-2">
        {list.length===0 && <div className="rounded-lg border border-slate-200 p-3 text-sm opacity-60 dark:border-slate-700">No hay callbacks</div>}
        {list.map(ev=>(
          <EventItem
            key={ev.id}
            ev={ev}
            done={isDone(ev.storageKey)}
            onToggle={()=>toggleDone(ev.storageKey)}
            onClick={()=>setSelected(ev)}
          />
        ))}
      </div>
    );
  }
  function MonthGrid(){
    const start=startOfWeek(startOfMonth(baseDate));
    const end=endOfWeek(endOfMonth(baseDate));
    const days=[]; for(let d=new Date(start); d<=end; d=addDays(d,1)) days.push(new Date(d));
    const keyLocal = (d) => {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth()+1).padStart(2,"0");
      const dd = String(d.getDate()).padStart(2,"0");
      return `${yyyy}-${mm}-${dd}`;
    };
    const map=new Map();
    for(const ev of eventsInRange){
      const k=keyLocal(ev.when);
      if(!map.has(k)) map.set(k,[]);
      map.get(k).push(ev);
    }
    return (
      <div className="grid grid-cols-7 gap-2">
        {days.map((d,i)=>{
          const key=keyLocal(d); const evs=map.get(key)||[];
          const inMonth=d.getMonth()===baseDate.getMonth();
          return (
            <div key={i} className={`min-h[88px] rounded-lg border p-2 text-xs ${inMonth?"bg-white dark:bg-slate-800":"bg-slate-50 dark:bg-slate-900/40"}`}>
              <div className="mb-1 flex items-center justify-between">
                <span className="font-medium">{d.getDate()}</span>
                {evs.length>0 && <span className="text-[10px] text-blue-600">{evs.length} cb</span>}
              </div>
              {evs.slice(0,2).map(ev=>{
                const slot = formatSlotLabel(ev.timeStr, ev.when);
                const { cid } = readCidCbr(ev.note);
                const done = isDone(ev.storageKey);
                return (
                  <div key={ev.id} className="flex items-center justify-between gap-1 text-[11px]">
                    <div
                      className={`truncate ${done ? "text-green-700 dark:text-green-300" : ""}`}
                      onClick={()=>setSelected(ev)}
                      title={slot}
                    >
                      {slot} {cid}
                    </div>
                    <button
                      onClick={(e)=>{ e.stopPropagation(); toggleDone(ev.storageKey); }}
                      className={`ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full border text-[10px] ${
                        done ? "border-green-500 bg-green-500 text-white" : "border-slate-300 dark:border-slate-500"
                      }`}
                      title={done ? "Callback completado" : "Marcar como completado"}
                    >
                      {done ? "✓" : ""}
                    </button>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Header
        title="Callbacks (Follow Ups)"
        rightContent={
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
              <input
                value={query}
                onChange={(e)=>setQuery(e.target.value)}
                placeholder="Buscar…"
                className="h-9 w-56 rounded-lg border border-slate-300 bg-white pl-8 pr-3 text-sm outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
          </div>
        }
      />

      <main className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <Section
          title="Período"
          right={
            <div className="flex flex-wrap items-center justify-between gap-2">
              {/* Botones de vista */}
              <div className="flex items-center gap-2">
                <button onClick={()=>setMode("day")} className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm ${mode==="day"?"bg-blue-600 text-white":"bg-white dark:bg-slate-700 dark:text-slate-100"}`}>
                  <CalendarDays className="h-4 w-4" /><span>Día</span>
                </button>
                <button onClick={()=>setMode("week")} className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm ${mode==="week"?"bg-blue-600 text-white":"bg-white dark:bg-slate-700 dark:text-slate-100"}`}>
                  <CalendarRange className="h-4 w-4" /><span>Semana</span>
                </button>
                <button onClick={()=>setMode("month")} className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm ${mode==="month"?"bg-blue-600 text-white":"bg-white dark:bg-slate-700 dark:text-slate-100"}`}>
                  <Calendar className="h-4 w-4" /><span>Mes</span>
                </button>
              </div>

              {/* Flechas + rango */}
              <div className="flex items-center gap-2">
                <button onClick={goPrev} className="inline-flex items-center rounded-lg border px-2 py-1.5 text-sm dark:border-slate-700">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div className="min-w-[160px] text-center text-sm font-medium">{rangeLabel}</div>
                <button onClick={goNext} className="inline-flex items-center rounded-lg border px-2 py-1.5 text-sm dark:border-slate-700">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          }
        >
          {mode==="week" && <WeekBoard />}
          {mode==="day" && <DayAgenda />}
          {mode==="month" && <MonthGrid />}
        </Section>

        <div className="mt-4 text-sm opacity-70">
          {eventsInRange.length} callback{eventsInRange.length===1?"": "s"} en el período seleccionado.
        </div>
      </main>

      {/* Toasts de recordatorio (in-app) */}
      <ReminderToasts
        reminders={reminders}
        onOpen={(ev)=>setSelected(ev)}
        onDone={(key)=>toggleDone(key)}
        onSnooze={(key, mins)=>snooze(key, mins)}
        onClose={(key)=>dismiss(key)}
      />

      {/* Modal con detalle de nota */}
      <ModalFull
        open={!!selected}
        onClose={()=>setSelected(null)}
        note={selected?.note?.text || ""}
      />
    </div>
  );
}
