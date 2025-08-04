import { Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home";
import History from "./pages/History";
import Dashboard from "./pages/Dashboard";
import CommandPalette from "./components/ui/CommandPalette";
import ThemeToggle from "./components/ui/ThemeToggle";

export default function App() {
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
    </>
  );
}
