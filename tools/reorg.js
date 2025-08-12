// tools/reorg.js
// Reorganiza APAD sin modificar contenido de archivos.
// Uso:
//   node tools/reorg.js --dry   (muestra qué haría)
//   node tools/reorg.js --run   (ejecuta los movimientos)
// Recomendación: hacer commit/backup antes.

const fs = require("fs");
const fsp = fs.promises;
const path = require("path");

const DRY = process.argv.includes("--dry");
const RUN = process.argv.includes("--run");

if (!DRY && !RUN) {
  console.log("Uso: node tools/reorg.js --dry | --run");
  process.exit(1);
}

const ROOT = process.cwd();
const SRC = path.join(ROOT, "src");

// Helpers
async function ensureDir(dir) {
  await fsp.mkdir(dir, { recursive: true });
}
function exists(p) {
  try { fs.accessSync(p); return true; } catch { return false; }
}
function log(action, from, to) {
  console.log(`${action} ${from}  ->  ${to}`);
}
function rel(p) {
  return path.relative(ROOT, p).replace(/\\/g, "/");
}

async function moveIfExists(from, to, plan) {
  const absFrom = path.join(ROOT, from);
  if (!exists(absFrom)) return;
  const absTo = path.join(ROOT, to);
  plan.push({ from: rel(absFrom), to: rel(absTo), type: "file" });
}
async function moveDirIfExists(fromDir, toDir, plan) {
  const absFrom = path.join(ROOT, fromDir);
  if (!exists(absFrom)) return;
  const absTo = path.join(ROOT, toDir);
  const entries = await fsp.readdir(absFrom, { withFileTypes: true });
  for (const e of entries) {
    const srcPath = path.join(absFrom, e.name);
    const dstPath = path.join(absTo, e.name);
    plan.push({ from: rel(srcPath), to: rel(dstPath), type: e.isDirectory() ? "dir" : "file" });
  }
}

async function buildPlan() {
  const plan = [];

  // === PAGES ===
  await moveIfExists("src/pages/Dashboard.jsx", "src/PAGES/Dashboard.jsx", plan);
  await moveIfExists("src/pages/History.jsx",   "src/PAGES/History.jsx",   plan);
  await moveIfExists("src/pages/Home.jsx",      "src/PAGES/Home.jsx",      plan);
  await moveIfExists("src/pages/ShortKeys.jsx", "src/PAGES/ShortKeys.jsx", plan);

  // === FORM === (contenido de la página HOME)
  await moveIfExists("src/components/form/Buttons.jsx",        "src/FORM/Buttons.jsx", plan);
  await moveIfExists("src/components/form/EquipmentPanel.jsx", "src/FORM/EquipmentPanel.jsx", plan);
  await moveIfExists("src/components/form/FullForm.jsx",       "src/FORM/FullForm.jsx", plan);
  // Secciones (incluye ruta alternativa por si existía duplicidad)
  const sectionPairs = [
    ["src/components/form/sections/Section1.jsx", "src/FORM/SECTIONS/Section1.jsx"],
    ["src/components/form/sections/Section2.jsx", "src/FORM/SECTIONS/Section2.jsx"],
    ["src/components/form/sections/Section3.jsx", "src/FORM/SECTIONS/Section3.jsx"],
    ["src/components/form/sections/Section4.jsx", "src/FORM/SECTIONS/Section4.jsx"],
    ["src/components/form/components/form/sections/Section1.jsx", "src/FORM/SECTIONS/Section1.jsx"],
    ["src/components/form/components/form/sections/Section2.jsx", "src/FORM/SECTIONS/Section2.jsx"],
    ["src/components/form/components/form/sections/Section3.jsx", "src/FORM/SECTIONS/Section3.jsx"],
    ["src/components/form/components/form/sections/Section4.jsx", "src/FORM/SECTIONS/Section4.jsx"],
  ];
  for (const [from, to] of sectionPairs) await moveIfExists(from, to, plan);

  // mandateRules.js → FORM
  await moveIfExists("src/mandate/mandateRules.js", "src/FORM/mandate/mandateRules.js", plan);

  // === HISTORY ===
  await moveIfExists("src/components/history/HistoryList.jsx", "src/HISTORY/HistoryList.jsx", plan);
  await moveIfExists("src/components/ui/HistoryBar.jsx",       "src/HISTORY/HistoryBar.jsx",  plan);
  await moveIfExists("src/utils/history.js",                   "src/HISTORY/history.js",      plan);

  // === DASHBOARD === (si existe carpeta, mueve su contenido)
  await moveDirIfExists("src/components/dashboard", "src/DASHBOARD", plan);

  // === SHORTKEYS === (mueve carpeta completa si existe)
  await moveDirIfExists("src/shortkeys", "src/SHORTKEYS", plan);

  // === UI === (componentes transversales)
  const uiMoves = [
    ["src/components/ui/Button.jsx",               "src/UI/Button.jsx"],
    ["src/components/ui/CollapsibleChecklist.jsx", "src/UI/CollapsibleChecklist.jsx"],
    ["src/components/ui/FormSection.jsx",          "src/UI/FormSection.jsx"],
    ["src/components/ui/Header.jsx",               "src/UI/Header.jsx"],
    ["src/components/ui/MultiCheckboxPopover.jsx", "src/UI/MultiCheckboxPopover.jsx"],
    ["src/components/ui/NoteCharCounter.jsx",      "src/UI/NoteCharCounter.jsx"],
    ["src/components/ui/NoteInfoBar.jsx",          "src/UI/NoteInfoBar.jsx"],
    ["src/components/ui/SwitchRow.jsx",            "src/UI/SwitchRow.jsx"],
    ["src/components/ui/ThemeToggle.jsx",          "src/UI/ThemeToggle.jsx"],
    ["src/components/ui/ToastContext.jsx",         "src/UI/ToastContext.jsx"],
    // Hook transversal de UI
    ["src/hooks/useDisplayName.js",                "src/UI/hooks/useDisplayName.js"],
  ];
  for (const [from, to] of uiMoves) await moveIfExists(from, to, plan);

  // === UI/UTILS === (utils de UI)
  const uiUtils = [
    ["src/utils/date.js",        "src/UI/UTILS/date.js"],
    ["src/utils/noteBuilder.js", "src/UI/UTILS/noteBuilder.js"],
    ["src/utils/splitNote.js",   "src/UI/UTILS/splitNote.js"],
    // si tuvieran variantes en minúsculas (opcionales)
    ["src/utils/notebuilder.js", "src/UI/UTILS/notebuilder.js"],
    ["src/utils/splitnote.js",   "src/UI/UTILS/splitnote.js"],
  ];
  for (const [from, to] of uiUtils) await moveIfExists(from, to, plan);

  // === MODALES === (todos los modales donde sea que estén)
  const modals = [
    ["src/components/ui/ConfirmModal.jsx",     "src/MODALES/ConfirmModal.jsx"],
    ["src/components/ui/Modal.jsx",            "src/MODALES/Modal.jsx"],
    ["src/components/ui/ModalEditNote.jsx",    "src/MODALES/ModalEditNote.jsx"],
    ["src/components/ui/ModalFull.jsx",        "src/MODALES/ModalFull.jsx"],
    ["src/components/ui/ModalSplit.jsx",       "src/MODALES/ModalSplit.jsx"],
    ["src/components/ui/ModalViewNote.jsx",    "src/MODALES/ModalViewNote.jsx"],
    ["src/components/ui/LockedNoteEditor.jsx", "src/MODALES/LockedNoteEditor.jsx"],
    ["src/components/ui/noteModalController.js","src/MODALES/noteModalController.js"],
  ];
  for (const [from, to] of modals) await moveIfExists(from, to, plan);

  // === DB ===
  await moveIfExists("src/db/notes.js",          "src/DB/notes.js",         plan);
  await moveIfExists("src/store/useFormStore.js","src/DB/useFormStore.js",  plan); // ← pedido actualizado

  // === STYLES ===
  await moveIfExists("src/styles/tailwind.css", "src/STYLES/tailwind.css", plan);

  return plan;
}

async function execute(plan) {
  // crear destinos primero
  const destDirs = new Set(plan.map(p => path.dirname(path.join(ROOT, p.to))));
  for (const d of destDirs) await ensureDir(d);

  // mover
  for (const p of plan) {
    const absFrom = path.join(ROOT, p.from);
    const absTo = path.join(ROOT, p.to);
    if (!exists(absFrom)) continue;
    log("MOVE", p.from, p.to);
    await ensureDir(path.dirname(absTo));
    await fsp.rename(absFrom, absTo);
  }
}

async function writeManifest(plan) {
  const out = {
    generatedAt: new Date().toISOString(),
    dryRun: DRY,
    moves: plan,
    notes: [
      "Este manifiesto lista cada movimiento (from -> to).",
      "Después de ejecutar --run, será necesario actualizar imports.",
      "Sugerido: commit previo, y revisar cambios con git.",
    ],
  };
  const manifestPath = path.join(ROOT, "reorg-manifest.json");
  await fsp.writeFile(manifestPath, JSON.stringify(out, null, 2), "utf8");
  console.log(`\nManifiesto: ${rel(manifestPath)}`);
}

(async () => {
  if (!exists(SRC)) {
    console.error("No se encontró la carpeta src/ en el directorio actual.");
    process.exit(1);
  }

  // Avisos de raíz (no se tocan)
  const roots = [
    "index.html",
    "package.json",
    "package-jock.json",
    "postcss.config.cjs",
    "tailwind.config.cjs",
    "vite.config.mjs",
    "vite.config.singlefile.mjs",
    "src/app.jsx",
    "src/main.jsx",
  ];
  for (const rf of roots) {
    if (!exists(path.join(ROOT, rf))) {
      console.warn(`[aviso] No se encontró: ${rf} (continuando de todos modos)`);
    }
  }

  const plan = await buildPlan();

  if (plan.length === 0) {
    console.log("No hay nada para mover con la configuración actual.");
    await writeManifest(plan);
    return;
  }

  console.log(`Plan (${plan.length} movimientos):`);
  for (const p of plan) log("PLAN", p.from, p.to);

  await writeManifest(plan);

  if (DRY) {
    console.log("\nDRY-RUN completo. Nada se movió.");
    return;
  }
  if (RUN) {
    console.log("\nEjecutando movimientos...");
    await execute(plan);
    console.log("\nListo. Ejecutado.");
    return;
  }
})();
