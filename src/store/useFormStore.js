import create from "zustand";

export const useFormStore = create((set) => ({
  /* ═════════════ STATE ═════════════ */
  data: {
    /* 1. Customer */
    customer: {
      ban: "",
      cid: "",
      name: "",
      cbr: "",
      caller: "",
      verifiedBy: "",
      securityQuestions: "",
      address: "",
      xid: "",
      phone: "",
      accountId: "",
    },

    /* 2. Issue Details */
    issue: {
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
      /* Sección 3 */
      awaSteps: "",
      spTests: [
        { stage: "Before", down: "", up: "", wired: false },
        { stage: "After", down: "", up: "", wired: false },
      ],
      devicesActive: "",
      devicesTotal: "",
      tvsUsed: "",
      tvsKey: "",
    },

    /* 3. AWA alerts (sección 3) */
    alerts: [],

    /* 4. Technical Problem (por si se usa en otra sección) */
    problem: {
      services: [],
      equipment: "",
      connections: [],
      steps: [],
    },

    /* 5. Inspection (por si se usa en otra sección) */
    inspection: {
      featureName: "",
      findings: "",
    },

    /* 6. Resolution */
    resolution: {
      outcome: "",
      techCbr: "",
      techDate: "",
      techTime: "",
      techAoc: "",
      ticketSpecial: "",
      transferDept: "",
      ticketFinal: "",
      csrOrder: "",
    },

    /* 7. Excellence Mandate checklist */
    checklist: {}, // { [id:number]: "YES"|"NO"|"NA" }
  },

  /* ═════════════ ACTIONS ═════════════ */

  /** Actualiza cualquier sección de primer nivel en `data` */
  updateSection: (section, payload) =>
    set((s) => ({
      data: {
        ...s.data,
        [section]: { ...s.data[section], ...payload },
      },
    })),

  /* ── Checklist helpers ── */

  /** Toggle manual (anticuado para booleanos) */
  toggleChecklistItem: (key) =>
    set((s) => ({
      data: {
        ...s.data,
        checklist: {
          ...s.data.checklist,
          [key]: !s.data.checklist[key],
        },
      },
    })),

  /** Set explícito para auto-checks */
  setChecklistItem: (key, value) =>
    set((s) => ({
      data: {
        ...s.data,
        checklist: {
          ...s.data.checklist,
          [key]: value,
        },
      },
    })),

  /* ── AWA alerts ── */
  toggleAlert: (key) =>
    set((s) => ({
      data: {
        ...s.data,
        alerts: s.data.alerts.includes(key)
          ? s.data.alerts.filter((k) => k !== key)
          : [...s.data.alerts, key],
      },
    })),
  clearAlerts: () =>
    set((s) => ({ data: { ...s.data, alerts: [] } })),

  /* ── Speed-Tests ── */
  addSpeedTest: () =>
    set((s) => ({
      data: {
        ...s.data,
        issue: {
          ...s.data.issue,
          spTests: [
            ...s.data.issue.spTests,
            {
              stage: `Test ${s.data.issue.spTests.length + 1}`,
              down: "",
              up: "",
              wired: false,
            },
          ],
        },
      },
    })),
  updateSpeedTest: (idx, field, val) =>
    set((s) => {
      const sp = [...s.data.issue.spTests];
      sp[idx] = { ...sp[idx], [field]: val };
      return {
        data: {
          ...s.data,
          issue: { ...s.data.issue, spTests: sp },
        },
      };
    }),
}));
