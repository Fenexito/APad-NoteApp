/* ------------------------------------------------------------------------
   SECTION 3 – Diagnostics & AWA (estilo tipo Equipment Panel)
   ------------------------------------------------------------------------ */
import { useState, useMemo, useEffect, useRef } from "react";
import {
  X, Hash, ChevronUp, ChevronDown, Trash2, Plug, Wifi,
  CheckCircle2, Info, AlertTriangle, AlertOctagon,
  Smartphone, RotateCcw, PlusCircle, GraduationCap
} from "lucide-react";
import useFormStore from "../../db/useFormStore";
import FormSection from "../../ui/FormSection";
import CollapsibleChecklist from "../../ui/CollapsibleChecklist";

/* ───────── AWA Alert catalog ─────────
   (Con severidad mapeada vía el color. Se actualizaron según tu instrucción) */
const ALL_ALERTS = [
  { key: "na",            label: "N/A",                                         color: "bg-gray-400" },
  { key: "noErrors",      label: "No Errors / Alerts Found on AWA",             color: "bg-green-600" },

  { key: "noAwa",         label: "AWA not available / nonexistent",             color: "bg-gray-500" },
  { key: "notManaged",    label: "Unable to get AWA. Modem not managed by HDM", color: "bg-gray-500" },
  { key: "ontUnranged",   label: "Unable to get AWA. ONT Not ranged",           color: "bg-gray-500" },
  { key: "thirdPartyGw",  label: "Unable to get AWA. Cx using third party Gateway", color: "bg-gray-500" },
  { key: "noSync",        label: "Unable to get AWA. No sync on Modem",         color: "bg-gray-500" }, // ➜ GRAY

  { key: "bbDownCong",    label: "Broadband DOWNSTREAM congestion (>80% plan speed)", color: "bg-red-600" },   // ➜ RED
  { key: "bbUpCong",      label: "Broadband UPSTREAM congestion (>80% plan speed)",   color: "bg-red-600" },   // ➜ RED
  { key: "avgWifiSlow",   label: "Average Wi-Fi speed slower than Broadband (many devices)", color: "bg-red-600" }, // ➜ RED

  { key: "slowOne",       label: "Occasional Slowspeed in ONE device",          color: "bg-amber-500" },
  { key: "slowSome",      label: "Occasional Slowspeed in some devices",        color: "bg-red-600" },  // ➜ RED
  { key: "discOne",       label: "Occasional Disconnections in ONE device",     color: "bg-amber-500" },
  { key: "discSome",      label: "Occasional Disconnections in some devices",   color: "bg-red-600" },  // ➜ RED

  { key: "legacyMode",    label: "Devices operating in legacy Wi-Fi Mode",      color: "bg-gray-400" },
  { key: "interferenceAutoCh", label: "Interference problems detected. Set Gateway to WiFi auto channel and rescan", color: "bg-gray-500" },
  { key: "gatewayReboot", label: "Multiple gateway/modem reboots",              color: "bg-gray-500" }, // ➜ GRAY
  { key: "pwdProblems",   label: "Password problems",                           color: "bg-gray-500" }, // ➜ GRAY
  { key: "lowMemory",     label: "Low-memory issues detected in the router",    color: "bg-red-600" },  // ➜ RED
  { key: "manyDevices",   label: "High number of devices connected detected",   color: "bg-red-600" },  // ➜ RED
  { key: "pppDown",       label: "Gateway disconnecting from provider network (PPP down)", color: "bg-amber-500" }, // ➜ AMBER
];

/* Derivar severidad desde la clase de color */
const getSeverity = (color) => {
  if (!color) return "gray";
  if (color.startsWith("bg-red")) return "red";
  if (color.startsWith("bg-amber")) return "amber";
  if (color.startsWith("bg-green")) return "green";
  return "gray";
};
const ENR_ALERTS = ALL_ALERTS.map((a) => ({ ...a, sev: getSeverity(a.color) }));

/* Orden fijo tipo Equipment Panel (píldoras) */
const SEV_ORDER = ["green", "gray", "amber", "red"];
const SEV_META = {
  green: { label: "GREEN", dot: "bg-green-600",  ring: "ring-green-300",  border: "border-green-600",  bg: "from-green-50 to-white dark:from-green-900/20 dark:to-transparent", Icon: CheckCircle2 },
  gray:  { label: "GRAY",  dot: "bg-gray-500",   ring: "ring-gray-300",   border: "border-gray-500",   bg: "from-gray-50 to-white dark:from-gray-900/20 dark:to-transparent",   Icon: Info },
  amber: { label: "AMBER", dot: "bg-amber-500",  ring: "ring-amber-300",  border: "border-amber-500",  bg: "from-amber-50 to-white dark:from-amber-900/20 dark:to-transparent", Icon: AlertTriangle },
  red:   { label: "RED",   dot: "bg-red-600",    ring: "ring-red-300",    border: "border-red-600",    bg: "from-red-50 to-white dark:from-red-900/20 dark:to-transparent",    Icon: AlertOctagon },
};

/* Macros rápidos para AWA STEPS */
const AWA_STEP_MACROS = [
  { k: "education",  label: "🎓 Education",   text: "- Educate cx about the alerts\n- Suggest disconnect some devices from the network\n- Suggest to increase Speed Plan\n" },
  { k: "tvs",        label: "📱 TVS",           text: "- Install TVS App and run speedtests\n- Run Network Scan\n- Perform Deadspots detector\n" },
  { k: "wifiCheck",  label: "📶 Wi-Fi",           text: "- Check WiFi coverage\n- Change 2.4Ghz / 5Ghz channels\n- Congested Network\n" },
  { k: "powerCycle", label: "🔁 Reboot",     text: "- Perform a Sequential Reboot\n- Reboot cx device\n" },
  { k: "hardReset",  label: "♻️ FR",      text: "- Perform a Factory Reset\n" },
  { k: "wifiPlus",   label: "➕ Wi-Fi +",      text: "- Offer Wifi Plus\n- Cx refuse offer for now\n" },
  { k: "noTs",       label: "🚫 NO TS",     text: "- Advice cx about alerts\n- Cx not affected by alerts now\n- No TS performed\n" ,
  },
];

export default function Section3({
  open,
  onToggle,
  // Indicador de estado (se pinta en el header)
  statusComplete,
  statusIndicatorTitle,
  statusIndicatorClasses,
  // Borde friendly cuando la sección está cerrada
  closedBorderClass,
  // Control del Mandate (Excellence)
  mandateCompleted = false,
  mandateDefaultOpen = true,
  mandateResetSignal = 0,
}) {
  /* Store */
  const {
    data: { alerts = [], issue = {} },
    toggleAlert,
    clearAlerts,
    updateSection,
    updateSpeedTest,
   addSpeedTest,
  } = useFormStore((s) => ({
    data: s.data,
    toggleAlert: s.toggleAlert,
    clearAlerts: s.clearAlerts,
    updateSection: s.updateSection,
    updateSpeedTest: s.updateSpeedTest,
   addSpeedTest: s.addSpeedTest,
  }));

  // Validation profile (strict|express)
  const validationProfile = useFormStore((s) => s.data?.ui?.validationProfile || "strict");
  const isExpress = validationProfile === "express";

  const svc = issue.service ?? "";
  // Ocultar SpeedTest cuando no hay internet (ONT Not Ranged / No Sync)
  const noInternetWF = ["ONT Not Ranged", "No Sync"].includes((issue.workflow || ""));
  const showAWA = svc === "HighSpeed" || (svc || "").startsWith("Optik");

  const resetCount = useFormStore((s) => s.resetCount);

  /* UI local */
  const [openAWA, setOpenAWA] = useState(true);
  const [openSPD, setOpenSPD] = useState(true);

  // Grupo activo (píldoras) → estilo Equipment Panel
  const [activeSev, setActiveSev] = useState("green");

  // Validaciones
  const awaMissing = !isExpress && showAWA && alerts.length === 0;
  // stepsMissing se recalcula más abajo en base a 'hideSteps'
  const tvsMissing = !isExpress && !issue.tvsUsed;
  const tvsKeyMiss = !isExpress && issue.tvsUsed === "Yes" && !(issue.tvsKey || "").trim();

  // Helpers
  const autoGrow = (e) => {
    e.target.style.height = "auto";
    e.target.style.height = e.target.scrollHeight + "px";
  };
  const stepsAreaRef = useRef(null);
  const appendAwaStep = (txt) => {
    const cur = issue.awaSteps || "";
    const sep = cur && !cur.endsWith("\n") ? "\n" : "";
    const next = cur + sep + txt;
    updateSection("issue", { awaSteps: next });
    setTimeout(() => {
      if (stepsAreaRef.current) {
        stepsAreaRef.current.style.height = "auto";
        stepsAreaRef.current.style.height = stepsAreaRef.current.scrollHeight + "px";
      }
    }, 0);
  };

  // Limpieza numérica
  const cleanInt = (v) => (v || "").replace(/\D/g, "");
  const cleanDec = (v) => {
    v = (v || "").replace(",", ".").replace(/[^0-9.]/g, "");
    const firstDot = v.indexOf(".");
    if (firstDot !== -1) v = v.slice(0, firstDot + 1) + v.slice(firstDot + 1).replace(/\./g, "");
    if (v.startsWith(".")) v = "0" + v;
    return v;
  };

  // Limpiar diagnóstico sección 3
  const clearDiag = () => {
    clearAlerts();
    updateSection("issue", {
      awaSteps: "",
      spTests: [
        { stage: "Before", down: "", up: "", wired: false },
        { stage: "After",  down: "", up: "", wired: false },
      ],
      devicesActive: "",
      devicesTotal: "",
      tvsUsed: "",
      tvsKey: "",
    });
  };

  // Conteos por severidad + items del grupo activo
  const countsBySev = useMemo(() => {
    const map = { green: 0, gray: 0, amber: 0, red: 0 };
    for (const k of alerts) {
      const a = ENR_ALERTS.find((x) => x.key === k);
      if (a) map[a.sev] = (map[a.sev] || 0) + 1;
    }
    return map;
  }, [alerts]);

  // Severidades seleccionadas y regla para ocultar AWA STEPS:
  // Se ocultará si hay al menos una selección y NINGUNA es AMBER/RED.
  const selectionSevSet = useMemo(() => {
    const s = new Set();
    for (const k of alerts) {
      const a = ENR_ALERTS.find((x) => x.key === k);
      if (a) s.add(a.sev);
    }
    return s;
  }, [alerts]);
  const hideSteps =
    selectionSevSet.size > 0 && !selectionSevSet.has("red") && !selectionSevSet.has("amber");

  // Reglas de obligatoriedad: solo pedimos AWA STEPS si hay AMBER/RED
  const stepsMissing = !isExpress && showAWA && !hideSteps && !(issue.awaSteps || "").trim();

  // ✅ Auto-colapso cuando todos los requeridos de la sección están completos
  const requiredMissing = useMemo(
    () => ({ awaMissing, stepsMissing, tvsMissing, tvsKeyMiss }),
    [awaMissing, stepsMissing, tvsMissing, tvsKeyMiss]
  );
  const allRequiredComplete = useMemo(
    () => Object.values(requiredMissing).every((v) => !v),
    [requiredMissing]
  );
  const collapseTimerRef = useRef(null);
  const [autoClosing, setAutoClosing] = useState(false);
  const [autoCollapseDisabled, setAutoCollapseDisabled] = useState(false);
  const animTimerRef = useRef(null);
  const prevCompleteRef = useRef(allRequiredComplete);

  // Re-habilitar auto-colapso cuando pase de incompleta→completa tras edición
  useEffect(() => {
    const wasComplete = prevCompleteRef.current;
    if (!wasComplete && allRequiredComplete) {
      setAutoCollapseDisabled(false);
    }
    prevCompleteRef.current = allRequiredComplete;
  }, [allRequiredComplete]);

  useEffect(() => {
    if (collapseTimerRef.current) {
      clearTimeout(collapseTimerRef.current);
      collapseTimerRef.current = null;
    }
    if (open && allRequiredComplete && !autoCollapseDisabled) {
      collapseTimerRef.current = setTimeout(() => {
        setAutoClosing(true);
        animTimerRef.current = setTimeout(() => {
          if (open) onToggle();
          setAutoClosing(false);
        }, 300);
      }, 1000); // 1s
    } else { setAutoClosing(false); }
    return () => {
      if (collapseTimerRef.current) {
        clearTimeout(collapseTimerRef.current);
        collapseTimerRef.current = null;
      }
      if (animTimerRef.current) {
        clearTimeout(animTimerRef.current);
        animTimerRef.current = null;
      }
    };
  }, [open, allRequiredComplete, onToggle]);

  const activeItems = useMemo(
    () => ENR_ALERTS.filter((a) => a.sev === activeSev),
    [activeSev]
  );
  const activeMeta = SEV_META[activeSev];
  const selectedInActive = activeItems.filter((a) => alerts.includes(a.key)).length;

  // Acciones del grupo activo
  const selectActiveGroup = () => {
    activeItems.forEach((a) => {
      if (!alerts.includes(a.key)) toggleAlert(a.key);
    });
  };
  const clearActiveGroup = () => {
    activeItems.forEach((a) => {
      if (alerts.includes(a.key)) toggleAlert(a.key);
    });
  };

  return (
    <FormSection className={!open ? closedBorderClass : ""}>
      {/* Header sección */}
      <div
        className="mb-1 flex cursor-pointer items-center justify-between"
        onClick={() => {
          if (!open) setAutoCollapseDisabled(true);
          if (collapseTimerRef.current) { clearTimeout(collapseTimerRef.current); collapseTimerRef.current = null; }
          if (animTimerRef.current) { clearTimeout(animTimerRef.current); animTimerRef.current = null; }
          setAutoClosing(false);
          onToggle();
        }}
      >
        <h3 className="flex-1 text-sm font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
          AWA &amp; Diagnostics
        </h3>
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <span
            className={statusIndicatorClasses}
            title={statusComplete ? "Section complete" : "Section incomplete"}
            aria-label={statusComplete ? "Section complete" : "Section incomplete"}
          >
            {statusIndicatorTitle}
          </span>
          <button onClick={clearDiag} className="text-red-500 hover:text-red-700" title="Clear Section 3">
            <Trash2 size={14} />
          </button>
          <button className="text-blue-600 dark:text-blue-400">
            {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {!open ? null : (
        <div
          /* Evita colapsar mientras hay foco dentro de la sección;
             colapsa al salir si ya está completa */
          onFocusCapture={() => setAutoCollapseDisabled(true)}
          onBlurCapture={(e) => {
            const leftSection = !e.currentTarget.contains(e.relatedTarget);
            if (leftSection) {
              setAutoCollapseDisabled(false);
              if (allRequiredComplete) {
                setAutoClosing(true);
                setTimeout(() => { if (open) onToggle(); setAutoClosing(false); }, 300);
              }
            }
          }}
          className={autoClosing
          ? "transform-gpu origin-top scale-y-0 opacity-0 transition-all duration-300 ease-out overflow-hidden"
          : "transform-gpu origin-top scale-y-100 opacity-100 transition-all duration-300 ease-out"}
        >
          {/* ███ AWA Alerts – estilo tipo Equipment Panel (píldoras + panel) ███ */}
          {showAWA && (
            <div className={`mt-2 rounded border ${awaMissing ? "border-red-500 dark:border-red-500" : "border-gray-300"}`}>
              {/* Título + contador global (header clickeable) */}
              <div
                className="flex items-center justify-between p-2 cursor-pointer select-none"
                onClick={() => setOpenAWA(!openAWA)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setOpenAWA(!openAWA);
                  }
                }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold uppercase text-purple-600">
                    AWA Alerts {awaMissing && <span className="text-red-600">*</span>}
                  </span>
                  {!!alerts.length && (
                    <span className="rounded-full bg-purple-100 px-2 py-[2px] text-[10px] font-semibold text-purple-700">
                      {alerts.length} selected
                    </span>
                  )}
                </div>

                <button className="text-blue-600 dark:text-blue-400">
                  {openAWA ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              </div>

              {/* Mantener montado y solo ocultar/mostrar por CSS */}
              <div className={`space-y-2 p-3 pt-0 ${openAWA ? "" : "hidden"}`}>
                  {/* Tarjetas de grupos (1 sola fila, centradas y responsivas) */}
                  <div className="flex justify-center">
                    <div className="grid grid-cols-4 gap-1 w-full">
                      {SEV_ORDER.map((sev) => {
                        const meta = SEV_META[sev];
                        const selected = activeSev === sev;
                        const count = countsBySev[sev] || 0;
                        const Icon = meta.Icon;
                        return (
                          <button
                            key={sev}
                            type="button"
                            onClick={() => setActiveSev(sev)}
                            className={`relative w-full min-w-0 text-left rounded-lg border shadow-sm px-2 py-1 transition bg-white dark:bg-gray-800
                              bg-gradient-to-b ${meta.bg}
                              ${selected ? `${meta.border} ring-1 ${meta.ring}` : "border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"}`}
                            title={meta.label}
                          >
                            <div className="flex items-center gap-2">
                              <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
                              <span className="text-[11px] font-semibold truncate">{meta.label}</span>
                            </div>
                            <div className="mt-0.5 flex items-center gap-1.5">
                              <Icon size={16} className="opacity-80 shrink-0" />
                              <span className="text-[10px] text-gray-600 dark:text-gray-300 truncate">
                                {sev === "green" ? "OK / No Errors"
                                  : sev === "gray" ? "Info / Unavailable"
                                  : sev === "amber" ? "Warnings"
                                  : "Critical"}
                              </span>
                            </div>
                            {!!count && (
                              <span className="absolute right-2 top-2 rounded-full bg-gray-100 px-2 text-[10px] font-semibold text-gray-700 dark:bg-gray-700 dark:text-gray-100">
                                {count}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Acciones del grupo activo */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold">
                        {SEV_META[activeSev].label}
                      </span>
                      {selectedInActive > 0 && (
                        <span className="rounded-full bg-gray-100 px-2 py-[2px] text-[10px] font-semibold text-gray-700 dark:bg-gray-700 dark:text-gray-100">
                          {selectedInActive} selected
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={selectActiveGroup}
                        className="rounded border border-gray-300 px-2 py-0.5 text-[11px] hover:bg-gray-50 dark:bg-gray-800"
                      >
                        Select all
                      </button>
                      <button
                        type="button"
                        onClick={clearActiveGroup}
                        className="rounded border border-gray-300 px-2 py-0.5 text-[11px] hover:bg-gray-50 dark:bg-gray-800"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  {/* Lista del grupo activo */}
                  <div className={`rounded border ${activeMeta.border}`}>
                    <ul className="divide-y divide-gray-100">
                      {activeItems.map((a) => {
                        const checked = alerts.includes(a.key);
                        return (
                          <li
                            key={a.key}
                            className="flex cursor-pointer items-center gap-2 px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                            onClick={() => toggleAlert(a.key)}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleAlert(a.key)}
                              className="h-4 w-4 accent-purple-600"
                              onClick={(e) => e.stopPropagation()}
                            />
                            <span className={`h-3 w-3 rounded-sm ${a.color}`} />
                            <span className="flex-1 text-[12px]">{a.label}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  {/* Acciones globales */}
                  <div className="flex items-center justify-end">
                    <button
                      type="button"
                      onClick={clearAlerts}
                      className="rounded border border-gray-300 px-2 py-0.5 text-[11px] hover:bg-gray-50 dark:bg-gray-800"
                    >
                      Clear All
                    </button>
                  </div>

                  {/* AWA STEPS (con macros) — Se oculta si solo hay selecciones GREEN/GRAY */}
                  {!hideSteps && (
                    <label className="mt-2 flex w-full flex-col gap-0.5 text-[10px] font-semibold uppercase">
                      <span>
                        AWA STEPS {stepsMissing && <span className="text-red-600">*</span>}
                      </span>
                      {/* Botones en UNA FILA (centrados). Si no caben, scroll horizontal */}
                    <div className="w-full overflow-x-auto">
                      <div className="flex flex-nowrap justify-center gap-1 min-w-full px-1 py-1">
                        {AWA_STEP_MACROS.map((m) => {
                          const Icon = m.Icon;
                          return (
                            <button
                              key={m.k}
                              type="button"
                              onClick={() => appendAwaStep(m.text)}
                              className="shrink-0 inline-flex items-center gap-1 rounded border border-gray-300 px-2 py-1 text-[11px] hover:bg-gray-50 dark:bg-gray-800"
                              title={`Insert ${m.label}`}
                            >
                              {Icon ? <Icon size={14} className="opacity-80" /> : null}
                              <span className="whitespace-nowrap">{m.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                      <textarea
                        ref={stepsAreaRef}
                        value={issue.awaSteps || ""}
                        onChange={(e) => updateSection("issue", { awaSteps: e.target.value })}
                        onInput={autoGrow}
                        rows={4}
                        className={`shortkey-enabled form-input resize-none rounded border px-1 py-1 text-[12px] leading-5 dark:bg-gray-800 ${
                          stepsMissing ? "border-red-500 dark:!border-red-500" : "border-gray-300"
                        }`}
                        data-sk-tags="GENERAL, AWA STEPS"
                      />
                    </label>
                  )}
               </div> 
            </div>
          )}

          {/* ███ TVS ███ */}
          <div className="mt-2 grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-0.5 text-[10px] font-semibold uppercase">
              <span>
                TVS {tvsMissing && <span className="text-red-600">*</span>}
              </span>
              <select
                value={issue.tvsUsed || ""}
                onChange={(e) =>
                  updateSection("issue", {
                    tvsUsed: e.target.value,
                    tvsKey: "",
                  })
                }
                className={`form-input rounded border px-1 py-0.5 text-[11px] dark:bg-gray-800 ${
                  tvsMissing ? "border-red-500 dark:!border-red-500" : "border-gray-300"
                }`}
              >
                <option value="">—</option>
                <option>Yes</option>
                <option>No | Offered but Cx refuses</option>
                <option>No | Offered but Cx don't have internet</option>
                <option>No | Offered but Cx don't have a smartphone</option>
                <option>No | Offered but Cx can't open SMS / Link</option>
                <option>No | Cx not at home</option>
                <option>Not needed for this interaction</option>
              </select>
            </label>

            <label className="flex flex-col gap-0.5 text-[10px] font-semibold uppercase">
              <span>
                TVS KEY {issue.tvsUsed === "Yes" && tvsKeyMiss && <span className="text-red-600">*</span>}
              </span>
              <input
                value={issue.tvsKey || ""}
                onChange={(e) => updateSection("issue", { tvsKey: e.target.value })}
                disabled={issue.tvsUsed !== "Yes"}
                className={`form-input rounded border px-1 py-0.5 text-[11px] dark:bg-gray-800 ${
                  issue.tvsUsed === "Yes" && tvsKeyMiss ? "border-red-500 dark:!border-red-500" : "border-gray-300"
                }`}
              />
            </label>
          </div>

          {/* ███ SpeedTest – 2 cards ███ */}
          {svc === "HighSpeed" && !noInternetWF && (
            <div className="mt-3 rounded border">
              <div className="flex cursor-pointer items-center justify-between p-2" onClick={() => setOpenSPD(!openSPD)}>
                <span className="text-[11px] font-semibold uppercase text-green-700">SpeedTest Results</span>
                {openSPD ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </div>

              {openSPD && (
                <div className="space-y-3 p-3">
                  <div className="grid grid-cols-3 gap-3">
                    {/* Tarjetas de speedtests + botón para agregar más */}
                    <div className="col-span-2 flex flex-col gap-2">
                      <div className="grid grid-cols-2 gap-3">
                        {(issue.spTests || [
                          { stage: "Before", down: "", up: "", wired: false },
                          { stage: "After",  down: "", up: "", wired: false },
                        ]).map((t, i) => (
                          <div key={i} className="flex flex-col gap-1 rounded border border-gray-300 p-2">
                            <span className="text-center text-[10px] font-semibold uppercase">
                              {t.stage}
                            </span>
                            <div className="grid grid-cols-5 gap-1">
                              <input
                                placeholder="Down"
                                inputMode="decimal"
                                maxLength={6}
                                value={t.down}
                                pattern="[0-9]*[.,]?[0-9]*"
                                onChange={(e) =>
                                  updateSpeedTest(i, "down", cleanDec(e.target.value))
                                }
                                className="no-spinner col-span-2 form-input rounded border px-1 py-0.5 text-center text-[11px] dark:bg-gray-800 border-gray-300"
                              />
                              <input
                                placeholder="Up"
                                inputMode="decimal"
                                maxLength={6}
                                value={t.up}
                                pattern="[0-9]*[.,]?[0-9]*"
                                onChange={(e) =>
                                  updateSpeedTest(i, "up", cleanDec(e.target.value))
                                }
                                className="no-spinner col-span-2 form-input rounded border px-1 py-0.5 text-center text-[11px] dark:bg-gray-800 border-gray-300"
                              />
                              <button
                                type="button"
                                onClick={() => updateSpeedTest(i, "wired", !t.wired)}
                                className={`flex items-center justify-center rounded px-2 py-0.5 text-[10px] border ${
                                  t.wired
                                    ? "bg-blue-600 text-white border-blue-600"
                                    : "border-gray-300 dark:bg-gray-800"
                                }`}
                                title={t.wired ? "Wired" : "Wi-Fi"}
                              >
                                {t.wired ? <Plug size={14} /> : <Wifi size={14} />}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={addSpeedTest}
                        className="inline-flex items-center gap-1 self-start rounded border border-dashed border-gray-400 px-2 py-0.5 text-[10px] text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:border-gray-500 dark:hover:bg-gray-800/60"
                        title="Add extra speedtest"
                      >
                        <PlusCircle size={12} className="opacity-70" />
                        <span>Add Speedtest</span>
                      </button>
                    </div>

                    {/* Dispositivos */}
                    <div className="flex flex-col items-center gap-2 rounded border border-gray-300 p-2">
                      <span className="text-[10px] font-semibold uppercase">Devices Connected</span>
                      <div className="flex w-full gap-1">
                        <input
                          placeholder="Active"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={3}
                          value={issue.devicesActive || ""}
                          onChange={(e) =>
                            updateSection("issue", { devicesActive: cleanInt(e.target.value) })
                          }
                          className="no-spinner form-input w-full rounded border px-1 py-0.5 text-center text-[11px] dark:bg-gray-800 border-gray-300"
                        />
                        <input
                          placeholder="Total"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={3}
                          value={issue.devicesTotal || ""}
                          onChange={(e) =>
                            updateSection("issue", { devicesTotal: cleanInt(e.target.value) })
                          }
                          className="no-spinner form-input w-full rounded border px-1 py-0.5 text-center text-[11px] dark:bg-gray-800 border-gray-300"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </FormSection>
  );
}
