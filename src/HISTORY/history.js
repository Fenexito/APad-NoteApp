// src/utils/history.js

/* ========= helpers de lectura segura ========= */
export function pick(obj, path, fallback = undefined) {
  try {
    const parts = path.split(".");
    let cur = obj;
    for (const p of parts) cur = cur?.[p];
    return cur ?? fallback;
  } catch {
    return fallback;
  }
}
export function parseDate(dstr) {
  const d = new Date(dstr || Date.now());
  return isNaN(d.getTime()) ? new Date() : d;
}
export function getCreated(n) {
  return n.createdAt || n.created || n.timestamp;
}

/* ========= parser desde el texto libre ========= */
export function parseMetaFromText(text = "") {
  try {
    const map = {};
    String(text)
      .split(/\r?\n/)
      .forEach((raw) => {
        const m = raw.match(/^\s*([A-Z][A-Z0-9 \/._-]{1,50})\s*:\s*(.+)\s*$/i);
        if (!m) return;
        const key = m[1].trim().toUpperCase();
        const val = m[2].trim();
        map[key] = val;
      });

    const read = (...keys) => {
      for (const k of keys) {
        const v = map[k];
        if (v && v.toUpperCase() !== k) return v; // evita "WORKFLOW: WORKFLOW"
      }
      return "";
    };

    // Campos principales
    const service = read("SERVICE");
    const workflow = read("WORKFLOW");

    // Outcome / Resolution (acepta RESOLUTION / RESOLVED / OUTCOME)
    const resolutionText = read("RESOLUTION", "RESOLVED", "OUTCOME");

    // Tickets
    const ticket = read("TICKET");
    const bosrTicket = read("BOSR TICKET", "BOSR");
    const ncTicket = read("NC TICKET", "NC");
    const emtTicket = read("EMT TICKET", "EMT");
    const specialTicket = bosrTicket || ncTicket || emtTicket || "";

    // Tech / Dispatch (puede venir como línea compacta)
    let techDate = read("TECH DATE", "DISPATCH DATE");
    let techTime = read("TECH TIME", "DISPATCH TIME");
    if (!techDate && !techTime) {
      const dispatch = read("DISPATCH");
      if (dispatch) {
        // Formatos permitidos: "YYYY-MM-DD - HH:MM" o con espacios/pipes
        const parts = dispatch.split(/-\s*|[\s|]+/).filter(Boolean);
        techDate = parts[0] || "";
        techTime = parts[1] || "";
      }
    }

    // Follow Up
    let followUpDate = read("FOLLOW UP DATE");
    let followUpTime = read("FOLLOW UP TIME");
    if (!followUpDate && !followUpTime) {
      const fu = read("FOLLOW UP");
      if (fu) {
        const parts = fu.split(/-\s*|[\s|]+/).filter(Boolean);
        followUpDate = parts[0] || "";
        followUpTime = parts[1] || "";
      }
    }

    return {
      service,
      workflow,
      resolutionText,
      ticket,
      bosrTicket,
      ncTicket,
      emtTicket,
      specialTicket,
      techDate,
      techTime,
      followUpDate,
      followUpTime,
    };
  } catch {
    return {};
  }
}

/* ========= getters robustos ========= */
export function getService(n) {
  const top = n.service ?? "";
  const nested = pick(n, "issue.service", "");
  if (top || nested) return top || nested;
  const meta = parseMetaFromText(n.text || "");
  return meta.service || "";
}
export function getWorkflow(n) {
  const top = n.workflow ?? "";
  const nested = pick(n, "issue.workflow", "");
  if (top || nested) return top || nested;
  const meta = parseMetaFromText(n.text || "");
  return meta.workflow || "";
}
export function getResolutionText(n) {
  return pick(n, "resolution.summary") ?? n.resolution?.outcome ?? n.outcome ?? "";
}

/* ========= decidir agenda (DISPATCH vs FOLLOW UP) con fallback al texto ========= */
export function pickScheduleToShow(note) {
  const outcome = (note.resolution?.outcome || note.outcome || "").toLowerCase();

  // 1) resolution primero
  let techD = note.resolution?.techDate || "";
  let techT = note.resolution?.techTime || "";
  let fuD = note.resolution?.followUpDate || "";
  let fuT = note.resolution?.followUpTime || "";

  // 2) si faltan TODOS, caer al texto
  if (!techD && !techT && !fuD && !fuT) {
    const meta = parseMetaFromText(note.text || "");
    techD = meta.techDate || "";
    techT = meta.techTime || "";
    fuD = meta.followUpDate || "";
    fuT = meta.followUpTime || "";
  }

  // 🩹 Clave: si el outcome es FOLLOW UP y no hay followUp*, usar tech* como fallback
  if (outcome.includes("follow up")) {
    const d = fuD || techD;
    const t = fuT || techT;
    if (d || t) return { label: "FOLLOW UP", d, t };
    return { label: "", d: "", t: "" };
  }

  if (outcome.includes("tech")) {
    if (techD || techT) return { label: "DISPATCH", d: techD, t: techT };
    return { label: "", d: "", t: "" };
  }

  // outcome no claro → prioriza FOLLOW UP; si no, DISPATCH
  if (fuD || fuT) return { label: "FOLLOW UP", d: fuD, t: fuT };
  if (techD || techT) return { label: "DISPATCH", d: techD, t: techT };
  return { label: "", d: "", t: "" };
}

/* ========= etiqueta + valor correcto para special ticket ========= */
export function getSpecialTicket(note) {
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

/* ========= tonos por outcome (colores de tarjeta) ========= */
export function outcomeClass(n) {
  const out = (n.resolution?.outcome || n.outcome || "").toLowerCase();
  const isNo = out.startsWith("no");
  const hasBOSR = !!n.bosrTicket || out.includes("bosr");
  const hasNC = !!n.ncTicket || out.includes("nc ticket");
  const isFollowUp = out.includes("follow up");
  const isTech = out.includes("tech booked") || out.includes("tech");

  if (isNo && (hasBOSR || hasNC)) return "bg-blue-50 border-blue-200 dark:bg-blue-950/40 dark:border-blue-800/40";
  if (isFollowUp) return "bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:border-rose-800/40";
  if (isTech) return "bg-violet-50 border-violet-200 dark:bg-violet-950/40 dark:border-violet-800/40";
  return "bg-white border-slate-200 dark:bg-gray-900 dark:border-gray-700";
}
