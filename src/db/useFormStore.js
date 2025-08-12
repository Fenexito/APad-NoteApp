import { create } from "zustand";

const useFormStore = create((set) => ({
  data: {
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
    alerts: [],
    problem: {
      services: [],
      equipment: "",
      connections: [],
      steps: [],
    },
    inspection: {
      featureName: "",
      findings: "",
    },
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
    checklist: {},
  },

  resetCount: 0, // ← este contador ayuda a forzar el reseteo visual

  updateSection: (section, payload) =>
    set((s) => ({
      data: {
        ...s.data,
        [section]: { ...s.data[section], ...payload },
      },
    })),

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

  reset: () =>
    set((s) => ({
      data: {
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
        alerts: [],
        problem: {
          services: [],
          equipment: "",
          connections: [],
          steps: [],
        },
        inspection: {
          featureName: "",
          findings: "",
        },
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
        checklist: {},
      },
      resetCount: s.resetCount + 1, // <-- cada vez que se reinicia, suma 1
    })),
}));

export default useFormStore;
