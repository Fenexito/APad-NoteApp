import create from "zustand";

export const useWizardStore = create((set) => ({
  step: 1,
  data: {
    customer: {
      name: "",
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
  },
  updateSection: (section, payload) =>
    set((state) => ({
      data: {
        ...state.data,
        [section]: { ...state.data[section], ...payload },
      },
    })),
  next: () => set((state) => ({ step: Math.min(state.step + 1, 4) })),
  prev: () => set((state) => ({ step: Math.max(state.step - 1, 1) })),
}));