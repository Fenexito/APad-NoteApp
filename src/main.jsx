import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, HashRouter } from 'react-router-dom';
import App from "./app";
import "./styles/tailwind.css";
import { ToastProvider } from "./components/ui/ToastContext"; // usa la ruta correcta

const isFile = location.protocol === 'file:';
const Router = isFile ? HashRouter : BrowserRouter;

// Registrar Service Worker solo fuera de file:// (DEV y BUILD normal)
 if ('serviceWorker' in navigator && !isFile) {
   const swUrl  = import.meta.env.DEV ? '/dev-sw.js?dev-sw' : '/sw.js';
   const swOpts = import.meta.env.DEV ? { type: 'module' } : undefined;
   navigator.serviceWorker.register(swUrl, swOpts).catch(console.warn);
 }

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ToastProvider>
      <Router>
        <App />
      </Router>
    </ToastProvider>
  </React.StrictMode>
);
