/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useMemo, useEffect, useRef } from "react";
import {
  ChevronUp,
  ChevronDown,
  Trash2,
  Server,
  Router,
  Wifi,
  Plus,
  X,
} from "lucide-react";
import { useFormStore } from "../../../store/useFormStore";
import FormSection from "../../ui/FormSection";
import MandatePanel from "../../ui/MandatePanel";

/* ═══════════════════════════════════════
   1. CONSTANTES GLOBALES
   ═════════════════════════════════════ */
const SERVICE_STATES = [
  { value: "Active", text: "text-green-600", bg: "bg-green-600" },
  { value: "Pending", text: "text-yellow-600", bg: "bg-yellow-600" },
  { value: "Activating", text: "text-blue-600", bg: "bg-blue-600" },
  { value: "Suspended", text: "text-amber-700", bg: "bg-amber-700" },
  { value: "Cancelled", text: "text-red-600", bg: "bg-red-600" },
  { value: "No Services", text: "text-gray-500", bg: "bg-gray-500" },
];

const SERVICE_OPTIONS = [
  "HighSpeed",
  "Optik TV Legacy",
  "Optik TV Evo",
  "HomePhone",
  "Telus Email",
  "MyTelus",
  "Telus Online Security",
  "Telus Connect App",
  "SHS Legacy",
  "Living Well Companion",
  "Others",
];

/* ═══════════════════════════════════════
   2. WORKFLOW OPTIONS
   ═════════════════════════════════════ */
const WF = {
  copper: {
    HighSpeed: [
      "No Sync",
      "Intermittent Connectivity",
      "No Dataflow",
      "No IP",
      "SlowSpeed",
      "WiFi Disconnects",
      "WiFi Can't Connect",
      "Can't Browse some Websites",
    ],
  },
  fiber: {
    HighSpeed: [
      "ONT Not Ranged",
      "Intermittent Connectivity",
      "No Dataflow",
      "No IP",
      "SlowSpeed",
      "WiFi Disconnects",
      "WiFi Can't Connect",
      "Can't Browse some Websites",
    ],
  },
  HighSpeed: [],
  "Optik TV Legacy": [
    "STB no Boot",
    "No Video Issues",
    "Video Quality Issues",
    "Channel Issues",
    "Recording Issue",
    "Audio Issues",
    "Remote Control Issues",
    "Apps Issues",
    "VOD / PPV Issues",
    "Asks for a Reg Code",
    "Telus TV+ App",
  ],
  "Optik TV Evo": [
    "STB no Boot",
    "No Video Issues",
    "Video Quality Issues",
    "Channel Issues",
    "Recording Issue",
    "Audio Issues",
    "Remote Control Issues",
    "Apps Issues",
    "VOD / PPV Issues",
    "Login Issues",
    "IPG / Menu Issues",
    "Telus TV+ App",
    "Power Cable Issue",
  ],
  HomePhone: [
    "No Dial Tone",
    "Can't be Called",
    "Can't Call Out",
    "Call Cuts Off",
    "Can't be Heard",
    "Noise on the Line",
    "Long Distance issue",
    "Physical Issues",
    "Nuisance Calls",
    "Other on the Line",
    "Cable / Drop / Terminal issue",
    "Call Display",
    "VoiceMail Issues",
    "Porting Number",
  ],
  "Telus Email": [
    "Login Issues",
    "Password Issues",
    "Account Deleted",
    "Email Creation",
    "Functionality",
    "Third Party app issues",
  ],
  MyTelus: [
    "Login Issues",
    "Verification Code Issue",
    "Password Reset Issues",
    "Account Locked",
    "BackUp Email",
    "Change Email",
    "Create Account",
    "MyTelus APP issues",
  ],
  "Telus Online Security": [
    "Unable to Login",
    "Not Active",
    "Upgrade Subscription",
  ],
  "Telus Connect App": ["Login Issues", "Missing Equipment", "Feature Issue"],
  "Living Well Companion": [
    "Base Not Working",
    "Pendant Not Working",
    "Emergency Contacts",
    "LWC Apple Watch APP",
    "Self Install Inquiries",
    "CMS ACCOUNT NUMBER",
  ],
  Others: [
    "Billing Issues",
    "IPD Suspension",
    "Ghost Call",
    "Where is my Tech?",
    "Same Day Appointment Cancell",
    "Where is my equipment?",
  ],
  "SHS Legacy": [
    "Login / Password Issues",
    "WebPage Portal Portal Issues",
    "APP Issues",
    "General Issues",
    "Main Panel",
    "Secondary Panel",
    "Door / Window Sensor",
    "Motion Sensor",
    "Smoke Detector",
    "CO Detector",
    "Glass Break Detector",
    "Thermostat",
    "InDoor Camera",
    "OutDoor Camera",
    "Doorbell Camera",
    "DoorLock",
    "Garage Door Controller",
    "Smart Automation Devices",
    "CMS inquiry",
    "Wi-Fi Issues",
  ],
};

const getWorkflowOptions = (svc, tech) =>
  !svc ? [] : svc === "HighSpeed" ? WF[tech]?.HighSpeed || [] : WF[svc] || [];

/* ═══════════════════════════════════════
   3. EQUIPMENT – LISTAS
   ═════════════════════════════════════ */
const POWER_OPTS = [
  "Not Connected",
  "Connected but no power",
  "Connected but Standby",
  "Connected and Powered ON",
];
const HDMI_OPTS = [
  "Not Connected",
  "Connected but Input not selected properly",
  "Connected and Input selected correctly",
];
const INTERNET_WIRED = [
  "Non WIRED/WIRELESS",
  "Wired to T3200M",
  "Wired to TWH",
  "Wired to NAH",
  "Wired to MOCA",
  "Wired to JACK",
  "Wired to BW6",
  "Wired to Extender",
];
const WIFI_OPTS = ["WEAK", "GOOD", "STRONG"];
const XVU_STATUS = [
  "Not Available",
  "No Error Found",
  "Minor Error Found",
  "Major Error Found",
  "Critical Error Found",
];
const PACKET_LOSS = [
  "Not Available",
  "No Packet Loss",
  "Few Packet Loss",
  "Some Packet Loss",
  "Too Many Packet Loss",
];

/* HighSpeed – Copper */
const COPPER_GW_MODELS = ["T1200H", "T2200H", "T3200M"];
const LIGHT_COLORS = ["GREEN", "YELLOW", "ORANGE", "RED"];
const DSL_TYPES = ["SINGLE", "BONDED"];
const DSL_LIGHT = ["ON", "OFF", "BOTH ON", "BOTH OFF", "1 ON & 1 OFF"];

/* HighSpeed – Fiber */
const ONT_MODELS = [
  "G-010S-A",
  "FXA5000",
  "G-240G-A",
  "I-240G-B",
  "I-240G-C",
  "XS-230X-A",
  "XS-250X-A",
];
const ONT_LIGHTS = {
  "G-240G-A": ["DATA1 GREEN", "DATA1 OFF", "FAIL RED"],
  "I-240G-B": ["LAN1 GREEN/ORANGE", "LAN1 OFF", "ALARM RED"],
  "I-240G-C": ["LAN1 GREEN/ORANGE", "LAN1 OFF", "ALARM RED"],
  "XS-230X-A": ["DATA5 GREEN", "DATA5 OFF", "FAIL RED"],
  "XS-250X-A": ["DATA5 GREEN", "DATA5 OFF", "FAIL RED"],
};
const FIBER_GW_MODELS = [
  "T3200M",
  "Telus Wifi Hub (TWH)",
  "Network Access Hub (NAH)",
];
const FIBER_GW_LIGHTS = {
  T3200M: [
    "Internet & Wifi GREEN",
    "Internet YELLOW & Wifi GREEN",
    "Internet ORANGE & Wifi GREEN",
    "Internet RED & Wifi GREEN",
  ],
  "Telus Wifi Hub (TWH)": [
    "Internet SOLID GREEN & WiFi BLUE",
    "Internet SOLID RED & Wifi BLUE",
  ],
  "Network Access Hub (NAH)": ["SOLID GREEN", "FLASHING GREEN", "RED"],
};

/* Booster */
const BOOSTER_MODELS = [
  "WEB6000Q",
  "Boost V1",
  "Boost Wifi 6",
  "Boost Wifi 6E",
  "Boost Wifi 6E Mini",
  "Wifi 6E Extender",
];
const BOOSTER_LIGHTS = {
  WEB6000Q: [
    "Wifi 2.4Ghz-5Ghz ON",
    "Wifi 2.4Ghz-5Ghz OFF",
    "LAN 1-2 ON",
    "LAN 1-2 OFF",
  ],
  "Boost V1": ["SOLID BLUE", "FLASHING BLUE", "RED"],
  "Boost Wifi 6": ["SOLID GREEN", "FLASHING GREEN", "RED"],
  "Boost Wifi 6E": ["SOLID GREEN", "FLASHING GREEN", "RED"],
  "Boost Wifi 6E Mini": ["SOLID GREEN", "FLASHING GREEN", "RED"],
  "Wifi 6E Extender": [
    "SOLID GREEN",
    "FLASHING GREEN",
    "FLASHING BLUE",
    "SOLID RED",
    "FLASHING RED",
  ],
};

/* Optik TV Legacy */
const PVR_MODELS = [
  "VIP5662W",
  "UIW8001",
  "CIS430",
  "IPN430",
  "ISB7050",
  "ISB7150",
  "IPV6015",
  "IPV6016",
];
const LINK_LIGHT_OPTS = ["SOLID", "FLASHING"];
const STB_MODELS_LEGACY = [
  "VIP5602W",
  "VIP5602WT",
  "UIW4001",
  "UIW4001e",
  "CIS330",
  "IPN330",
  "ISB7100",
  "ISB7105",
  "IPV5050",
];

/* Optik TV Evo */
const DIGITAL_MODELS = ["Telus TV 21-T", "Telus TV 24-S"];
const BOOT_LOOP = ["YES", "NO"];

/* ═══════════════════════════════════════
   4. EQUIPMENT PANEL
   ═════════════════════════════════════ */
function EquipmentPanel({ tech, service, summary, onSummaryChange }) {
  const tchn = tech ?? "";
  const svc = service ?? "";

  /* ---------- states ---------- */
  const [state, setState] = useState({});
  const [active, setActive] = useState(null);
  const [boosters, setBoosters] = useState(1);      // HS
  const [legacyStbCnt, setLegacyStbCnt] = useState(1); // Legacy STB
  const [digitalCnt, setDigitalCnt] = useState(1);      // Evo Digital
  const [open, setOpen] = useState(true);

  /* ---------- refs ---------- */
  const summaryRef = useRef(null);
  useEffect(() => {
    if (summaryRef.current) {
      summaryRef.current.style.height = "auto";
      summaryRef.current.style.height = summaryRef.current.scrollHeight + "px";
    }
  }, [summary]);

  /* reset on svc/tech change */
  useEffect(() => {
    setState({});
    setActive(null);
    setBoosters(1);
    setLegacyStbCnt(1);
    setDigitalCnt(1);
  }, [tchn, svc]);

  /* -------- helpers -------- */
  const isBooster = (k) => k.startsWith("booster");
  const isLegacyPvr = (k) => k === "pvr";
  const isLegacyStb = (k) =>
    svc === "Optik TV Legacy" && k.startsWith("stb");
  const isDigital = (k) => svc === "Optik TV Evo" && k.startsWith("digital");

  /* -------- field generator -------- */
  const getFields = (key) => {
    /* Booster */
    if (isBooster(key)) {
      const model = state[key]?.model;
      const obj = {
        model: BOOSTER_MODELS,
        power: POWER_OPTS,
        conn: ["ETHERNET", "COAX/MOCA", "WIRELESS"],
      };
      if (model && BOOSTER_LIGHTS[model]) obj.lights = BOOSTER_LIGHTS[model];
      return obj;
    }

    /* Optik Legacy */
    if (isLegacyPvr(key)) {
      return {
        model: PVR_MODELS,
        power: POWER_OPTS,
        hdmi: HDMI_OPTS,
        internet: INTERNET_WIRED,
        linkLight: LINK_LIGHT_OPTS,
        xvuStatus: XVU_STATUS,
        packetLoss: PACKET_LOSS,
      };
    }
    if (isLegacyStb(key)) {
      const obj = {
        model: STB_MODELS_LEGACY,
        power: POWER_OPTS,
        hdmi: HDMI_OPTS,
        internet: ["WIRELESS", ...INTERNET_WIRED],
        xvuStatus: XVU_STATUS,
        packetLoss: PACKET_LOSS,
      };
      if (state[key]?.internet === "WIRELESS") obj.wifi = WIFI_OPTS;
      return obj;
    }

    /* Optik Evo Digital */
    if (isDigital(key)) {
      const obj = {
        model: DIGITAL_MODELS,
        power: POWER_OPTS,
        hdmi: HDMI_OPTS,
        internet: ["WIRELESS", ...INTERNET_WIRED],
        bootLoop: BOOT_LOOP,
      };
      if (state[key]?.internet === "WIRELESS") obj.wifi = WIFI_OPTS;
      return obj;
    }

    /* HighSpeed – Copper/Fiber */
    if (key === "gateway" && svc === "HighSpeed" && tchn === "copper") {
      return {
        model: COPPER_GW_MODELS,
        internetLight: LIGHT_COLORS,
        wifiLight: LIGHT_COLORS,
        dsl: DSL_TYPES,
        dslLight: DSL_LIGHT,
      };
    }
    if (key === "gateway" && svc === "HighSpeed" && tchn === "fiber") {
      const model = state[key]?.model;
      const obj = {
        model: FIBER_GW_MODELS,
        power: POWER_OPTS,
        conn: ["ETHERNET", "COAX/MOCA"],
      };
      if (model && FIBER_GW_LIGHTS[model]) obj.lights = FIBER_GW_LIGHTS[model];
      if (state[key]?.conn === "ETHERNET")
        obj.wanPort = ["WAN Connected", "WAN Not Connected"];
      return obj;
    }
    if (key === "ont") {
      const model = state[key]?.model;
      const obj = { model: ONT_MODELS, power: POWER_OPTS };
      if (ONT_LIGHTS[model]) obj.lights = ONT_LIGHTS[model];
      return obj;
    }

    /* HS STB (viejo) */
    if (svc === "HighSpeed" && key.startsWith("stb")) {
      return {
        model: ["VIP5602", "VIP5662", "VIP2502"],
        power: ["On", "Stand-by", "Off"],
        hdmi: ["Correct Input", "Wrong Input", "Disconnected"],
        ethernet: ["Wi-Fi", "Wired"],
        xvu: ["None", "Present"],
        packet: ["None", "Present"],
      };
    }
    return {};
  };

  /* -------- complete? -------- */
  const isComplete = (k) =>
    Object.keys(getFields(k)).every((f) => !!(state[k] || {})[f]);

  /* -------- summary -------- */
  const prev = useRef("");
  useEffect(() => {
    const txt = Object.entries(state)
      .map(
        ([k, v]) =>
          `${k.toUpperCase()} – ${Object.entries(v)
            .map(([f, val]) => `${f}:${val}`)
            .join(" | ")}`
      )
      .join("\n");
    if (txt !== prev.current) {
      prev.current = txt;
      onSummaryChange(txt);
    }
  }, [state, onSummaryChange]);

  /* -------- build steps -------- */
  let steps = [];
  if (svc === "HighSpeed") {
    const base =
      tchn === "fiber" ? [{ key: "ont", label: "ONT", icon: Server }] : [];
    const gw = [{ key: "gateway", label: "Gateway", icon: Router }];
    const dynB = Array.from({ length: boosters }, (_, i) => ({
      key: `booster${i}`,
      label: `Booster ${i + 1}`,
      icon: Wifi,
    }));
    steps = [
      ...base,
      ...gw,
      ...dynB,
      { key: "addB", label: "Add Booster", icon: Plus },
    ];
  } else if (svc === "Optik TV Legacy") {
    const dynStb = Array.from({ length: legacyStbCnt }, (_, i) => ({
      key: `stb${i}`,
      label: `STB ${i + 1}`,
      icon: Router,
    }));
    steps = [
      { key: "pvr", label: "PVR", icon: Router },
      ...dynStb,
      { key: "addS", label: "Add STB", icon: Plus },
    ];
  } else if (svc === "Optik TV Evo") {
    const dynD = Array.from({ length: digitalCnt }, (_, i) => ({
      key: `digital${i}`,
      label: `Digital Box ${i + 1}`,
      icon: Router,
    }));
    steps = [
      ...dynD,
      { key: "addD", label: "Add Digital Box", icon: Plus },
    ];
  }

  const visible = svc === "HighSpeed" || svc.startsWith("Optik");
  if (!visible) return null;

  const autoGrow = (e) => {
    e.target.style.height = "auto";
    e.target.style.height = e.target.scrollHeight + "px";
  };

  /* -------- JSX -------- */
  return (
    <div className="mt-2 rounded border">
      {/* header */}
      <div
        className="flex cursor-pointer items-center justify-between p-2"
        onClick={() => setOpen(!open)}
      >
        <span className="text-[11px] font-semibold uppercase text-purple-600">
          Equipment Checklist
        </span>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </div>

      {open && (
        <div className="space-y-4 p-3">
          {/* icon flow */}
          <div className="flex flex-wrap justify-around gap-3">
            {steps.map((s, idx) => {
              const Icon = s.icon;
              const done = isComplete(s.key);
              const locked =
                svc === "HighSpeed"
                  ? idx > 0 && !isComplete(steps[idx - 1].key)
                  : false;

              const del =
                (isBooster(s.key) && boosters > 1 && !s.key.startsWith("add")) ||
                (isLegacyStb(s.key) && legacyStbCnt > 1) ||
                (isDigital(s.key) && digitalCnt > 1);

              const selected = active === s.key;

              return (
                <button
                  key={s.key}
                  disabled={locked}
                  onClick={() => {
                    if (s.key === "addB") {
                      setBoosters((b) => Math.min(b + 1, 4));
                      return;
                    }
                    if (s.key === "addS") {
                      setLegacyStbCnt((n) => {
                        const next = Math.min(n + 1, 5);
                        setActive(`stb${next - 1}`);
                        return next;
                      });
                      return;
                    }
                    if (s.key === "addD") {
                      setDigitalCnt((n) => {
                        const next = Math.min(n + 1, 6);
                        setActive(`digital${next - 1}`);
                        return next;
                      });
                      return;
                    }
                    setActive(s.key);
                  }}
                  className={`relative flex flex-col items-center gap-1 text-[11px] ${
                    locked ? "opacity-30" : ""
                  }`}
                >
                  {del && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isBooster(s.key))
                          setBoosters((b) => Math.max(1, b - 1));
                        if (isLegacyStb(s.key))
                          setLegacyStbCnt((n) => Math.max(1, n - 1));
                        if (isDigital(s.key))
                          setDigitalCnt((n) => Math.max(1, n - 1));
                        setState((p) => {
                          const c = { ...p };
                          delete c[s.key];
                          return c;
                        });
                        if (active === s.key) setActive(null);
                      }}
                      className="absolute -right-2 -top-2 rounded-full bg-red-600 p-[1px] text-white"
                    >
                      <X size={10} />
                    </span>
                  )}

                  <div
                    className={`rounded-full p-3 ${
                      done ? "bg-green-500 text-white" : "bg-gray-200"
                    } ${selected ? "ring-2 ring-blue-500" : ""}`}
                  >
                    <Icon size={18} />
                  </div>
                  <span className={done ? "text-green-600" : "text-gray-700"}>
                    {s.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* campos configurables */}
          {active && !active.startsWith("add") && (
            <div className="space-y-3 rounded border p-3">
              {Object.entries(getFields(active)).map(([field, opts]) => (
                <div key={field} className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold capitalize">
                    {field}
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {opts.map((opt) => (
                      <button
                        key={opt}
                        onClick={() =>
                          setState((p) => ({
                            ...p,
                            [active]: { ...(p[active] || {}), [field]: opt },
                          }))
                        }
                        className={`rounded border px-2 py-0.5 text-[11px] ${
                          state[active]?.[field] === opt
                            ? "bg-blue-600 text-white"
                            : "bg-white dark:bg-gray-800"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* summary */}
          <div className="flex flex-col gap-0.5 text-[10px] font-semibold uppercase">
            <span>EQUIPMENT SUMMARY</span>
            <textarea
              ref={summaryRef}
              value={summary}
              onChange={(e) => onSummaryChange(e.target.value)}
              onInput={autoGrow}
              rows={2}
              autoComplete="off"
              className="form-input resize-none rounded border px-1 py-0.5 text-[11px] dark:bg-gray-800 border-gray-300"
            />
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════
   5. SECTION 2 – MAIN COMPONENT
   ═════════════════════════════════════ */
export default function Section2() {
  const issue = useFormStore((s) => s.data.issue);
  const update = useFormStore((s) => s.updateSection);

  const svc = issue.service ?? "";
  const tech = issue.technology ?? "";

  const [open, setOpen] = useState(true);

  const autoGrow = (e) => {
    e.target.style.height = "auto";
    e.target.style.height = e.target.scrollHeight + "px";
  };

  const clearIssue = () =>
    update("issue", {
      cxIssue: "",
      serviceOnCsr: "",
      errorType: "",
      errorDetails: "",
      technology: "",
      service: "",
      workflow: "",
      affected: "",
      equipSummary: "",
      troubleshooting: "",
    });

  const showDetails =
    issue.errorType === "outage" || issue.errorType === "ncError";
  const rowCols = showDetails ? "grid-cols-3" : "grid-cols-2";

  const requiredMissing = useMemo(
    () => ({
      cxIssue: !issue.cxIssue,
      serviceOnCsr: !issue.serviceOnCsr,
      technology: svc === "HighSpeed" && tech === "",
      service: !svc,
      workflow: !issue.workflow,
      errorDetails: showDetails && !issue.errorDetails,
      affected:
        (svc === "HomePhone" && !issue.affected) ||
        (svc === "Telus Email" && !issue.affected) ||
        (svc === "MyTelus" && !issue.affected),
      troubleshooting: !issue.troubleshooting,
    }),
    [issue, showDetails, tech, svc]
  );

  const selectedBg =
    SERVICE_STATES.find((s) => s.value === issue.serviceOnCsr)?.bg || "";

  const techBorder =
    requiredMissing.technology && svc === "HighSpeed"
      ? "border border-red-500 rounded p-1"
      : "";

  const handle = (e) => update("issue", { [e.target.name]: e.target.value });
  const setField = (k, v) => update("issue", { [k]: v });
  const handleServ = (e) =>
    update("issue", { service: e.target.value, workflow: "", affected: "" });

  const workflowOptions = getWorkflowOptions(svc, tech);

  return (
    <FormSection>
      {/* header */}
      <div
        className="mb-1 flex cursor-pointer items-center justify-between"
        onClick={() => setOpen(!open)}
      >
        <h3 className="flex-1 text-sm font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
          STATUS, ISSUE & TROUBLESHOOT
        </h3>
        <div
          className="flex items-center gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={clearIssue}
            className="text-red-500 hover:text-red-700"
          >
            <Trash2 size={14} />
          </button>
          <button type="button" className="text-blue-600 dark:text-blue-400">
            {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {open && (
        <>
          {/* CX ISSUE */}
          <div className="form-row">
            <label className="flex flex-col gap-0.5 text-[10px] font-semibold uppercase w-full">
              <span className="inline-flex items-center gap-0.5">
                CX ISSUE
                {requiredMissing.cxIssue && (
                  <span className="text-red-600">*</span>
                )}
              </span>
              <textarea
                name="cxIssue"
                value={issue.cxIssue}
                onChange={handle}
                onInput={autoGrow}
                rows={3}
                autoComplete="off"
                className={`form-input resize-none rounded border px-1 py-0.5 text-[11px] dark:bg-gray-800 ${
                  requiredMissing.cxIssue ? "border-red-500" : "border-gray-300"
                }`}
              />
            </label>
          </div>

          {/* CSR + ERROR */}
          <div className={`form-row mt-2 grid ${rowCols} gap-2`}>
            {/* SERVICE ON CSR */}
            <div className="flex flex-col gap-0.5 text-[10px] font-semibold uppercase">
              <span>
                SERVICE ON CSR
                {requiredMissing.serviceOnCsr && (
                  <span className="text-red-600"> *</span>
                )}
              </span>
              <div
                className={`rounded border ${
                  issue.serviceOnCsr
                    ? `${selectedBg} border-transparent`
                    : requiredMissing.serviceOnCsr
                    ? "border-red-500"
                    : "border-gray-300"
                }`}
              >
                <select
                  name="serviceOnCsr"
                  value={issue.serviceOnCsr}
                  onChange={handle}
                  className={`w-full bg-transparent px-1 py-0.5 text-[11px] focus:outline-none ${
                    issue.serviceOnCsr ? "text-white" : "text-black"
                  }`}
                >
                  <option value="" className="text-black">
                    —
                  </option>
                  {SERVICE_STATES.map((s) => (
                    <option key={s.value} value={s.value} className="text-black">
                      {s.value}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* ERROR toggle */}
            <div className="flex flex-col gap-0.5 text-[10px] font-semibold uppercase">
              <span>ERROR (Outage / NetCracker)</span>
              <div className="grid grid-cols-3 gap-1">
                {[
                  { v: "outage", lbl: "Outage", cls: "bg-red-600" },
                  { v: "", lbl: "None", cls: "bg-gray-400" },
                  { v: "ncError", lbl: "NC Error", cls: "bg-blue-600" },
                ].map((b) => (
                  <button
                    key={b.lbl}
                    onClick={() => setField("errorType", b.v)}
                    className={`rounded px-1 py-0.5 text-[11px] ${
                      issue.errorType === b.v
                        ? `${b.cls} text-white`
                        : "border border-gray-300 dark:bg-gray-800"
                    }`}
                  >
                    {b.lbl}
                  </button>
                ))}
              </div>
            </div>

            {showDetails && (
              <div className="flex flex-col gap-0.5 text-[10px] font-semibold uppercase">
                <span>
                  {issue.errorType === "outage"
                    ? "OUTAGE INFO"
                    : "NETCRACKER INFO"}
                  {requiredMissing.errorDetails && (
                    <span className="text-red-600"> *</span>
                  )}
                </span>
                <textarea
                  name="errorDetails"
                  value={issue.errorDetails}
                  onChange={handle}
                  onInput={autoGrow}
                  rows={1}
                  className={`form-input resize-none rounded border px-1 py-0.5 text-[11px] dark:bg-gray-800 ${
                    requiredMissing.errorDetails
                      ? "border-red-500"
                      : "border-gray-300"
                  }`}
                />
              </div>
            )}
          </div>

          {/* CONNECTION / SERVICE / WORKFLOW */}
          <div className="form-row mt-2 grid grid-cols-3 gap-2">
            {/* CONNECTION */}
            <div className="flex flex-col gap-0.5 text-[10px] font-semibold uppercase">
              <span>
                CONNECTION
                {requiredMissing.technology && (
                  <span className="text-red-600"> *</span>
                )}
              </span>
              <div className={`grid grid-cols-3 gap-1 ${techBorder}`}>
                {[
                  { v: "copper", lbl: "Copper", clr: "bg-purple-600" },
                  { v: "", lbl: "None", clr: "bg-gray-400" },
                  { v: "fiber", lbl: "Fiber", clr: "bg-orange-500" },
                ].map((b) => (
                  <button
                    key={b.lbl}
                    onClick={() => setField("technology", b.v)}
                    className={`rounded px-1 py-0.5 text-[11px] ${
                      tech === b.v
                        ? `${b.clr} text-white`
                        : "border border-gray-300 dark:bg-gray-800"
                    }`}
                  >
                    {b.lbl}
                  </button>
                ))}
              </div>
            </div>

            {/* SERVICE */}
            <div className="flex flex-col gap-0.5 text-[10px] font-semibold uppercase">
              <span>
                SERVICE
                {requiredMissing.service && (
                  <span className="text-red-600"> *</span>
                )}
              </span>
              <select
                name="service"
                value={svc}
                onChange={handleServ}
                className={`form-input rounded border px-1 py-0.5 text-[11px] dark:bg-gray-800 ${
                  requiredMissing.service ? "border-red-500" : "border-gray-300"
                }`}
              >
                <option value="">—</option>
                {SERVICE_OPTIONS.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* WORKFLOW */}
            <div className="flex flex-col gap-0.5 text-[10px] font-semibold uppercase">
              <span>
                WORKFLOW
                {requiredMissing.workflow && (
                  <span className="text-red-600"> *</span>
                )}
              </span>
              <select
                name="workflow"
                value={issue.workflow}
                onChange={handle}
                disabled={!svc}
                className={`form-input rounded border px-1 py-0.5 text-[11px] dark:bg-gray-800 ${
                  requiredMissing.workflow
                    ? "border-red-500"
                    : "border-gray-300"
                } ${!svc ? "opacity-40" : ""}`}
              >
                <option value="">—</option>
                {workflowOptions.map((w) => (
                  <option key={w}>{w}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Affected */}
          {(svc === "HomePhone" ||
            svc === "Telus Email" ||
            svc === "MyTelus") && (
            <div className="form-row mt-2">
              <label className="flex flex-col gap-0.5 text-[10px] font-semibold uppercase w-full">
                <span>
                  {svc === "HomePhone"
                    ? "AFFECTED HOME PHONE"
                    : svc === "Telus Email"
                    ? "AFFECTED EMAIL ADDRESS"
                    : "MYTELUS EMAIL"}
                  {requiredMissing.affected && (
                    <span className="text-red-600"> *</span>
                  )}
                </span>
                <input
                  name="affected"
                  value={issue.affected || ""}
                  onChange={handle}
                  autoComplete="new-password"
                  className={`form-input rounded border px-1 py-0.5 text-[11px] dark:bg-gray-800 ${
                    requiredMissing.affected
                      ? "border-red-500"
                      : "border-gray-300"
                  }`}
                />
              </label>
            </div>
          )}

          {/* EQUIPMENT CHECKLIST */}
          <EquipmentPanel
            tech={tech}
            service={svc}
            summary={issue.equipSummary || ""}
            onSummaryChange={(txt) => setField("equipSummary", txt)}
          />

          {/* TROUBLESHOOTING */}
          <div className="form-row mt-2">
            <label className="flex flex-col gap-0.5 text-[10px] font-semibold uppercase w-full">
              <span>
                TROUBLESHOOTING PROCESS
                {requiredMissing.troubleshooting && (
                  <span className="text-red-600"> *</span>
                )}
              </span>
              <textarea
                name="troubleshooting"
                value={issue.troubleshooting || ""}
                onChange={handle}
                onInput={autoGrow}
                rows={6}
                autoComplete="off"
                className={`form-input resize-none rounded border px-1 py-0.5 text-[11px] dark:bg-gray-800 ${
                  requiredMissing.troubleshooting
                    ? "border-red-500"
                    : "border-gray-300"
                }`}
              />
            </label>
          </div>

          {/* MANDATE */}
          <div className="mt-2">
            <MandatePanel type="issue" />
          </div>
        </>
      )}
    </FormSection>
  );
}
