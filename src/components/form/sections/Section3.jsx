/* ------------------------------------------------------------------------
   SECTION 3 – Diagnostics & AWA
   ------------------------------------------------------------------------ */
import { useState } from "react";
import {
  X, Hash, ChevronUp, ChevronDown, Trash2,
  Plug, Wifi,
} from "lucide-react";
import { useFormStore } from "../../../store/useFormStore";
import FormSection from "../../ui/FormSection";

/* ───────── AWA Alert catalog ───────── */
const ALL_ALERTS = [
  { key: "na",            label: "N/A",                                                            color: "bg-gray-400"  },
  { key: "noErrors",      label: "No Errors / Alerts Found on AWA",                                color: "bg-green-600" },
  { key: "noAwa",         label: "AWA not available / nonexistent",                                color: "bg-gray-500"  },
  { key: "notManaged",    label: "Unable to get AWA. Modem not managed by HDM",                    color: "bg-gray-500"  },
  { key: "ontUnranged",   label: "Unable to get AWA. ONT Not ranged",                              color: "bg-gray-500"  },
  { key: "thirdPartyGw",  label: "Unable to get AWA. Cx using third party Gateway",                color: "bg-gray-500"  },
  { key: "noSync",        label: "Unable to get AWA. No sync on Modem",                            color: "bg-red-600"   },
  { key: "bbDownCong",    label: "Broadband DOWNSTREAM congestion (>80% plan speed)",              color: "bg-amber-500" },
  { key: "bbUpCong",      label: "Broadband UPSTREAM congestion (>80% plan speed)",                color: "bg-amber-500" },
  { key: "avgWifiSlow",   label: "Average Wi-Fi speed slower than Broadband (many devices)",       color: "bg-amber-500" },
  { key: "slowOne",       label: "Occasional Slowspeed in ONE device",                             color: "bg-amber-500" },
  { key: "slowSome",      label: "Occasional Slowspeed in some devices",                           color: "bg-amber-500" },
  { key: "discOne",       label: "Occasional Disconnections in ONE device",                        color: "bg-amber-500" },
  { key: "discSome",      label: "Occasional Disconnections in some devices",                      color: "bg-amber-500" },
  { key: "legacyMode",    label: "Devices operating in legacy Wi-Fi Mode",                         color: "bg-gray-400"  },
  { key: "gatewayReboot", label: "Multiple gateway/modem reboots",                                 color: "bg-red-600"   },
  { key: "pwdProblems",   label: "Password problems",                                              color: "bg-amber-500" },
  { key: "lowMemory",     label: "Low-memory issues detected in the router",                       color: "bg-amber-500" },
  { key: "manyDevices",   label: "High number of devices connected detected",                      color: "bg-amber-500" },
  { key: "pppDown",       label: "Gateway disconnecting from provider network (PPP down)",         color: "bg-red-600"   },
];

/* chip helper */
const chipCls = (active, c) =>
  `truncate flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] border cursor-pointer
   ${active ? `${c} text-white border-transparent` : "border-gray-300 dark:bg-gray-800"}`;

/* ───────── Component ───────── */
export default function Section3() {
  /* store */
  const {
    data: { alerts, issue },
    toggleAlert,
    clearAlerts,
    updateSection,
    updateSpeedTest,
  } = useFormStore((s) => ({
    data: s.data,
    toggleAlert: s.toggleAlert,
    clearAlerts: s.clearAlerts,
    updateSection: s.updateSection,
    updateSpeedTest: s.updateSpeedTest,
  }));

  const svc = issue.service ?? "";
  const showAWA = svc === "HighSpeed" || svc.startsWith("Optik");

  /* local UI */
  const [open, setOpen] = useState(true);
  const [openAWA, setOpenAWA] = useState(true);
  const [openSPD, setOpenSPD] = useState(true);

  /* validation flags */
  const awaMissing = showAWA && alerts.length === 0;
  const stepsMissing = showAWA && !issue.awaSteps.trim();
  const tvsMissing = !issue.tvsUsed;
  const tvsKeyMiss = issue.tvsUsed === "Yes" && !issue.tvsKey.trim();

  /* helpers */
  const autoGrow = (e) => {
    e.target.style.height = "auto";
    e.target.style.height = e.target.scrollHeight + "px";
  };

  const clearDiag = () => {
    clearAlerts();
    updateSection("issue", {
      awaSteps: "",
      spTests: [
        { stage: "Before", down: "", up: "", wired: false },
        { stage: "After", down: "", up: "", wired: false },
      ],
      devicesActive: "",
      devicesTotal: "",
      tvsUsed: "",
      tvsKey: "",
    });
  };

  /* ───────── JSX ───────── */
  return (
    <FormSection>
      {/* header */}
      <div
        className="mb-1 flex cursor-pointer items-center justify-between"
        onClick={() => setOpen(!open)}
      >
        <h3 className="flex-1 text-sm font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
          AWA &amp; Diagnostics
        </h3>
        <div
          className="flex items-center gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={clearDiag}
            className="text-red-500 hover:text-red-700"
          >
            <Trash2 size={14} />
          </button>
          <button className="text-blue-600 dark:text-blue-400">
            {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {!open ? null : (
        <>
          {/* ███ AWA Alerts ███ */}
          {showAWA && (
            <>
              <div
                className={`mt-2 rounded border ${
                  awaMissing ? "border-red-500" : "border-gray-300"
                }`}
              >
                <div
                  className="flex cursor-pointer items-center justify-between p-2"
                  onClick={() => setOpenAWA(!openAWA)}
                >
                  <span className="text-[11px] font-semibold uppercase text-purple-600">
                    AWA Alerts{" "}
                    {awaMissing && <span className="text-red-600">*</span>}
                  </span>
                  {openAWA ? (
                    <ChevronUp size={14} />
                  ) : (
                    <ChevronDown size={14} />
                  )}
                </div>

                {openAWA && (
                  <div className="space-y-2 p-3">
                    {/* chips flex-wrap */}
                    <div className="max-h-48 overflow-y-auto flex flex-wrap gap-1">
                      {ALL_ALERTS.map((a) => (
                        <button
                          key={a.key}
                          title={a.label}
                          onClick={() => toggleAlert(a.key)}
                          className={chipCls(alerts.includes(a.key), a.color)}
                        >
                          {a.label}
                        </button>
                      ))}
                    </div>

                    {!!alerts.length && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {alerts.map((k) => {
                          const a = ALL_ALERTS.find((x) => x.key === k);
                          if (!a) return null;
                          return (
                            <span
                              key={k}
                              title={a.label}
                              className={`${a.color} text-white flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px]`}
                            >
                              {a.label.length > 24
                                ? a.label.slice(0, 21) + "…"
                                : a.label}
                              <X
                                size={10}
                                className="cursor-pointer"
                                onClick={() => toggleAlert(k)}
                              />
                            </span>
                          );
                        })}
                        <button
                          onClick={clearAlerts}
                          className="ml-1 inline-flex items-center gap-1 rounded border border-gray-400 px-1.5 py-0.5 text-[10px] text-gray-700 dark:bg-gray-800"
                        >
                          Clear all <Hash size={10} />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* AWA STEPS */}
              <label className="mt-2 flex flex-col gap-0.5 text-[10px] font-semibold uppercase w-full">
                <span>
                  AWA STEPS{" "}
                  {stepsMissing && <span className="text-red-600">*</span>}
                </span>
                <textarea
                  value={issue.awaSteps}
                  onChange={(e) =>
                    updateSection("issue", { awaSteps: e.target.value })
                  }
                  onInput={autoGrow}
                  rows={3}
                  className={`form-input resize-none rounded border px-1 py-0.5 text-[11px] dark:bg-gray-800 ${
                    stepsMissing ? "border-red-500" : "border-gray-300"
                  }`}
                />
              </label>
            </>
          )}

          {/* ███ TVS ███ */}
          <div className="mt-2 grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-0.5 text-[10px] font-semibold uppercase">
              <span>
                TVS {tvsMissing && <span className="text-red-600">*</span>}
              </span>
              <select
                value={issue.tvsUsed}
                onChange={(e) =>
                  updateSection("issue", {
                    tvsUsed: e.target.value,
                    tvsKey: "",
                  })
                }
                className={`form-input rounded border px-1 py-0.5 text-[11px] dark:bg-gray-800 ${
                  tvsMissing ? "border-red-500" : "border-gray-300"
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
                TVS KEY{" "}
                {issue.tvsUsed === "Yes" && tvsKeyMiss && (
                  <span className="text-red-600">*</span>
                )}
              </span>
              <input
                value={issue.tvsKey}
                onChange={(e) =>
                  updateSection("issue", { tvsKey: e.target.value })
                }
                disabled={issue.tvsUsed !== "Yes"}
                className={`form-input rounded border px-1 py-0.5 text-[11px] dark:bg-gray-800 ${
                  issue.tvsUsed === "Yes" && tvsKeyMiss
                    ? "border-red-500"
                    : "border-gray-300"
                }`}
              />
            </label>
          </div>

          {/* ███ SpeedTest – 2 cards ███ */}
          {svc === "HighSpeed" && (
            <div className="mt-3 rounded border">
              <div
                className="flex cursor-pointer items-center justify-between p-2"
                onClick={() => setOpenSPD(!openSPD)}
              >
                <span className="text-[11px] font-semibold uppercase text-green-700">
                  SpeedTest Results
                </span>
                {openSPD ? (
                  <ChevronUp size={14} />
                ) : (
                  <ChevronDown size={14} />
                )}
              </div>

              {openSPD && (
                <div className="space-y-3 p-3">
                  <div className="grid grid-cols-3 gap-3">
                    {/* two test cards */}
                    <div className="col-span-2 grid grid-cols-2 gap-3">
                      {issue.spTests.slice(0, 2).map((t, i) => (
                        <div
                          key={i}
                          className="rounded border border-gray-300 p-2 flex flex-col gap-1"
                        >
                          <span className="text-center text-[10px] font-semibold uppercase">
                            {t.stage}
                          </span>
                          <div className="grid grid-cols-5 gap-1">
                            <input
                              placeholder="Down"
                              inputMode="decimal"
                              maxLength={6}
                              value={t.down}
                              onChange={(e) =>
                                updateSpeedTest(i, "down", e.target.value)
                              }
                              className="col-span-2 form-input rounded border px-1 py-0.5 text-[11px] text-center dark:bg-gray-800 border-gray-300 no-spinner"
                            />
                            <input
                              placeholder="Up"
                              inputMode="decimal"
                              maxLength={6}
                              value={t.up}
                              onChange={(e) =>
                                updateSpeedTest(i, "up", e.target.value)
                              }
                              className="col-span-2 form-input rounded border px-1 py-0.5 text-[11px] text-center dark:bg-gray-800 border-gray-300 no-spinner"
                            />
                            <button
                              onClick={() =>
                                updateSpeedTest(i, "wired", !t.wired)
                              }
                              className={`flex items-center justify-center rounded px-2 py-0.5 text-[10px] border ${
                                t.wired
                                  ? "bg-blue-600 text-white border-blue-600"
                                  : "border-gray-300 dark:bg-gray-800"
                              }`}
                              title={t.wired ? "Wired" : "Wi-Fi"}
                            >
                              {t.wired ? (
                                <Plug size={14} />
                              ) : (
                                <Wifi size={14} />
                              )}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* devices */}
                    <div className="rounded border border-gray-300 p-2 flex flex-col items-center gap-2">
                      <span className="text-[10px] font-semibold uppercase">
                        Devices Connected
                      </span>
                      <div className="flex w-full gap-1">
                        <input
                          placeholder="Active"
                          inputMode="numeric"
                          maxLength={3}
                          value={issue.devicesActive}
                          onChange={(e) =>
                            updateSection("issue", {
                              devicesActive: e.target.value,
                            })
                          }
                          className="form-input w-full rounded border px-1 py-0.5 text-center text-[11px] dark:bg-gray-800 border-gray-300 no-spinner"
                        />
                        <input
                          placeholder="Total"
                          inputMode="numeric"
                          maxLength={3}
                          value={issue.devicesTotal}
                          onChange={(e) =>
                            updateSection("issue", {
                              devicesTotal: e.target.value,
                            })
                          }
                          className="form-input w-full rounded border px-1 py-0.5 text-center text-[11px] dark:bg-gray-800 border-gray-300 no-spinner"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </FormSection>
  );
}
