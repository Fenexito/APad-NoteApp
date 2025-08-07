// src/App.jsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home";
import History from "./pages/History";
import Dashboard from "./pages/Dashboard";
import CommandPalette from "./components/ui/CommandPalette";
import ThemeToggle from "./components/ui/ThemeToggle";

// Importa el controlador unificado de nota final
import NoteModalController from "./components/ui/noteModalController";

export default function App() {
  return (
    <>
      <ThemeToggle />
      <CommandPalette />

      {/* Controlador único para abrir la nota final */}
      <NoteModalController />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/history" element={<History />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  );
}
