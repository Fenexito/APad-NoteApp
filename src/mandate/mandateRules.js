/**
 *  Mandates + reglas auto-evaluadas
 *  Estado posible: "YES" | "NO" | "NA"
 */
export const MANDATES = [
  {
    id: 1,
    section: 1,
    text:
      "Did you secure the call by asking for a CALLBACK NUMBER?",
    eval: (d) => (!!d.customer?.cbr ? "YES" : "NO"),
  },
  {
    id: 2,
    section: 1,
    text:
      "Did you do all the relevant PROBING QUESTIONS?",
    eval: () => "NO",                   // siempre manual
  },
  {
    id: 3,
    section: 2,
    text:
      "Did you select and follow the CORRECT INSIGHT WORKFLOW?",
    eval: (d) => (!!d.issue?.workflow ? "YES" : "NO"),
  },
  {
    id: 4,
    section: 2,
    text:
      "Did you use GO/CHECKPHYSICAL to review the equipment and connections / lights / cables / damage?",
    eval: (d) => {
      const svc  = d.issue?.service ?? "";
      const tech = d.issue?.technology ?? "";
      const applicable =
        !!tech && (svc === "HighSpeed" || svc.startsWith("Optik"));
      if (!applicable) return "NA";
      return d.issue?.equipSummary ? "YES" : "NO";
    },
  },
  {
    id: 5,
    section: 2,
    text:
      "Did you do a REBOOT / FACTORY RESET? If that fixed the issue, make sure this will not be a TEMPORARY FIX.",
    eval: () => "NO",                   // manual opcional
  },
  {
    id: 6,
    section: 3,
    text:
      "Have you researched ADVANCED WIFI ANALYTICS?",
    eval: (d) => {
      const svc = d.issue?.service ?? "";
      const showAWA = svc === "HighSpeed" || svc.startsWith("Optik");
      if (!showAWA) return "NA";
      return d.alerts?.length ? "YES" : "NO";
    },
  },
    {
    id: 7,
    section: 3,
    text:
      "Have you used TVS / ROUTE THIS? Did you use video, photos, Network scan and deadspots detector?",
    /*  ✔️  NUEVA REGLA
        - Si el campo TVS KEY no se muestra  → "NA"
        - Si se muestra y está vacío         → "NO"
        - Si se muestra y tiene valor        → "YES"
    */
    eval: (d) => {
      const visible = d.issue?.tvsUsed === "Yes";   // TVS KEY aparece sólo entonces
      if (!visible) return "NA";
      return d.issue?.tvsKey ? "YES" : "NO";
    },
  },
  {
    id: 8,
    section: 4,
    text:
      "Did you perform a device/equipment SWAP? Is absolutely NECESSARY? Are you sure this will FIX THE ISSUE?",
    eval: () => "NA",                   // no obligatorio
  },
  {
    id: 9,
    section: 4,
    text:
      "Did you confirm with the cx that ALL SERVICES are WORKING now?",
    eval: () => "NO",
  },
  {
    id: 10,
    section: 4,
    text:
      "Did you use the GO/TSCOPILOT to confirm you performed all the necessary steps to resolve the issue?",
    eval: () => "NO",
  },
];

/** Devuelve { [id]: "YES" | "NO" | "NA" } para todos los mandates */
export function evaluateMandates(data) {
  const res = {};
  for (const m of MANDATES) res[m.id] = m.eval(data);
  return res;
}
