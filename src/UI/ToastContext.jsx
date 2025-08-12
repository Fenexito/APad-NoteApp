import React, { createContext, useContext, useState, useCallback } from "react";

const ToastContext = createContext();

/**
 * Tipos soportados:
 *  - "success" | "error" | "warning" | "neutral" (o cualquier otro → info)
 */
export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const [show, setShow] = useState(false);

  const showToast = useCallback((msg, type = "success", duration = 2000) => {
    setToast({ msg, type });
    setShow(true);
    if (window.__TOAST_TIMEOUT__) clearTimeout(window.__TOAST_TIMEOUT__);
    window.__TOAST_TIMEOUT__ = setTimeout(() => {
      setShow(false);
      setTimeout(() => setToast(null), 220);
    }, duration);
  }, []);

  // Clases por tipo (incluye variantes dark)
  const getToneClasses = (type) => {
    switch (type) {
      case "success":
        return `
          bg-emerald-50/95 border-emerald-300 text-emerald-900
          dark:bg-emerald-900/90 dark:border-emerald-600/70 dark:text-emerald-100
          shadow-lg shadow-emerald-500/10 dark:shadow-black/40
        `;
      case "error":
        return `
          bg-red-50/95 border-red-300 text-red-900
          dark:bg-red-900/90 dark:border-red-600/70 dark:text-red-100
          shadow-lg shadow-red-500/10 dark:shadow-black/40
        `;
      case "warning":
        return `
          bg-amber-50/95 border-amber-300 text-amber-900
          dark:bg-amber-900/90 dark:border-amber-600/70 dark:text-amber-100
          shadow-lg shadow-amber-500/10 dark:shadow-black/40
        `;
      case "neutral":
      default:
        return `
          bg-blue-50/95 border-blue-300 text-blue-900
          dark:bg-slate-900/90 dark:border-slate-700 dark:text-slate-100
          shadow-lg shadow-blue-500/10 dark:shadow-black/40
        `;
    }
  };

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`
            fixed z-[9999] left-1/2 -translate-x-1/2 bottom-[125px]
            px-4 py-2 min-w-[140px] max-w-[400px]
            rounded-full border font-semibold
            flex items-center justify-center
            pointer-events-none
            whitespace-nowrap overflow-hidden text-ellipsis
            backdrop-blur-sm supports-[backdrop-filter]:backdrop-blur
            ${getToneClasses(toast.type)}
            ${show ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-2 scale-95"}
            transition-all duration-300
          `}
          style={{
            fontSize: "0.93rem",
            letterSpacing: "0.01em",
          }}
        >
          {toast.msg}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
