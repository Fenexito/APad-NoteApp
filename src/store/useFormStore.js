import create from "zustand";

export const useFormStore = create((set) => ({
  /* ═════════════ STATE ═════════════ */
  data: {
    /* 1. Customer */
    customer: { ban:"", cid:"", name:"", cbr:"", caller:"", verifiedBy:"", securityQuestions:"",
                address:"", xid:"", phone:"", accountId:"" },

    /* 2. Issue Details / Inspection / Resolution */
    issue: {
      cxIssue:"", serviceOnCsr:"", errorType:"", errorDetails:"",
      technology:"", service:"", workflow:"", affected:"",
      equipSummary:"", troubleshooting:"",
      /* AWA / diagnostics (sección 3) */
      awaSteps:"", spTests:[
        { stage:"Before", down:"", up:"", wired:false },
        { stage:"After",  down:"", up:"", wired:false },
      ],
      devicesActive:"", devicesTotal:"",
      tvsUsed:"", tvsKey:"",
    },

    /* 3. AWA alerts seleccionadas */
    alerts: [],

    /* 4. Technical Problem */
    problem: { services:[], equipment:"", connections:[], steps:[] },

    /* 5. Inspection */
    inspection: { featureName:"", findings:"" },

    /* 6. Resolution (Sección 4) */
    resolution: {
      outcome:"",          // "Resolved" | "Tech" | "Ticket" | "Transfer" | …
      /* Campos solo cuando outcome === "Tech" */
      techCbr:"", techDate:"", techTime:"", techAoc:"",
      /* outcome === "Ticket" */
      ticketSpecial:"",
      /* outcome === "Transfer" */
      transferDept:"",
      /* siempre */
      ticketFinal:"",      // obligatorio
      csrOrder:"",         // opcional
    },

    /* 7. Excellence checklist (sección 1) */
    checklist: {},
  },

  /* ═════════════ ACTIONS ═════════════ */
  updateSection: (section, payload) =>
    set((s) => ({ data: { ...s.data, [section]: { ...s.data[section], ...payload } } })),

  toggleChecklistItem: (key) =>
    set((s) => ({ data: { ...s.data, checklist: { ...s.data.checklist, [key]: !s.data.checklist[key] } } })),

  /* AWA alerts */
  toggleAlert: (key) =>
    set((s) => ({
      data: {
        ...s.data,
        alerts: s.data.alerts.includes(key)
          ? s.data.alerts.filter((k) => k !== key)
          : [...s.data.alerts, key],
      },
    })),
  clearAlerts: () => set((s) => ({ data: { ...s.data, alerts: [] } })),

  /* SpeedTests helpers */
  addSpeedTest: () =>
    set((s) => ({
      data: {
        ...s.data,
        issue: {
          ...s.data.issue,
          spTests: [
            ...s.data.issue.spTests,
            { stage:`Test ${s.data.issue.spTests.length+1}`, down:"", up:"", wired:false },
          ],
        },
      },
    })),
  updateSpeedTest: (idx, field, val) =>
    set((s) => {
      const sp=[...s.data.issue.spTests]; sp[idx]={...sp[idx],[field]:val};
      return { data:{ ...s.data, issue:{ ...s.data.issue, spTests:sp } } };
    }),
}));
