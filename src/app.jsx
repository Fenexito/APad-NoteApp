// src/App.jsx
import React, { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home";
import History from "./pages/History";
import Dashboard from "./pages/Dashboard";
import ThemeToggle from "./ui/ThemeToggle";
import ShortKeys from "./pages/ShortKeys";
import { initShortkeyRunner } from "./SHORTKEYS/ShortkeyRunner";
import CallbacksCalendar from "./pages/CallbacksCalendar";
import NoteModalController from "./modals/noteModalController";
import CallCounterWidget from "./ui/CallCounterWidget";

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
      <NoteModalController />
      <CallCounterWidget />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/history" element={<History />} />
        <Route path="/callbacks" element={<CallbacksCalendar />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/shortkeys" element={<ShortKeys />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  );
}
