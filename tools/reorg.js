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
async function moveFile(src, dest) {
  await ensureDir(path.dirname(dest));
  await fsp.rename(src, dest);
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

// Mapeos de movimiento (solo de las rutas que indicaste)
const MOVES = [];

// === PAGES ===
[
  ["src/pages/Dashboard.jsx", "src/PAGES/Dashboard.jsx"],
  ["src/pages/History.jsx",   "src/PAGES/History.jsx"],
  ["src/pages/Home.jsx",      "src/PAGES/Home.jsx"],
  ["src/pages/ShortKeys.jsx", "src/PAGES/ShortKeys.jsx"],
].forEach(([from, to]) => MOVES.push({ from, to }));

// === FORM === (contenido de la página FORM/Home)
[
  ["src/components/form/Buttons.jsx",       "src/FORM/Buttons.jsx"],
  ["src/components/form/EquipmentPanel.jsx","src/FORM/EquipmentPanel.jsx"],
  ["src/components/form/FullForm.jsx",      "src/FORM/FullForm.jsx"],
  // secciones (soporta dos posibles rutas por si existe duplicidad accidental)
  ["src/components/form/sections/Section1.jsx", "src/FORM/SECTIONS/Section1.jsx"],
  ["src/components/form/sections/Section2.jsx", "src/FORM/SECTIONS/Section2.jsx"],
  ["src/components/form/sections/Section3.jsx", "src/FORM/SECTIONS/Section3.jsx"],
  ["src/components/form/sections/Section4.jsx", "src/FORM/SECTIONS/Section4.jsx"],
  ["src/components/form/components/form/sections/Section1.jsx", "src/FORM/SECTIONS/Section1.jsx"],
  ["src/components/form/components/form/sections/Section2.jsx", "src/FORM/SECTIONS/Section2.jsx"],
  ["src/components/form/components/form/sections/Section3.jsx", "src/FORM/SECTIONS/Section3.jsx"],
  ["src/components/form/components/form/sections/Section4.jsx", "src/FORM/SECTIONS/Section4.jsx"],
  // mandate rules (relacionadas con el form)
  ["src/mandate/mandateRules.js", "src/FORM/mandate/mandateRules.js"],
].forEach(([from, to]) => MOVES.push({ from, to }));

// === HISTORY ===
[
  ["src/components/history/HistoryList.jsx", "src/HISTORY/HistoryList.jsx"],
].forEach(([from, to]) => MOVES.push({ from, to }));

// === DASHBOARD === (mueve la carpeta completa si existe)
const DASHBOARD_DIRS = [
  ["src/components/dashboard", "src/DASHBOARD"]
];

// === SHORTKEYS ===
const SHORTKEYS_DIRS = [
  ["src/shortkeys", "src/SHORTKEYS"]
];

// === UI === (componentes transversales)
[
  ["src/components/ui/Button.jsx",               "src/UI/Button.jsx"],
  ["src/components/ui/CollapsibleChecklist.jsx", "src/UI/CollapsibleChecklist.jsx"],
  ["src/components/ui/FormSection.jsx",          "src/UI/FormSection.jsx"],
  ["src/components/ui/Header.jsx",               "src/UI/Header.jsx"],
  // mover hooks "de UI" acá
  ["src/hooks/useDisplayName.js",                "src/UI/hooks/useDisplayName.js"],
].forEach(([from, to]) => MOVES.push({ from, to }));

// === MODALES === (todos los modales, sin importar dónde se usen)
// por ahora, de tu lista explícita sólo ConfirmModal.jsx
[
  ["src/components/ui/ConfirmModal.jsx", "src/MODALES/ConfirmModal.jsx"],
].forEach(([from, to]) => MOVES.push({ from, to }));

// === DB / STORE ===
[
  ["src/db/notes.js",        "src/DB/notes.js"],
  ["src/store/useFormStore.js", "src/STORE/useFormStore.js"],
].forEach(([from, to]) => MOVES.push({ from, to }));

// === STYLES ===
[
  ["src/styles/tailwind.css", "src/STYLES/tailwind.css"],
].forEach(([from, to]) => MOVES.push({ from, to }));

// === raíz src: app.jsx / main.jsx (se quedan en raíz, solo verificamos) ===
const KEEP = [
  "src/app.jsx",
  "src/main.jsx",
];

// === Archivos raíz (sin cambios de contenido; no se mueven) ===
// index.html, package.json, package-jock.json, postcss.config.cjs, tailwind.config.cjs,
// vite.config.mjs, vite.config.singlefile.mjs

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
  // mover todo el contenido manteniendo nombres
  const entries = await fsp.readdir(absFrom, { withFileTypes: true });
  for (const e of entries) {
    const srcPath = path.join(absFrom, e.name);
    const dstPath = path.join(absTo, e.name);
    plan.push({ from: rel(srcPath), to: rel(dstPath), type: e.isDirectory() ? "dir" : "file" });
  }
}

async function buildPlan() {
  const plan = [];

  // archivos puntuales
  for (const { from, to } of MOVES) {
    await moveIfExists(from, to, plan);
  }

  // carpetas completas
  for (const [fromDir, toDir] of DASHBOARD_DIRS) {
    await moveDirIfExists(fromDir, toDir, plan);
  }
  for (const [fromDir, toDir] of SHORTKEYS_DIRS) {
    await moveDirIfExists(fromDir, toDir, plan);
  }

  return plan;
}

async function execute(plan) {
  // crear destinos primero
  const destDirs = new Set(plan.map(p => path.dirname(path.join(ROOT, p.to))));
  for (const d of destDirs) await ensureDir(d);

  // mover (archivos y carpetas; si es carpeta, ya lo manejamos por contenido)
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
  // verificaciones mínimas
  if (!exists(SRC)) {
    console.error("No se encontró la carpeta src/ en el directorio actual.");
    process.exit(1);
  }

  // advertencias (si faltan archivos clave, solo avisamos)
  const roots = [
    "index.html",
    "package.json",
    "package-jock.json",
    "postcss.config.cjs",
    "tailwind.config.cjs",
    "vite.config.mjs",
    "vite.config.singlefile.mjs",
  ];
  for (const rf of roots) {
    if (!exists(path.join(ROOT, rf))) {
      console.warn(`[aviso] No se encontró: ${rf} (continuando de todos modos)`);
    }
  }
  for (const k of KEEP) {
    if (!exists(path.join(ROOT, k))) {
      console.warn(`[aviso] Falta archivo esperado: ${k}`);
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
