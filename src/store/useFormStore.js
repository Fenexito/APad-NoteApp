import create from "zustand";

export const useFormStore = create((set) => ({
  data: {
    /* ---------------------------------------------------- */
    /* 1. Customer                                          */
    /* ---------------------------------------------------- */
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

    /* ---------------------------------------------------- */
    /* 2. Issue Details / Inspection / Resolution (NEW)     */
    /* ---------------------------------------------------- */
    issue: {
      cxIssue: "",          // Texto libre – descripción del problema
      serviceOnCsr: "",     // Active, Pending, etc.
      errorType: "",        // "", "outage", "ncError"
      errorDetails: "",     // Info obligatoria si hay error
    },

    /* ---------------------------------------------------- */
    /* 3. Technical Problem                                 */
    /* ---------------------------------------------------- */
    problem: {
      services: [],
      equipment: "",
      connections: [],
      steps: [],
    },

    /* ---------------------------------------------------- */
    /* 4. Inspection                                        */
    /* ---------------------------------------------------- */
    inspection: {
      featureName: "",
      findings: "",
    },

    /* ---------------------------------------------------- */
    /* 5. Resolution                                        */
    /* ---------------------------------------------------- */
    resolution: {
      status: "Pending",
      ticketId: "",
      summary: "",
    },

    /* ---------------------------------------------------- */
    /* 6. Checklist                                         */
    /* ---------------------------------------------------- */
    checklist: {},
  },

  /* ------------------------------------------------------ */
  /* Actualiza cualquier sección                            */
  /* ------------------------------------------------------ */
  updateSection: (section, payload) =>
    set((state) => ({
      data: {
        ...state.data,
        [section]: { ...state.data[section], ...payload },
      },
    })),

  /* ------------------------------------------------------ */
  /* Marca / desmarca ítems del checklist                   */
  /* ------------------------------------------------------ */
  toggleChecklistItem: (key) =>
    set((state) => ({
      data: {
        ...state.data,
        checklist: {
          ...state.data.checklist,
          [key]: !state.data.checklist[key],
        },
      },
    })),
}));
