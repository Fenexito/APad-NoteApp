/* src/components/ui/CommandPalette.jsx */

import { useEffect, useMemo, useState } from "react";
import { Command } from "cmdk";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Home as HomeIcon,
  LayoutDashboard,
  History,
  Keyboard,
  FileText,
  Plus,
  RefreshCcw,
  SunMoon,
  Cpu,
  UploadCloud,
  MessageCircle,
  Info,
  X,
  StickyNote,
  Frown,
} from "lucide-react";

// --- FUENTES DE DATOS ---
const NAV_ITEMS = [
  { id: "home",      label: "Inicio",    icon: <HomeIcon size={16} className="text-green-500"/>, to: "/" },
  { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={16} className="text-sky-500"/>, to: "/dashboard" },
  { id: "history",   label: "Historial", icon: <History size={16} className="text-indigo-500"/>, to: "/history" },
  { id: "shortkeys", label: "Shortkeys", icon: <Keyboard size={16} className="text-purple-500"/>, to: "/shortkeys" },
];

const ACTION_ITEMS = [
  { id: "final-note",   label: "Final Note",    icon: <FileText size={16}/>, run: () => window.dispatchEvent(new Event("OPEN_NOTE")) },
  { id: "new",          label: "New",           icon: <Plus size={16}/>, run: () => window.dispatchEvent(new Event("NEW_NOTE")) },
  { id: "reset",        label: "Reset",         icon: <RefreshCcw size={16}/>, run: () => window.dispatchEvent(new Event("RESET_NOTE")) },
  { id: "theme",        label: "Theme",         icon: <SunMoon size={16}/>, run: () => document.querySelector("[aria-label='Toggle theme']")?.click() },
  { id: "copilot",      label: "Copilot",       icon: <Cpu size={16}/>, run: () => window.dispatchEvent(new Event("OPEN_COPILOT")) },
  { id: "importexport", label: "Import/Export", icon: <UploadCloud size={16}/>, run: () => window.dispatchEvent(new Event("OPEN_IMPORT_EXPORT")) },
  { id: "feedback",     label: "Feedback",      icon: <MessageCircle size={16}/>, run: () => window.dispatchEvent(new Event("OPEN_FEEDBACK")) },
  { id: "about",        label: "About",         icon: <Info size={16}/>, run: () => window.dispatchEvent(new Event("OPEN_ABOUT")) },
];

const placeholderNotes = [
    { id: 'note-1', title: 'Reunión de marketing Q3 y sus resultados' },
    { id: 'note-2', title: 'Ideas para el nuevo proyecto "Andrómeda"' },
    { id: 'note-3', title: 'Resumen de la llamada con el cliente XYZ' },
    { id: 'note-4', title: 'Inicio' }, 
];

export default function CommandPalette() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const runNav = (to) => { setOpen(false); navigate(to); };
  const runAct = (fn) => { setOpen(false); fn(); };

  const allItems = useMemo(() => {
    const pages = NAV_ITEMS.map(item => ({ ...item, type: 'Páginas', onSelect: () => runNav(item.to) }));
    const actions = ACTION_ITEMS.map(item => ({ ...item, type: 'Acciones', onSelect: () => runAct(item.run) }));
    const notes = placeholderNotes.map(note => ({
      id: note.id,
      label: note.title,
      icon: <StickyNote size={16} className="text-yellow-500" />,
      type: 'Historial de Notas',
      onSelect: () => {
        console.log(`Navegando a la nota: ${note.id}`);
        setOpen(false);
      },
    }));

    const combinedItems = [...pages, ...actions, ...notes];
    
    const uniqueLabels = new Set();
    return combinedItems.filter(item => {
      const lowerCaseLabel = item.label.toLowerCase();
      if (uniqueLabels.has(lowerCaseLabel)) {
        return false;
      }
      uniqueLabels.add(lowerCaseLabel);
      return true;
    });

  }, []);

  const filteredItems = query
    ? allItems.filter(item => item.label.toLowerCase().includes(query.toLowerCase()))
    : allItems;

  const groupedItems = filteredItems.reduce((acc, item) => {
    (acc[item.type] = acc[item.type] || []).push(item);
    return acc;
  }, {});
  
  const groupOrder = ['Páginas', 'Acciones', 'Historial de Notas'];

  useEffect(() => {
    const onKey = (e) => {
      if ((e.key === "k" || e.key === "K") && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  
  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  if (!open) return null;

  return (
    <Command.Dialog open={open} onOpenChange={setOpen} label="Buscador Global">
      {/* ✨ Fondo oscuro y borroso añadido. Se posiciona con z-40. */}
      <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" />
      
      {/* El Command se posiciona con z-50 para estar por encima del fondo. */}
      <Command
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl shadow-2xl"
      >
        <div className="flex items-center px-4 border-b dark:border-gray-700">
          <Search size={18} className="text-gray-400 dark:text-gray-500 mr-3" />
          <Command.Input
            autoFocus
            placeholder="Escribe un comando o busca..."
            value={query}
            onValueChange={setQuery}
            className="w-full h-14 bg-transparent text-gray-800 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 text-sm outline-none"
          />
        </div>
        
        <Command.List className="max-h-[45vh] overflow-y-auto p-2">
          <Command.Empty className="flex flex-col items-center justify-center text-center p-8 space-y-2">
            <Frown className="w-10 h-10 text-gray-300 dark:text-gray-600" />
            <p className="text-sm font-medium text-gray-600 dark:text-gray-300">No se encontraron resultados</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">Intenta con otras palabras.</p>
          </Command.Empty>
          
          {groupOrder.map(groupName => 
            groupedItems[groupName] && (
              <Command.Group 
                key={groupName} 
                heading={groupName} 
                className="p-1 text-xs [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-gray-400 [&_[cmdk-group-heading]]:dark:text-gray-500 [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider"
              >
                {groupedItems[groupName].map((item) => (
                  <Command.Item
                    key={item.id}
                    onSelect={item.onSelect}
                    className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 rounded-lg cursor-pointer transition-colors duration-150 ease-in-out hover:bg-gray-100 dark:hover:bg-gray-700/50 aria-selected:bg-sky-500 aria-selected:text-white"
                  >
                    <div className="w-6 flex-shrink-0 flex items-center justify-center">
                      {item.icon}
                    </div>
                    <span className="flex-grow">{item.label}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )
          )}
        </Command.List>
      </Command>
    </Command.Dialog>
  );
}