import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

/**
 * Props:
 * - variant: "inline" | "floating" (default "floating")
 * - className: clases extra para el botón
 */
export default function ThemeToggle({ variant = "floating", className = "" }) {
  const prefersDark = () =>
    window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;

  const [dark, setDark] = useState(() =>
    localStorage.theme ? localStorage.theme === "dark" : prefersDark()
  );

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", dark);
    root.style.colorScheme = dark ? "dark" : "light";
    root.setAttribute("data-theme", dark ? "dark" : "light");
    localStorage.theme = dark ? "dark" : "light";
  }, [dark]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e) => {
      if (!("theme" in localStorage)) setDark(e.matches);
    };
    mq.addEventListener ? mq.addEventListener("change", handler) : mq.addListener(handler);
    return () => {
      mq.removeEventListener ? mq.removeEventListener("change", handler) : mq.removeListener(handler);
    };
  }, []);

  const isInline = variant === "inline";

  const baseInline =
    "inline-flex items-center justify-center rounded-md p-1.5 border border-transparent " +
    "hover:bg-blue-100/40 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-300 " +
    "transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/70";
  const baseFloating =
    "fixed bottom-4 right-4 rounded-full border p-2 shadow-md " +
    "bg-white/90 dark:bg-gray-800/90 border-gray-300 dark:border-gray-600 " +
    "backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-gray-800/60 " +
    "transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/70";

  return (
    <button
      className={`${isInline ? baseInline : baseFloating} ${className}`}
      onClick={() => setDark((d) => !d)}
      aria-label="Toggle theme"
      aria-pressed={dark}
      title={dark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
    >
      {dark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
