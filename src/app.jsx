// src/App.jsx
import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home";
import History from "./pages/History";
import Dashboard from "./pages/Dashboard";
import CommandPalette from "./components/ui/CommandPalette";
import ThemeToggle from "./components/ui/ThemeToggle";
import ModalFull from "./components/ui/ModalFull";
import { useFormStore } from "./store/useFormStore";

export default function App() {
  const data = useFormStore((s) => s.data);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState("");

  useEffect(() => {
    const handleOpenNote = () => {
      const parts = [];

      // Sección 1
      parts.push("=== ACCOUNT INFO & VERIFICATION ===");
      parts.push(JSON.stringify(data.customer, null, 2));

      // Sección 2
      parts.push("\n=== STATUS, ISSUE & TROUBLESHOOT ===");
      const {
        awaSteps,
        spTests,
        devicesActive,
        devicesTotal,
        tvsUsed,
        tvsKey,
        ...issueBase
      } = data.issue;
      parts.push(JSON.stringify(issueBase, null, 2));

      // Sección 3
      parts.push("\n=== AWA & DIAGNOSTICS ===");
      parts.push(`AWA Steps: ${data.issue.awaSteps}`);
      parts.push(`AWA Alerts: ${data.alerts.join(", ") || "N/A"}`);
      parts.push(`Speed Tests: ${JSON.stringify(data.issue.spTests, null, 2)}`);
      parts.push(`Devices Connected: Active ${data.issue.devicesActive}, Total ${data.issue.devicesTotal}`);
      parts.push(`TVS Used: ${data.issue.tvsUsed}`);
      parts.push(`TVS Key: ${data.issue.tvsKey}`);

      // Sección 4
      parts.push("\n=== RESOLUTION ===");
      parts.push(JSON.stringify(data.resolution, null, 2));

      setNoteText(parts.join("\n\n"));
      setNoteOpen(true);
    };

    window.addEventListener("OPEN_NOTE", handleOpenNote);
    return () => window.removeEventListener("OPEN_NOTE", handleOpenNote);
  }, [data]);

  return (
    <>
      <ThemeToggle />
      <CommandPalette />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/history" element={<History />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>

      <ModalFull
        open={noteOpen}
        onClose={() => setNoteOpen(false)}
        text={noteText}
      />
    </>
  );
}
