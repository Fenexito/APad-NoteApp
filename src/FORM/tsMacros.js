// src/form/tsMacros.js
//
// Catálogo de macros para TROUBLESHOOTING PROCESS (Section 2).
// Se filtran según SERVICE, WORKFLOW, SERVICE ON CSR, ERROR TYPE y CONNECTION (technology).

const TROUBLESHOOTING_MACROS = [
  // ───────── Genéricos para HighSpeed ─────────
  {
    k: "hs_generic",
    label: "HS | Generic TS",
    when: {
      service: ["HighSpeed"],
    },
    text:
      "- Confirm cx impacted devices (wired / wireless)\n" +
      "- Verify status in CSR tools (ONT / Gateway / Network)\n" +
      "- Check internal wiring and equipment placement\n" +
      "- Run basic diagnostics according to alerts / symptoms\n",
  },

  {
    k: "hs_no_sync",
    label: "HS | No Sync / ONT",
    when: {
      service: ["HighSpeed"],
      workflow: ["No Sync", "ONT Not Ranged"],
    },
    text:
      "- Verify ONT / Gateway power and cabling\n" +
      "- Confirm LOS / PON / INTERNET lights status with cx\n" +
      "- Check outage / maintenance status in tools\n" +
      "- Attempt basic TS if no outage found (reboot, reseat cables)\n",
  },

  {
    k: "hs_slow_speed",
    label: "HS | SlowSpeed Wi-Fi",
    when: {
      service: ["HighSpeed"],
      workflow: ["SlowSpeed"],
    },
    text:
      "- Confirm speed degradation on multiple devices\n" +
      "- Compare wired vs wireless performance (if available)\n" +
      "- Check Wi-Fi coverage / distance / obstructions\n" +
      "- Optimize Wi-Fi channels / band steering when applicable\n",
  },

  // ───────── OUTAGE vs NC ERROR ─────────
  {
    k: "outage_flow",
    label: "OUTAGE | TS",
    when: {
      errorType: ["outage"],
    },
    text:
      "- Confirm service impact matches reported outage area\n" +
      "- Advise cx about current outage / ETR if available\n" +
      "- Avoid unnecessary in-home TS while outage is active\n" +
      "- Set correct expectations and document outage reference\n",
  },

  {
    k: "nc_error_flow",
    label: "NC Error | TS",
    when: {
      errorType: ["ncError"],
    },
    text:
      "- Identify NC error message / code in tools\n" +
      "- Validate account state and order / work order flags\n" +
      "- Follow NC handling flow (no in-depth TS at this time)\n" +
      "- Advise cx about resolution path and ticket reference\n",
  },

  // ───────── SERVICE ON CSR estados especiales ─────────
  {
    k: "svc_pending_activating",
    label: "CSR | Pending / Activating",
    when: {
      serviceOnCsr: ["Pending", "Activating"],
    },
    text:
      "- Confirm cx aware service is still Pending / Activating\n" +
      "- Review expected activation timeline in tools\n" +
      "- Validate no blockers (open orders / errors in account)\n" +
      "- Advise cx to wait for activation completion before further TS\n",
  },

  {
    k: "svc_cancelled_no_services",
    label: "CSR | Cancelled / No Services",
    when: {
      serviceOnCsr: ["Cancelled", "No Services"],
    },
    text:
      "- Confirm with cx that services show Cancelled / No Services in CSR\n" +
      "- Validate if disconnection was requested or due to non-payment\n" +
      "- Avoid in-depth TS on disconnected services\n" +
      "- Advise cx on reconnection / sales / billing flow as appropriate\n",
  },
];

// Helper para filtrar por contexto
function matches(value, expectedList) {
  if (!expectedList || expectedList.length === 0) return true;
  return expectedList.includes(value);
}

// issueCtx: { service, workflow, technology, serviceOnCsr, errorType }
export function getTroubleshootingMacros(issueCtx = {}) {
  const service = issueCtx.service || "";
  const workflow = issueCtx.workflow || "";
  const technology = issueCtx.technology || "";
  const serviceOnCsr = issueCtx.serviceOnCsr || "";
  const errorType = issueCtx.errorType || "";

  return TROUBLESHOOTING_MACROS.filter((m) => {
    const w = m.when || {};
    if (!matches(service, w.service || [])) return false;
    if (!matches(workflow, w.workflow || [])) return false;
    if (!matches(technology, w.technology || [])) return false;
    if (!matches(serviceOnCsr, w.serviceOnCsr || [])) return false;
    if (!matches(errorType, w.errorType || [])) return false;
    return true;
  });
}
