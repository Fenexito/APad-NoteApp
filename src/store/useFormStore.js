import create from "zustand";

export const useFormStore = create((set) => ({
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
      status: "Pending",
      ticketId: "",
      summary: "",
    },
    checklist: {},
  },
  updateSection: (section, payload) =>
    set((state) => ({
      data: {
        ...state.data,
        [section]: { ...state.data[section], ...payload },
      },
    })),
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