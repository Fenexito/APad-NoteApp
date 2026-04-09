// src/components/ui/Header.jsx
import { useState } from "react";
import {
  PencilLine,
  Check,
  Keyboard,
  Home as HomeIcon,
  History as HistoryIcon,
  LayoutDashboard } from
"lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import useDisplayName from "./hooks/useDisplayName";
import ThemeToggle from "./ThemeToggle";

export default function Header() {
  const [name, saveName] = useDisplayName();
  const [editing, setEditing] = useState(!name);
  const [temp, setTemp] = useState(name);

  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname || "/";

  // Rutas activas
  const isHome = path === "/" || path === "/home";
  const isHistory = path.startsWith("/history");
  const isDashboard = path.startsWith("/dashboard");
  const isShortkeys = path.startsWith("/shortkeys");

  // Botón contextual (Home/History)
  let ContextIcon = isHome ? HistoryIcon : HomeIcon;
  let contextTarget = isHome ? "/history" : "/";
  let contextTitle = isHome ? "Ir a History" : "Ir a Home";
  if (isDashboard) {
    ContextIcon = HomeIcon;
    contextTarget = "/";
    contextTitle = "Ir a Home";
  }
  if (!isHome && !isHistory && !isDashboard) {
    // Para cualquier otra ruta (ej. /shortkeys), default a Home
    ContextIcon = HomeIcon;
    contextTarget = "/";
    contextTitle = "Ir a Home";
  }

  // Botón Shortkeys (interactivo) — reglas:
  // Home  -> icono Shortkeys      → /shortkeys
  // Short -> icono Dashboard      → /dashboard
  // History -> icono Dashboard    → /dashboard
  // Dashboard -> icono History    → /history
  // Otras -> icono Shortkeys      → /shortkeys
  let ShortIcon = Keyboard;
  let shortTarget = "/shortkeys";
  let shortTitle = "Abrir Shortkeys";
  if (isHome) {
    ShortIcon = Keyboard;
    shortTarget = "/shortkeys";
    shortTitle = "Abrir Shortkeys";
  } else if (isShortkeys) {
    ShortIcon = LayoutDashboard;
    shortTarget = "/dashboard";
    shortTitle = "Ir a Dashboard";
  } else if (isHistory) {
    ShortIcon = LayoutDashboard;
    shortTarget = "/dashboard";
    shortTitle = "Ir a Dashboard";
  } else if (isDashboard) {
    ShortIcon = HistoryIcon;
    shortTarget = "/history";
    shortTitle = "Ir a History";
  } else {
    ShortIcon = Keyboard;
    shortTarget = "/shortkeys";
    shortTitle = "Abrir Shortkeys";
  }

  const submit = () => {
    if (temp.trim()) {
      saveName(temp.trim());
      setEditing(false);
    }
  };

  const baseBtn =
  "inline-flex items-center justify-center rounded-md p-1.5 border border-transparent " +
  "hover:bg-blue-100/40 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-300 " +
  "transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/70";

  const baseBtnDisabled =
  "inline-flex items-center justify-center rounded-md p-1.5 border border-transparent " +
  "text-blue-400 dark:text-blue-600 opacity-50 cursor-not-allowed";

  return (
    <header
      className={`
        sticky top-0 z-30
        mx-auto w-full max-w-[580px]
        rounded-b-2xl
        sticky-surface
        shadow-xl shadow-blue-100/40 dark:shadow-black/30
        border-b border-base
        px-3 py-2 mb-5
        transition-all duration-300
      `}>
      
      <div className="flex items-center justify-between">
        {/* LADO IZQUIERDO: Título + Versión */}
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold tracking-tight text-blue-700 dark:text-blue-300 drop-shadow-sm select-none">
              APAD <span className="font-light text-blue-500 dark:text-blue-400">|</span> NOTEAPP
            </h1>
            <span
              className="ml-1 px-2 py-0.5 rounded-xl
                         bg-blue-200/60 dark:bg-blue-900/40
                         text-blue-900 dark:text-blue-100
                         text-[11px] font-semibold shadow-sm
                         border border-blue-300/30 dark:border-blue-800/40 select-none">       
              v2.4.1
            </span>
          </div>
          <span className="text-xs text-blue-900/60 dark:text-blue-200/60 font-medium tracking-wide select-none">
            Alex Van Houtven
          </span>
        </div>

        {/* LADO DERECHO: Accesos rápidos + PFTS | Nombre de agente */}
        <div className="flex items-center gap-2">
          {/* Accesos rápidos (arriba a la derecha de la versión) */}
          <div className="flex items-center gap-0">
            {/* Botón contextual (Home/History) */}
            <button
              onClick={() => navigate(contextTarget)}
              className={baseBtn}
              aria-label={contextTitle}
              title={contextTitle}>
              
              <ContextIcon size={16} />
            </button>

            {/* Shortkeys / Dashboard / History (según ruta) */}
            <button
              onClick={() => navigate(shortTarget)}
              className={baseBtn}
              aria-label={shortTitle}
              title={shortTitle}>
              
              <ShortIcon size={16} />
            </button>

            {/* Theme (inline) */}
            <ThemeToggle variant="inline" />
          </div>

          {/* Separador visual */}
          <span className="text-sm text-blue-400 dark:text-blue-500 select-none px-1">|</span>

          {/* PFTS | Nombre del agente */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-blue-700 dark:text-blue-300 select-none">PFTS</span>
            <span className="text-sm text-blue-400 dark:text-blue-500 select-none px-1">|</span>

            {editing ?
            <div className="flex items-center gap-1 animate-fade-in">
                <input
                value={temp}
                onChange={(e) => setTemp(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" ? submit() : null}
                className="w-32 border-b border-blue-300 dark:border-blue-700 bg-transparent
                             px-1 py-0.5 text-blue-900 dark:text-blue-100
                             font-semibold placeholder:text-blue-300 dark:placeholder:text-blue-500
                             focus:outline-none focus:border-blue-400 dark:focus:border-blue-500
                             transition-all duration-150"




                placeholder="Tu nombre…"
                autoFocus
                autoComplete="off" />
              
                <button
                onClick={submit}
                className="p-1 rounded hover:bg-blue-100/40 dark:hover:bg-blue-900/40 transition"
                aria-label="Guardar nombre"
                title="Guardar">
                
                  <Check size={13} className="text-green-500 dark:text-green-400" />
                </button>
              </div> :

            <button
              onClick={() => setEditing(true)}
              className="text-sm font-semibold text-blue-900 dark:text-blue-100 truncate
                           focus:outline-none group hover:text-blue-700 dark:hover:text-blue-300
                           transition flex items-center"


              aria-label="Editar nombre"
              title="Editar nombre de agente"
              style={{ minWidth: 80 }}>
              
                {name || "Agente"}
                <PencilLine
                size={12}
                className="inline ml-1 align-text-bottom
                             text-blue-400 dark:text-blue-500
                             opacity-60 group-hover:opacity-100
                             group-hover:text-blue-600 dark:group-hover:text-blue-300
                             transition" />




              
              </button>
            }
          </div>
        </div>
      </div>
    </header>);

}