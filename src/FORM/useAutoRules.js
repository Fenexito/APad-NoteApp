// src/form/rules/useAutoRules.js
import { useEffect, useRef } from "react";

/**
 * Hook central para reglas automáticas entre secciones.
 * - Observa transiciones prev → next en data.
 * - Aplica acciones una sola vez por cambio relevante (evita loops).
 *
 * @param {object} data Estado global del form (useFormStore().data)
 * @param {object} actions { updateSection, toggleAlert, clearAlerts }
 */
export default function useAutoRules(
  data,
  { updateSection, toggleAlert, clearAlerts }
) {
  const prevRef = useRef(data);

  useEffect(() => {
    const prev = prevRef.current || {};
    const next = data || {};
    const prevIssue = prev.issue || {};
    const nextIssue = next.issue || {};
    const prevRes = prev.resolution || {};
    const nextRes = next.resolution || {};
    const alerts = Array.isArray(next.alerts) ? next.alerts : [];
    const serviceOnCsr = nextIssue.serviceOnCsr || "";
    const service = nextIssue.service || "";

    // ======== REGLAS ========

    // Regla: si WORKFLOW cambia a "No Sync" ⇒ seleccionar AWA "Unable to get AWA. No Sync on Modem"
    // (clave de alerta: "noSync", definida en Section3.ALL_ALERTS)
    if (prevIssue.workflow !== nextIssue.workflow && nextIssue.workflow === "No Sync") {
      if (!alerts.includes("noSync")) toggleAlert("noSync");
      // Sin internet ⇒ TVS = "No | Offered but Cx don't have internet"
      if (nextIssue.tvsUsed !== "No | Offered but Cx don't have internet") {
        updateSection("issue", { tvsUsed: "No | Offered but Cx don't have internet" });
      }
    }

    // Si WORKFLOW cambia a "ONT Not Ranged" ⇒ Seleccionar AWA "ontUnranged"
    if (
      prevIssue.workflow !== nextIssue.workflow &&
      nextIssue.workflow === "ONT Not Ranged"
    ) {
      if (!alerts.includes("ontUnranged")) toggleAlert("ontUnranged"); // id exacto del alert en Section3
      // Sin internet ⇒ TVS = "No | Offered but Cx don't have internet"
      if (nextIssue.tvsUsed !== "No | Offered but Cx don't have internet") {
        updateSection("issue", { tvsUsed: "No | Offered but Cx don't have internet" });
      }
    }

    // --- SUSPENDED en Service on CSR ---
    // Al cambiar a "Suspended": ajustar Service/Workflow/TVS, colapsar Equipment,
    // y preconfigurar Resolution (transfer + ticket "0").
    if (prevIssue.serviceOnCsr !== serviceOnCsr && serviceOnCsr === "Suspended") {
      // Sección 2 (ISSUE)
      updateSection("issue", {
        service: "Others",
        workflow: "IPD Suspension",
        tvsUsed: "Not needed for this interaction",
      });
      // Señal para colapsar EquipmentPanel (escuchada por el componente)
      updateSection("ui", { equipmentCollapseSignal: Date.now() });
      // Sección 4 (RESOLUTION)
      updateSection("resolution", {
        outcome: "No | Cx needs to be transferred",
        transferDept: "FFH CAM - COLLECTIONS",
        ticketFinal: "0",
      });
    }

    // --- PENDING / ACTIVATING en Service on CSR ---
    // Al cambiar a "Pending" o "Activating":
    // - ERROR se fija en "NC Error"
    // - TVS = "Not needed for this interaction"
    // - Resolution = "No | NC Ticket Created" con ticket "0"
    if (
      prevIssue.serviceOnCsr !== serviceOnCsr &&
      (serviceOnCsr === "Pending" || serviceOnCsr === "Activating")
    ) {
      // Sección 2 (ISSUE) → activar NC Error y TVS NNFTI
      updateSection("issue", {
        errorType: "ncError",
        tvsUsed: "Not needed for this interaction",
      });

      // Sección 4 (RESOLUTION) → NC Ticket con "0"
      updateSection("resolution", {
        outcome: "No | NC Ticket Created",
        ticketFinal: "0",
      });
    }

    // --- Servicios donde TVS siempre es "Not needed for this interaction" ---
    const NO_TVS_SERVICES = new Set([
      "Others",
      "Telus Email",
      "MyTelus",
      "Telus Online Security",
      "Telus Connect App",
      "SHS Legacy",
      "Living Well Companion",
    ]);
    if (prevIssue.service !== service && NO_TVS_SERVICES.has(service)) {
      if (nextIssue.tvsUsed !== "Not needed for this interaction") {
        updateSection("issue", { tvsUsed: "Not needed for this interaction" });
      }
    }

    // --- CANCELLED en Service on CSR ---
    // Misma lógica base que Suspended, pero transferimos a FFH CARE.
    if (prevIssue.serviceOnCsr !== serviceOnCsr && serviceOnCsr === "Cancelled") {
      // Sección 2 (ISSUE)
      updateSection("issue", {
        service: "Others",
        workflow: "IPD Suspension",
        tvsUsed: "Not needed for this interaction",
      });
      // Señal para colapsar EquipmentPanel (escuchada por el componente)
      updateSection("ui", { equipmentCollapseSignal: Date.now() });
      // Sección 4 (RESOLUTION)
      updateSection("resolution", {
        outcome: "No | Cx needs to be transferred",
        transferDept: "FFH CARE",
        ticketFinal: "0",
      });
    }
    
    // ========================

    prevRef.current = next;
  }, [data, updateSection, toggleAlert, clearAlerts]);
}
