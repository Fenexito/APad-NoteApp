// src/App.jsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home";
import History from "./pages/History";
import Dashboard from "./pages/Dashboard";
import ThemeToggle from "./components/ui/ThemeToggle";
import ShortKeys from "./pages/ShortKeys";
import { useEffect } from "react";
 import { initShortkeyRunner } from "./shortkeys/ShortkeyRunner";

// Importa el controlador unificado de nota final
import NoteModalController from "./components/ui/noteModalController";

export default function App() {
  useEffect(() => {
    initShortkeyRunner({
      // habilita shortkeys en inputs/textarea con esta clase:
      selector: "textarea.shortkey-enabled, input.shortkey-enabled",
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
    </>
  );
}
