import { useState, useEffect, useRef, useMemo } from "react";
import { ChevronUp, ChevronDown, Plus, X, Server, Router, Wifi, Copy } from "lucide-react";

/* ═══════════════════════════════════════
   EQUIPMENT CONSTANTES (BASE)
   ═════════════════════════════════════ */
const POWER_OPTS_NET = [
  "Power Connected / Powered ON",
  "Power Connected / No lights",
  "Power not Connected",
];

// OPTIK TV (LEGACY & EVO) → POWER
const POWER_OPTS_OPTIK = [
  "Power Connected / Powered ON",
  "Power Connected / Standby",
  "Power Connected / No lights",
  "Power not Connected",
];

// (legacy HDMI; reemplazado por HDMI_OPTS_OPTIK, pero conservamos por compatibilidad en HS+STB antiguo)
const HDMI_OPTS = [
  "Not Connected",
  "Connected but Input not selected properly",
  "Connected and Input selected correctly",
];

// OPTIK TV (LEGACY & EVO) → HDMI
const HDMI_OPTS_OPTIK = [
  "HDMI Connected / Input selected",
  "HDMI Connected / Wrong Input",
  "HDMI Not Connected",
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

// COPPER GATEWAY MODELS (orden solicitado)
const COPPER_GW_MODELS = ["T3200M", "T2200H", "T1200H"];

const LIGHT_COLORS = ["GREEN", "YELLOW", "ORANGE", "RED"];
const DSL_TYPES = ["SINGLE", "BONDED"];
const DSL_LIGHT_SINGLE = ["ON", "OFF"];
const DSL_LIGHT_BONDED = ["BOTH ON", "BOTH OFF", "1 ON & 1 OFF"];

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
  "Network Access Hub (NAH)": ["SOLID GREEN", "FLASHING GREEN", "RED"],
};

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
  "Wifi 6E Extender": ["SOLID GREEN", "FLASHING GREEN", "FLASHING BLUE", "SOLID RED", "FLASHING RED",
  ],
};

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

const DIGITAL_MODELS = ["Telus TV 21-T", "Telus TV 24-S"];
const BOOT_LOOP = ["YES", "NO"];

/* ═══════════════════════════════════════
   UI HELPERS
   ═════════════════════════════════════ */
const Chip = ({ active, children, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`rounded-full border px-2 py-0.5 text-[11px] transition
      ${active ? "bg-blue-600 text-white border-blue-600" : "bg-white dark:bg-gray-800 border-gray-300 hover:bg-blue-50 dark:hover:bg-gray-700"}`}
  >
    {children}
  </button>
);

// Etiquetas en MAYÚSCULAS
const FIELD_LABELS = {
  model: "MODEL",
  power: "POWER",
  conn: "CONNECTION",
  internet: "INTERNET",
  hdmi: "HDMI",
  lights: "LIGHTS",
  internetLight: "INTERNET LIGHT",
  wifiLight: "WIFI LIGHT",
  dsl: "DSL",
  dslLight: "DSL LIGHT",
  wanPort: "WAN PORT",
  linkLight: "LINK LIGHT",
  xvuStatus: "XVU STATUS",
  packetLoss: "PACKET LOSS",
  ethernet: "ETHERNET",
  wifi: "WIFI",
  bootLoop: "BOOT LOOP",
  xvu: "XVU",
  packet: "PACKET",
};
const formatFieldLabel = (f) => FIELD_LABELS[f] || String(f).toUpperCase();

const FieldGroup = ({ label, children }) => (
  <div className="flex flex-col gap-1">
    <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-200 uppercase">
      {formatFieldLabel(label)}
    </span>
    <div className="flex flex-wrap gap-1">{children}</div>
  </div>
);

// Model como “radio-cards”
const ModelOption = ({ label, selected, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`rounded-md border px-2 py-1 text-[11px] transition
      ${selected
        ? "border-blue-500 ring-2 ring-blue-300 bg-blue-50 dark:bg-blue-900/30"
        : "border-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"}`}
    title={label}
  >
    <span className="inline-flex items-center gap-2">
      <span className={`h-2 w-2 rounded-full ${selected ? "bg-blue-600" : "bg-gray-300"}`} />
      <span className="whitespace-nowrap">{label}</span>
    </span>
  </button>
);

/* ═══════════════════════════════════════
   HEALTH (OK / ISSUES / NO OK)
   ═════════════════════════════════════ */
function includesAny(str = "", arr = []) {
  const s = String(str).toUpperCase();
  return arr.some((a) => s.includes(String(a).toUpperCase()));
}
function evalHealthForDevice(key, data = {}) {
  const hasAny = Object.keys(data || {}).length > 0;
  if (!hasAny) return "unknown";

  let hardFail = false;
  let warn = false;

  if (data.power) {
    const P = data.power.toUpperCase();
    if (includesAny(P, ["POWER CONNECTED"]) && includesAny(P, ["POWERED ON"])) {
      // ok
    } else if (includesAny(P, ["STANDBY"]) || includesAny(P, ["NO LIGHTS"])) {
      warn = true;
    } else if (includesAny(P, ["NOT CONNECTED"]) || includesAny(P, ["NO POWER"])) {
      hardFail = true;
    }
  }

  if (data.hdmi) {
    const H = data.hdmi.toUpperCase();
    if (includesAny(H, ["INPUT SELECTED"])) {
      // ok
    } else if (includesAny(H, ["WRONG INPUT"])) {
      warn = true;
    } else if (includesAny(H, ["NOT CONNECTED"])) {
      hardFail = true;
    } else {
      if (data.hdmi === "Connected and Input selected correctly") {
        // ok
      } else if (data.hdmi === "Connected but Input not selected properly") {
        warn = true;
      } else if (data.hdmi === "Not Connected") {
        hardFail = true;
      }
    }
  }

  // Luces internet/wifi (incluye FLASHING/BLUE/PURPLE)
  if (data.internetLight) {
    const v = String(data.internetLight).toUpperCase();
    if (v.includes("RED")) hardFail = true;
    else if (v.includes("FLASH")) warn = true;
    else if (["YELLOW", "ORANGE"].includes(v)) warn = true;
  }
  if (data.wifiLight) {
    const v = String(data.wifiLight).toUpperCase();
    if (v.includes("RED")) hardFail = true;
    else if (v.includes("PURPLE")) warn = true;
    else if (["YELLOW", "ORANGE"].includes(v)) warn = true;
    // BLUE => ok
  }

  if (data.internet) {
    if (data.internet === "Non WIRED/WIRELESS") {
      hardFail = true;
    }
  }
  if (data.ethernet) {
    if (data.ethernet === "Wi-Fi" && data.wifi === "WEAK") warn = true;
  }
  if (data.wifi === "WEAK") warn = true;

  if (data.wanPort === "WAN Not Connected") hardFail = true;

  if (data.lights && typeof data.lights === "string") {
    const L = data.lights.toUpperCase();
    if (includesAny(L, ["RED", "FAIL"])) hardFail = true;
    else if (includesAny(L, ["ORANGE", "YELLOW", "FLASH"])) warn = true;
  }

  if (data.dslLight) {
    if (["OFF", "BOTH OFF"].includes(data.dslLight)) hardFail = true;
    if (data.dslLight === "1 ON & 1 OFF") warn = true;
  }

  if (data.xvuStatus) {
    const X = data.xvuStatus.toUpperCase();
    if (["MAJOR ERROR FOUND", "CRITICAL ERROR FOUND"].includes(X)) hardFail = true;
    if (X === "MINOR ERROR FOUND") warn = true;
  }
  if (data.packetLoss) {
    if (data.packetLoss === "Too Many Packet Loss") hardFail = true;
    if (["Few Packet Loss", "Some Packet Loss"].includes(data.packetLoss)) warn = true;
  }

  // LINK LIGHT (p. ej. PVR): FLASHING = advertencia
  if (data.linkLight) {
    const v = String(data.linkLight).toUpperCase();
    if (v.includes("FLASH")) warn = true;
  }

  if (data.bootLoop === "YES") hardFail = true;

  if (hardFail) return "no";
  if (warn) return "issues";
  return "ok";
}

/* ═══════════════════════════════════════
   HELPERS: labels, prefijos y luces
   ═════════════════════════════════════ */
function deviceLabelBase(key) {
  if (!key) return "";
  if (key === "ont") return "ONT";
  if (key === "gateway") return "GATEWAY";
  if (key === "pvr") return "PVR";
  if (key.startsWith("stb")) return "STB";
  if (key.startsWith("digital")) return "DIGITAL BOX";
  if (key.startsWith("booster")) return "BOOSTER";
  return String(key).toUpperCase();
}
function deviceLabelForSummary(key) {
  if (!key) return "";
  if (key.startsWith("booster")) {
    const n = Number(key.replace("booster", "")) || 0;
    return n === 0 ? "BOOSTER" : `BOOSTER ${n + 1}`;
  }
  if (key.startsWith("stb")) {
    const n = Number(key.replace("stb", "")) || 0;
    return n === 0 ? "STB" : `STB ${n + 1}`;
  }
  return deviceLabelBase(key);
}
function pickLightByPreference(map, model, pref = "good") {
  const arr = map?.[model] || [];
  if (!arr || !arr.length) return undefined;
  const has = (token) => arr.find((s) => String(s).toUpperCase().includes(token));
  if (pref === "good") return has("GREEN") || arr[0];
  if (pref === "warn") return has("ORANGE") || has("YELLOW") || has("FLASH") || arr[0];
  if (pref === "bad") return has("RED") || has("FAIL") || arr[arr.length - 1];
  return arr[0];
}

/* ═══════════════════════════════════════
   COMPONENTE
   ═════════════════════════════════════ */
export default function EquipmentPanel({ tech, service, summary, onSummaryChange }) {
  const tchn = tech ?? "";
  const svc = service ?? "";

  const [state, setState] = useState({});
  const [boosters, setBoosters] = useState(1);
  const [legacyStbCnt, setLegacyStbCnt] = useState(1);
  const [digitalCnt, setDigitalCnt] = useState(1);
  const [open, setOpen] = useState(true);
  const [active, setActive] = useState(null);

  // Reset al cambiar service/tech
  useEffect(() => {
    setState({});
    setBoosters(1);
    setLegacyStbCnt(1);
    setDigitalCnt(1);
    setActive(null);
  }, [tchn, svc]);

  const isBooster = (k) => k?.startsWith("booster");
  const isLegacyPvr = (k) => k === "pvr";
  const isLegacyStb = (k) => svc === "Optik TV Legacy" && k?.startsWith("stb");
  const isDigital = (k) => svc === "Optik TV Evo" && k?.startsWith("digital");

  // Campos por device (con cambios solicitados)
  const getFields = (key) => {
    if (!key) return {};

    // BOOSTER (ambos servicios → power unificado)
    if (isBooster(key)) {
      const model = state[key]?.model;
      const obj = {
        model: BOOSTER_MODELS,
        power: POWER_OPTS_NET,
      };
      // WEB6000Q: sin CONNECTION (solo ethernet)
      // Boost V1: sin COAX/MOCA
      if (model !== "WEB6000Q") {
        const base = ["ETHERNET", "COAX/MOCA", "WIRELESS"];
        obj.conn = model === "Boost V1" ? base.filter((x) => x !== "COAX/MOCA") : base;
      }
      if (model && BOOSTER_LIGHTS[model]) obj.lights = BOOSTER_LIGHTS[model];
      if (state[key]?.internet === "WIRELESS" || state[key]?.conn === "WIRELESS") {
        obj.wifi = WIFI_OPTS;
      }
      return obj;
    }

    // LEGACY PVR (internet sin "Non WIRED/WIRELESS")
    if (isLegacyPvr(key)) {
      const INTERNET_PVR = INTERNET_WIRED.filter((x) => x !== "Non WIRED/WIRELESS");
      return {
        model: PVR_MODELS,
        power: POWER_OPTS_OPTIK,
        hdmi: HDMI_OPTS_OPTIK,
        internet: INTERNET_PVR,
        linkLight: LINK_LIGHT_OPTS,
        xvuStatus: XVU_STATUS,
        packetLoss: PACKET_LOSS,
      };
    }

    // LEGACY STB (mover "Non WIRED/WIRELESS" al final)
    if (isLegacyStb(key)) {
      const base = ["WIRELESS", ...INTERNET_WIRED];
      const non = "Non WIRED/WIRELESS";
      const ordered = [...base.filter((x) => x !== non), non];
      const obj = {
        model: STB_MODELS_LEGACY,
        power: POWER_OPTS_OPTIK,
        hdmi: HDMI_OPTS_OPTIK,
        internet: ordered,
        xvuStatus: XVU_STATUS,
        packetLoss: PACKET_LOSS,
      };
      if (state[key]?.internet === "WIRELESS") obj.wifi = WIFI_OPTS;
      return obj;
    }

    // EVO DIGITAL
    if (isDigital(key)) {
      const obj = {
        model: DIGITAL_MODELS,
        power: POWER_OPTS_OPTIK,
        hdmi: HDMI_OPTS_OPTIK,
        internet: ["WIRELESS", ...INTERNET_WIRED],
        bootLoop: BOOT_LOOP,
      };
      if (state[key]?.internet === "WIRELESS") obj.wifi = WIFI_OPTS;
      return obj;
    }

    // GATEWAY COPPER → power unificado
    if (key === "gateway" && svc === "HighSpeed" && tchn === "copper") {
      const dslSel = state[key]?.dsl;
      const obj = {
        model: COPPER_GW_MODELS,
        power: POWER_OPTS_NET,
        internetLight: LIGHT_COLORS,
        wifiLight: LIGHT_COLORS,
        dsl: DSL_TYPES,
        dslLight:
          dslSel === "SINGLE"
            ? DSL_LIGHT_SINGLE
            : dslSel === "BONDED"
            ? DSL_LIGHT_BONDED
            : [...DSL_LIGHT_SINGLE, ...DSL_LIGHT_BONDED],
      };
      return obj;
    }

    // GATEWAY FIBER (model-dependiente) → power unificado
    if (key === "gateway" && svc === "HighSpeed" && tchn === "fiber") {
      const model = state[key]?.model;
      const base = { model: FIBER_GW_MODELS, power: POWER_OPTS_NET };

      if (model === "T3200M") {
        return {
          ...base,
          internetLight: LIGHT_COLORS,
          wifiLight: LIGHT_COLORS,
          wanPort: ["WAN Connected", "WAN Not Connected", "Not Needed (SFP)"],
        };
      }
      if (model === "Telus Wifi Hub (TWH)") {
        return {
          ...base,
          // Orden solicitado: SOLID GREEN, FLASHING GREEN, RED
          internetLight: ["SOLID GREEN", "FLASHING GREEN", "RED"],
          wifiLight: ["BLUE", "PURPLE", "RED"],
          wanPort: ["WAN Connected", "WAN Not Connected", "Not Needed (SFP)"],
        };
      }

      // NAH (u otro sin modelo especial): lights + connection; WAN PORT solo si ETHERNET
      const obj = {
        ...base,
        conn: ["ETHERNET", "COAX/MOCA"],
      };
      if (model && FIBER_GW_LIGHTS[model]) obj.lights = FIBER_GW_LIGHTS[model];
      if (state[key]?.conn === "ETHERNET") obj.wanPort = ["WAN Connected", "WAN Not Connected"];
      return obj;
    }

    // ONT (fibra): power unificado salvo modelos que lo omiten
    if (key === "ont" && svc === "HighSpeed" && tchn === "fiber") {
      const model = state[key]?.model;
      const obj = { model: ONT_MODELS };
      const m = String(model || "").toUpperCase();
      if (!(m === "G-010S-A" || m === "FXA5000")) {
        obj.power = POWER_OPTS_NET;
      }
      if (model && ONT_LIGHTS[model]) obj.lights = ONT_LIGHTS[model];
      return obj;
    }

    // HS + STB (caso antiguo)
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

  const isBoosterKey = (k) => k && k.startsWith("booster");
  const isComplete = (k) => {
    if (!k) return false;
    const fields = getFields(k);
    const cur = state[k] || {};
    return Object.keys(fields).every((f) => !!cur[f]);
  };

  // Píldoras (lista horizontal)
  const equipments = useMemo(() => {
    if (svc === "HighSpeed") {
      const base = tchn === "fiber" ? [{ key: "ont", label: "ONT", icon: Server }] : [];
      const gw = [{ key: "gateway", label: "Gateway", icon: Router }];
      const dynB = Array.from({ length: boosters }, (_, i) => ({
        key: `booster${i}`,
        label: `Booster ${i + 1}`,
        icon: Wifi,
      }));
      return [...base, ...gw, ...dynB, { key: "addB", label: "Add Booster", icon: Plus }];
    }
    if (svc === "Optik TV Legacy") {
      const pvr = [{ key: "pvr", label: "PVR", icon: Router }];
      const dynStb = Array.from({ length: legacyStbCnt }, (_, i) => ({
        key: `stb${i}`,
        label: `STB ${i + 1}`,
        icon: Router,
      }));
      return [...pvr, ...dynStb, { key: "addS", label: "Add STB", icon: Plus }];
    }
    if (svc === "Optik TV Evo") {
      const dynD = Array.from({ length: digitalCnt }, (_, i) => ({
        key: `digital${i}`,
        label: `Digital Box ${i + 1}`,
        icon: Router,
      }));
      return [...dynD, { key: "addD", label: "Add Digital Box", icon: Plus }];
    }
    return [];
  }, [svc, tchn, boosters, legacyStbCnt, digitalCnt]);

  // Activo por defecto válido
  useEffect(() => {
    const firstReal = equipments.find((e) => !e.key.startsWith("add"))?.key || null;
    if (!active || !equipments.some((e) => e.key === active)) {
      setActive(firstReal);
    }
  }, [equipments]); // eslint-disable-line react-hooks/exhaustive-deps

  // Summary (sin nombres de campo; con prefijos en * Light)
  const prev = useRef("");
  function orderedFieldListFor(key) {
    if (key === "ont") return ["model", "power", "lights"];
    if (key === "gateway" && svc === "HighSpeed" && tchn === "fiber") {
      const m = state[key]?.model;
      if (m === "T3200M" || m === "Telus Wifi Hub (TWH)") {
        return ["model", "power", "internetLight", "wifiLight", "wanPort"];
      }
      return ["model", "power", "conn", "lights", "wanPort"];
    }
    if (key === "gateway" && svc === "HighSpeed" && tchn === "copper")
      return ["model", "power", "internetLight", "wifiLight", "dsl", "dslLight"];
    if (isBoosterKey(key)) return ["model", "power", "conn", "lights", "wifi"];
    if (isLegacyPvr(key)) return ["model", "power", "hdmi", "internet", "linkLight", "xvuStatus", "packetLoss"];
    if (isLegacyStb(key)) return ["model", "power", "hdmi", "internet", "wifi", "xvuStatus", "packetLoss"];
    if (isDigital(key)) return ["model", "power", "hdmi", "internet", "wifi", "bootLoop"];
    if (svc === "HighSpeed" && String(key).startsWith("stb"))
      return ["model", "power", "hdmi", "ethernet", "xvu", "packet"];
    return [];
  }
  const formatSummaryValue = (field, value) => {
    if (field === "internetLight") return `Internet Light ${value}`;
    if (field === "wifiLight") return `Wifi Light ${value}`;
    return String(value);
  };
  useEffect(() => {
    const lines = Object.entries(state)
      .filter(([, v]) => v && Object.keys(v).length > 0)
      .map(([k, v]) => {
        const order = orderedFieldListFor(k);
        const picked = order
          .map((f) => (v[f] ? formatSummaryValue(f, v[f]) : null))
          .filter(Boolean);
        const remaining = Object.keys(v)
          .filter((f) => !order.includes(f))
          .map((f) => formatSummaryValue(f, v[f]))
          .filter(Boolean);
        const parts = [...picked, ...remaining];
        return `${deviceLabelForSummary(k)}: ${parts.join(" | ")}`;
      });
    const txt = lines.join("\n");
    if (txt !== prev.current) {
      prev.current = txt;
      onSummaryChange(txt);
    }
  }, [state, onSummaryChange, svc, tchn]);

  // Autosize summary textarea
  const summaryRef = useRef(null);
  const autoGrow = (e) => {
    e.target.style.height = "auto";
    e.target.style.height = e.target.scrollHeight + "px";
  };
  useEffect(() => {
    if (summaryRef.current) {
      summaryRef.current.style.height = "auto";
      summaryRef.current.style.height = summaryRef.current.scrollHeight + "px";
    }
  }, [summary]);

  // Visibilidad (HighSpeed requiere connection ≠ none)
  const visible =
    svc === "HighSpeed"
      ? (tchn === "copper" || tchn === "fiber")
      : svc.startsWith("Optik");
  if (!visible) return null;

  // Mutadores + saneos
  const setField = (k, field, val) => {
    setState((p) => {
      const next = { ...(p[k] || {}), [field]: val };

      // GATEWAY FIBER: dependiente del modelo
      if (k === "gateway" && svc === "HighSpeed" && tchn === "fiber") {
        if (field === "model") {
          const m = val;
          if (m === "T3200M" || m === "Telus Wifi Hub (TWH)") {
            delete next.conn;
            delete next.lights;
          } else {
            delete next.internetLight;
            delete next.wifiLight;
          }
        }
        if (field === "conn") {
          if (val !== "ETHERNET") delete next.wanPort;
        }
      }

      // ONT: si cambia modelo y es G-010S-A o FXA5000 → sin POWER; reset lights por modelo
      if (k === "ont" && svc === "HighSpeed" && tchn === "fiber") {
        if (field === "model") {
          const m = String(val || "").toUpperCase();
          if (m === "G-010S-A" || m === "FXA5000") {
            delete next.power;
          }
          delete next.lights;
        }
      }

      // BOOSTER: WEB6000Q → sin CONNECTION; Boost V1 → sin COAX/MOCA
      if (isBoosterKey(k)) {
        if (field === "model") {
          if (val === "WEB6000Q") {
            delete next.conn;
          } else if (val === "Boost V1") {
            if (next.conn === "COAX/MOCA") next.conn = "ETHERNET";
          }
        }
      }

      // Si internet/conn deja de ser WIRELESS → quitar WIFI
      if ((isLegacyStb(k) || isDigital(k) || isBoosterKey(k)) && (field === "internet" || field === "conn")) {
        const now = field === "internet" ? val : next.conn;
        if (now !== "WIRELESS") delete next.wifi;
      }

      return { ...p, [k]: next };
    });
  };

  const clearDevice = (k) => setState((p) => ({ ...p, [k]: {} }));

  const deleteDevice = (k) => {
    if (isBoosterKey(k) && boosters > 1 && k === `booster${boosters - 1}`) {
      setBoosters((n) => Math.max(1, n - 1));
    } else if (isLegacyStb(k) && legacyStbCnt > 1 && k === `stb${legacyStbCnt - 1}`) {
      setLegacyStbCnt((n) => Math.max(1, n - 1));
    } else if (isDigital(k) && digitalCnt > 1 && k === `digital${digitalCnt - 1}`) {
      setDigitalCnt((n) => Math.max(1, n - 1));
    } else {
      return;
    }
    setState((p) => {
      const c = { ...p };
      delete c[k];
      return c;
    });
    if (active === k) {
      const firstReal = equipments.find((e) => !e.key.startsWith("add"))?.key || null;
      setActive(firstReal);
    }
  };

  const duplicateDevice = (k) => {
    if (isBoosterKey(k)) {
      if (boosters >= 4) return;
      const nextIdx = boosters;
      setBoosters((n) => Math.min(4, n + 1));
      setTimeout(() => {
        setState((p) => ({ ...p, [`booster${nextIdx}`]: { ...(p[k] || {}) } }));
        setActive(`booster${nextIdx}`);
      }, 0);
    } else if (isLegacyStb(k)) {
      if (legacyStbCnt >= 5) return;
      const nextIdx = legacyStbCnt;
      setLegacyStbCnt((n) => Math.min(5, n + 1));
      setTimeout(() => {
        setState((p) => ({ ...p, [`stb${nextIdx}`]: { ...(p[k] || {}) } }));
        setActive(`stb${nextIdx}`);
      }, 0);
    } else if (isDigital(k)) {
      if (digitalCnt >= 6) return;
      const nextIdx = digitalCnt;
      setDigitalCnt((n) => Math.min(6, n + 1));
      setTimeout(() => {
        setState((p) => ({ ...p, [`digital${nextIdx}`]: { ...(p[k] || {}) } }));
        setActive(`digital${nextIdx}`);
      }, 0);
    }
  };

  // PRESETS (no tocan MODEL)
  function pickNetPower(level) {
    if (level === "ok") return "Power Connected / Powered ON";
    if (level === "issues") return "Power Connected / No lights";
    return "Power not Connected";
  }
  function buildPresetFor(key, type) {
    const cur = state[key] || {};
    const keepModel = cur.model;
    const preset = {};
    const level = type; // "ok" | "issues" | "no"
    const prefer = level === "ok" ? "good" : level === "issues" ? "warn" : "bad";

    const setIfExists = (obj, field, value) => {
      if (value == null) return;
      if (field === "lights") {
        if (!keepModel) return;
        const list =
          (key === "ont" ? ONT_LIGHTS[keepModel] :
          key === "gateway" && svc === "HighSpeed" && tchn === "fiber"
            ? FIBER_GW_LIGHTS[keepModel]
            : null) || [];
        if (!list.includes(value)) return;
      }
      obj[field] = value;
    };

    if (key === "ont") {
      const m = String(keepModel || "").toUpperCase();
      if (!(m === "G-010S-A" || m === "FXA5000")) setIfExists(preset, "power", pickNetPower(level));
      if (keepModel) setIfExists(preset, "lights", pickLightByPreference(ONT_LIGHTS, keepModel, prefer));
    } else if (key === "gateway" && svc === "HighSpeed") {
      if (tchn === "fiber") {
        const m = keepModel;
        if (m === "T3200M") {
          setIfExists(preset, "power", pickNetPower(level));
          setIfExists(preset, "internetLight", level === "no" ? "RED" : level === "issues" ? "ORANGE" : "GREEN");
          setIfExists(preset, "wifiLight",     level === "no" ? "RED" : level === "issues" ? "YELLOW" : "GREEN");
          setIfExists(preset, "wanPort",       level === "no" ? "WAN Not Connected" : "WAN Connected");
        } else if (m === "Telus Wifi Hub (TWH)") {
          setIfExists(preset, "power", pickNetPower(level));
          // respeta orden en opciones, pero aquí es un set directo
          setIfExists(preset, "internetLight", level === "no" ? "RED" : level === "issues" ? "FLASHING GREEN" : "SOLID GREEN");
          setIfExists(preset, "wifiLight",     level === "no" ? "RED" : level === "issues" ? "PURPLE" : "BLUE");
          setIfExists(preset, "wanPort",       level === "no" ? "WAN Not Connected" : "Not Needed (SFP)");
        } else {
          // NAH
          setIfExists(preset, "power", pickNetPower(level));
          setIfExists(preset, "conn",  level === "no" ? "COAX/MOCA" : "ETHERNET");
          if (keepModel) setIfExists(preset, "lights", pickLightByPreference(FIBER_GW_LIGHTS, keepModel, prefer));
          if (preset.conn === "ETHERNET") {
            setIfExists(preset, "wanPort", level === "no" ? "WAN Not Connected" : "WAN Connected");
          }
        }
      } else {
        // COPPER (usa el mismo set de POWER que fiber)
        setIfExists(preset, "power", pickNetPower(level));
        setIfExists(preset, "internetLight", level === "no" ? "RED" : level === "issues" ? "ORANGE" : "GREEN");
        setIfExists(preset, "wifiLight",     level === "no" ? "RED" : level === "issues" ? "YELLOW" : "GREEN");
        setIfExists(preset, "dsl",       "SINGLE");
        setIfExists(preset, "dslLight",  level === "no" ? "OFF" : level === "issues" ? "1 ON & 1 OFF" : "ON");
      }
    } else if (isBoosterKey(key)) {
      // POWER unificado (cobre/fibra)
      setIfExists(preset, "power", pickNetPower(level));

      // Conexión respetando limitaciones de modelo:
      // - WEB6000Q → sin "conn" (siempre Ethernet)
      // - Boost V1 → NO COAX/MOCA
      if (keepModel !== "WEB6000Q") {
        const allowCoax = keepModel !== "Boost V1";
        const targetConn =
          level === "no"
            ? (allowCoax ? "COAX/MOCA" : "ETHERNET")
            : "ETHERNET";
        setIfExists(preset, "conn", targetConn);
      }

      // Luces por modelo (si aplica)
      if (keepModel)
        setIfExists(
          preset,
          "lights",
          pickLightByPreference(BOOSTER_LIGHTS, keepModel, prefer)
        );

      // WIFI solo si la conexión queda en WIRELESS
      // (si en el futuro habilitas el preset a WIRELESS, esto lo cubrirá)
      if (preset.conn === "WIRELESS") {
        if (level === "ok") setIfExists(preset, "wifi", "STRONG");
        if (level === "issues") setIfExists(preset, "wifi", "WEAK");
      }
    } else if (isLegacyPvr(key)) {
      setIfExists(preset, "power", level === "no" ? "Power not Connected" : level === "issues" ? "Power Connected / No lights" : "Power Connected / Powered ON");
      setIfExists(preset, "hdmi",  level === "issues" ? "HDMI Connected / Wrong Input" : "HDMI Connected / Input selected");
      setIfExists(preset, "internet", "Wired to T3200M");
      setIfExists(preset, "linkLight", level === "no" ? "FLASHING" : "SOLID");
      setIfExists(preset, "xvuStatus", level === "no" ? "Critical Error Found" : "Minor Error Found");
      setIfExists(preset, "packetLoss", level === "no" ? "Too Many Packet Loss" : "Some Packet Loss");
      if (level === "ok") {
        setIfExists(preset, "xvuStatus", "No Error Found");
        setIfExists(preset, "packetLoss", "No Packet Loss");
      }
    } else if (isLegacyStb(key)) {
      setIfExists(preset, "power", level === "no" ? "Power not Connected" : level === "issues" ? "Power Connected / No lights" : "Power Connected / Powered ON");
      setIfExists(preset, "hdmi",  level === "issues" ? "HDMI Connected / Wrong Input" : "HDMI Connected / Input selected");
      if (level === "no") {
        setIfExists(preset, "internet", "Non WIRED/WIRELESS");
      } else {
        setIfExists(preset, "internet", "WIRELESS");
        setIfExists(preset, "wifi", level === "issues" ? "WEAK" : "STRONG");
      }
      if (level === "ok") {
        setIfExists(preset, "xvuStatus", "No Error Found");
        setIfExists(preset, "packetLoss", "No Packet Loss");
      } else if (level === "issues") {
        setIfExists(preset, "xvuStatus", "Minor Error Found");
        setIfExists(preset, "packetLoss", "Some Packet Loss");
      } else {
        setIfExists(preset, "xvuStatus", "Critical Error Found");
        setIfExists(preset, "packetLoss", "Too Many Packet Loss");
      }
    } else if (isDigital(key)) {
      setIfExists(preset, "power", level === "no" ? "Power not Connected" : level === "issues" ? "Power Connected / No lights" : "Power Connected / Powered ON");
      setIfExists(preset, "hdmi",  level === "issues" ? "HDMI Connected / Wrong Input" : "HDMI Connected / Input selected");
      if (level === "no") {
        setIfExists(preset, "internet", "Non WIRED/WIRELESS");
        setIfExists(preset, "bootLoop", "YES");
      } else {
        setIfExists(preset, "internet", "WIRELESS");
        setIfExists(preset, "wifi", level === "issues" ? "WEAK" : "STRONG");
        setIfExists(preset, "bootLoop", "NO");
      }
    } else if (svc === "HighSpeed" && String(key).startsWith("stb")) {
      setIfExists(preset, "power", level === "no" ? "Off" : "On");
      setIfExists(preset, "hdmi",  level === "issues" ? "Wrong Input" : "Correct Input");
      setIfExists(preset, "ethernet", level === "no" ? "Wi-Fi" : "Wired");
      setIfExists(preset, "xvu",   level === "no" ? "Present" : "None");
      setIfExists(preset, "packet",level === "no" ? "Present" : "None");
    }

    if (keepModel != null) preset.model = keepModel; // JAMÁS tocar MODEL
    return preset;
  }
  const applyPreset = (key, type) => {
    setState((p) => {
      const base = p[key] || {};
      const preset = buildPresetFor(key, type);
      // Si el preset fija una conexión distinta a WIRELESS, no arrastres un WIFI incompatible
      if (preset.conn && preset.conn !== "WIRELESS") {
        delete preset.wifi;
      }
      return { ...p, [key]: { ...base, ...preset, model: base.model } };
    });
  };

  // LEGACY SIGNAL (✅ ⚠️ ❌) → xvuStatus + packetLoss (solo Optik TV Legacy: PVR/STB)
  const applyLegacySignal = (key, level) => {
    if (!(svc === "Optik TV Legacy" && (isLegacyPvr(key) || isLegacyStb(key)))) return;
    const map = {
      good:  { xvuStatus: "No Error Found",      packetLoss: "No Packet Loss" },
      semi:  { xvuStatus: "Minor Error Found",   packetLoss: "Some Packet Loss" },
      bad:   { xvuStatus: "Critical Error Found",packetLoss: "Too Many Packet Loss" },
    };
    const preset = map[level];
    setState((p) => {
      const base = p[key] || {};
      return { ...p, [key]: { ...base, ...preset, model: base.model } };
    });
  };

  // Píldora dispositivo con punto de estado
  const DevicePill = ({ item }) => {
    const Icon = item.icon;
    const isAdd = item.key.startsWith("add");
    const selected = active === item.key;

    if (isAdd) {
      const onAdd = () => {
        if (item.key === "addB") setBoosters((b) => Math.min(4, b + 1));
        if (item.key === "addS") setLegacyStbCnt((n) => Math.min(5, n + 1));
        if (item.key === "addD") setDigitalCnt((n) => Math.min(6, n + 1));
      };
      return (
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] text-blue-700 border-blue-200 bg-white/70 hover:bg-blue-50 dark:text-blue-300 dark:border-blue-800/40 dark:bg-gray-800/70 dark:hover:bg-blue-900/30"
        >
          <Icon size={14} />
          {item.label}
        </button>
      );
    }

    const devData = state[item.key] || {};
    const health = evalHealthForDevice(item.key, devData);
    const dot =
      health === "ok"
        ? "bg-green-500"
        : health === "issues"
        ? "bg-amber-500"
        : health === "no"
        ? "bg-red-500"
        : "bg-gray-300";

    return (
      <button
        type="button"
        onClick={() => setActive(item.key)}
        className={`relative inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] transition
          ${selected
            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30"
            : "border-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"}`}
        title={item.label}
      >
        <Icon size={14} />
        <span className="truncate max-w-[120px]">{item.label}</span>
        <span className={`ml-1 h-2 w-2 rounded-full ${dot}`} />
      </button>
    );
  };

  // Panel del activo
  const renderActivePanel = () => {
    if (!active) return null;
    const fields = getFields(active);
    const data = state[active] || {};
    const complete = isComplete(active);

    const canDelete =
      (active.startsWith("booster") && boosters > 1 && active === `booster${boosters - 1}`) ||
      (active.startsWith("stb") && legacyStbCnt > 1 && active === `stb${legacyStbCnt - 1}`) ||
      (active.startsWith("digital") && digitalCnt > 1 && active === `digital${digitalCnt - 1}`);

    const Icon = (() => {
      if (active === "ont") return Server;
      if (active === "gateway") return Router;
      if (active.startsWith("booster")) return Wifi;
      return Router;
    })();

    const showLegacySignals = svc === "Optik TV Legacy" && (isLegacyPvr(active) || isLegacyStb(active));

    return (
      <div className="rounded-lg border p-3 dark:border-gray-700 dark:bg-gray-900/40">
        {/* Header compacto */}
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className={`rounded-full p-2 ${complete ? "bg-green-500 text-white" : "bg-gray-200 dark:bg-gray-700"}`}>
              <Icon size={16} />
            </div>
            <div className="flex flex-col">
              <span className="text-[12px] font-semibold uppercase">{deviceLabelBase(active)}</span>
              <span className={`text-[10px] font-semibold uppercase ${complete ? "text-green-600" : "text-gray-500"}`}>
                {complete ? "Complete" : "Incomplete"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* PRESETS (OK / ISSUES / NO OK) */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                title="Apply OK preset"
                onClick={() => applyPreset(active, "ok")}
                className="h-5 w-5 rounded-full bg-green-500 border border-green-600"
              />
              <button
                type="button"
                title="Apply ISSUES preset"
                onClick={() => applyPreset(active, "issues")}
                className="h-5 w-5 rounded-full bg-amber-500 border border-amber-600"
              />
              <button
                type="button"
                title="Apply NO OK preset"
                onClick={() => applyPreset(active, "no")}
                className="h-5 w-5 rounded-full bg-red-500 border border-red-600"
              />
            </div>

            {/* LEGACY SIGNALS (solo Legacy PVR/STB) */}
            {showLegacySignals && (
              <div className="ml-1 flex items-center gap-1">
                <button
                  type="button"
                  title="Legacy: GOOD (XVU/Packet OK)"
                  onClick={() => applyLegacySignal(active, "good")}
                  className="px-2 py-0.5 text-[12px] rounded border border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20"
                >
                  ✅
                </button>
                <button
                  type="button"
                  title="Legacy: SEMI (Minor error / Some loss)"
                  onClick={() => applyLegacySignal(active, "semi")}
                  className="px-2 py-0.5 text-[12px] rounded border border-amber-300 bg-amber-50 dark:bg-amber-900/20"
                >
                  ⚠️
                </button>
                <button
                  type="button"
                  title="Legacy: BAD (Critical error / Too many loss)"
                  onClick={() => applyLegacySignal(active, "bad")}
                  className="px-2 py-0.5 text-[12px] rounded border border-rose-300 bg-rose-50 dark:bg-rose-900/20"
                >
                  ❌
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">
            {(active.startsWith("booster") || active.startsWith("stb") || active.startsWith("digital")) && (
              <button
                type="button"
                onClick={() => duplicateDevice(active)}
                className="rounded border px-2 py-1 text-[11px] hover:bg-blue-50 dark:hover:bg-gray-800"
                title="Duplicate"
              >
                <Copy size={12} />
              </button>
            )}
            <button
              type="button"
              onClick={() => clearDevice(active)}
              className="rounded border px-2 py-1 text-[11px] hover:bg-gray-50 dark:hover:bg-gray-800"
              title="Clear fields"
            >
              Clear
            </button>
            {canDelete && (
              <button
                type="button"
                onClick={() => deleteDevice(active)}
                className="rounded border border-red-300 px-2 py-1 text-[11px] text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                title="Delete"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Campos en grid */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {Object.entries(fields).map(([field, opts]) => {
            const isModel = field === "model";
            return (
              <FieldGroup key={field} label={field}>
                <div className="flex flex-wrap gap-1">
                  {opts.map((opt) =>
                    isModel ? (
                      <ModelOption
                        key={opt}
                        label={opt}
                        selected={data[field] === opt}
                        onClick={() => setField(active, field, opt)}
                      />
                    ) : (
                      <Chip
                        key={opt}
                        active={data[field] === opt}
                        onClick={() => setField(active, field, opt)}
                      >
                        {opt}
                      </Chip>
                    )
                  )}
                </div>
              </FieldGroup>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="mt-2 rounded border dark:border-gray-700">
      {/* Header colapsable */}
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
        <div className="space-y-3 p-3">
          {/* Barra de dispositivos */}
          <div
            className="flex items-center gap-2 overflow-x-auto"
            style={{ scrollbarWidth: "thin" }}
          >
            {equipments.map((e) => (
              <DevicePill key={e.key} item={e} />
            ))}
          </div>

          {/* Panel del activo */}
          {renderActivePanel()}

          {/* Summary */}
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
