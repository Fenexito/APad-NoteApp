// src/form/InternetPlanPanel.jsx
import { useState, useMemo } from "react";
import { ChevronUp, ChevronDown, Wifi } from "lucide-react";

const COPPER_PLANS = [
  "1 Mbps",
  "6 Mbps",
  "15 Mbps",
  "25 Mbps",
  "50 Mbps",
  "75 Mbps",
  "100 Mbps",
  "150 Mbps",
];

const FIBER_PLANS = [
  "15 Mbps",
  "25 Mbps",
  "50 Mbps",
  "75 Mbps",
  "100 Mbps",
  "250 Mbps",
  "300 Mbps",
  "500 Mbps",
  "750 Mbps",
  "1 Gbps",
  "1.5 Gbps",
  "2.5 Gbps",
  "3 Gbps",
  "5 Gbps",
];

function getPlans(service, tech) {
  if (service !== "HighSpeed") return [];
  const t = (tech || "").toLowerCase();
  if (t === "copper") return COPPER_PLANS;
  if (t === "fiber") return FIBER_PLANS;
  return [];
}

export default function InternetPlanPanel({ service, tech, plan, onChange }) {
  const [open, setOpen] = useState(false);

  const plans = useMemo(() => getPlans(service, tech), [service, tech]);

  // Solo mostrar el panel cuando el servicio es HighSpeed
  if (service !== "HighSpeed") return null;

  const hasTech = !!tech;
  const techLabel =
    tech && typeof tech === "string"
      ? tech.charAt(0).toUpperCase() + tech.slice(1).toLowerCase()
      : "";

  return (
    <div className="mt-2 rounded border dark:border-gray-700">
      {/* Header colapsable */}
      <div
        className="flex cursor-pointer items-center justify-between p-2"
        onClick={() => setOpen(!open)}
      >
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase text-sky-600">
          <Wifi size={14} className="opacity-80" />
          Internet Speed Plan
        </span>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </div>

      {open && (
        <div className="space-y-2 p-3">
          {hasTech ? (
            <>
              <div className="text-[10px] font-semibold text-gray-700 dark:text-gray-200">
                {`HighSpeed – ${techLabel}`}
              </div>
              {plans.length ? (
                <div className="grid grid-cols-2 gap-1">
                  {plans.map((p) => {
                    const selected = plan === p;
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => onChange && onChange(p)}
                        className={[
                          "inline-flex items-center justify-center rounded border px-2 py-1 text-[11px]",
                          "transition-colors",
                          selected
                            ? "border-sky-600 bg-sky-600 text-white"
                            : "border-gray-300 dark:border-gray-600 hover:bg-sky-50 dark:hover:bg-gray-800/60",
                        ].join(" ")}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-[10px] text-gray-500 dark:text-gray-400">
                  No plans configured for this technology.
                </div>
              )}
            </>
          ) : (
            <div className="text-[10px] text-gray-500 dark:text-gray-400">
              Select <span className="font-semibold">Copper</span> or{" "}
              <span className="font-semibold">Fiber</span> to choose a plan.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
