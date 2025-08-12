// src/App.jsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Home from "./PAGES/Home";
import History from "./PAGES/History";
import Dashboard from "./PAGES/Dashboard";
import ThemeToggle from "./components/ui/ThemeToggle";
import ShortKeys from "./PAGES/ShortKeys";
import { useEffect } from "react";
import { initShortkeyRunner } from "./SHORTKEYS/ShortkeyRunner";

// Importa el controlador unificado de nota final
import NoteModalController from "./components/ui/noteModalController";

export default function App() {
  useEffect(() => {
    initShortkeyRunner({
      // habilita shortkeys en inputs/textarea con esta clase:
      selector: "textarea.shortkey-enabled, input.shortkey-enabled"
    });
  }, []);

  return (
    <>
      <ThemeToggle />

      {/* Controlador único para abrir la nota final */}
      <NoteModalController />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/history" element={<History />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/shortkeys" element={<ShortKeys />} />
        <Route path="*" element={<Navigate to="/" />} />
               
      </Routes>
    </>);

}