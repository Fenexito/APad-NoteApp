// tools/auto-fix-imports.js
// Ajusta imports automáticamente según la estructura ACTUAL de /src.
// Uso:
//   node tools/auto-fix-imports.js --dry   # simula
//   node tools/auto-fix-imports.js --run   # escribe cambios
//
// Qué hace:
// - Si un import ya resuelve, lo deja igual.
// - Si NO resuelve, intenta ubicar el archivo correcto dentro de /src y corrige la ruta.
// - Conoce tus nuevas carpetas: UI, MODALES, HISTORY, FORM, SHORTKEYS, DB, STYLES, DASHBOARD.
// - Reglas especiales (utils → UI/UTILS para date|noteBuilder|splitNote, etc.).
//
// Recomendación: commit antes de ejecutar.

const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const generate = require("@babel/generator").default;

const DRY = process.argv.includes("--dry");
const RUN = process.argv.includes("--run");
if (!DRY && !RUN) {
  console.log("Uso: node tools/auto-fix-imports.js --dry | --run");
  process.exit(1);
}

const ROOT = process.cwd();
const SRC = path.join(ROOT, "src");
const extsCode = new Set([".js",".jsx",".ts",".tsx",".mjs",".cjs"]);
const extsText = new Set([".html", ".htm", ".cjs", ".mjs"]);
const EXTENSIONS = [
  "", ".js",".jsx",".ts",".tsx",".mjs",".cjs",".json",
  "/index.js","/index.jsx","/index.ts","/index.tsx","/index.mjs","/index.cjs"
];

function posix(p){ return p.replace(/\\/g,"/"); }
function ensureDot(rel){ return rel.startsWith(".") ? rel : "./"+rel; }
function dropExt(p){ return p.replace(/\.(jsx?|tsx?|mjs|cjs)$/,""); }
function fileExists(p){ try{ fs.accessSync(p); return true; } catch{ return false; } }

function resolveWithExts(absNoExt){
  // prueba con EXTENSIONS (incluye "", "/index.*")
  const probes = EXTENSIONS.map(e => absNoExt + e);
  for (const p of probes){
    if (fileExists(p)) return p;
  }
  return null;
}

async function walk(dir, cb){
  const entries = await fsp.readdir(dir, { withFileTypes:true });
  for (const e of entries){
    const p = path.join(dir, e.name);
    if (e.isDirectory()){
      if (["node_modules","dist","dev-dist",".git",".vite"].includes(e.name)) continue;
      await walk(p, cb);
    } else {
      await cb(p);
    }
  }
}

// Inventario de archivos dentro de /src
const inventory = [];
const byBaseNoExt = new Map();   // 'header' -> [abs, abs...]
const byRelNoExt  = new Map();   // 'ui/header' -> abs (si único)

function addToMapArray(map, key, val){
  const k = key.toLowerCase();
  if (!map.has(k)) map.set(k, []);
  map.get(k).push(val);
}
function setIfUnique(map, key, val){
  const k = key.toLowerCase();
  const prev = map.get(k);
  if (!prev){
    map.set(k, val);
  } else if (prev !== "__MULTI__" && prev !== val){
    map.set(k, "__MULTI__"); // marca múltiples
  }
}

function noExt(p){
  return p.replace(/\.(jsx?|tsx?|mjs|cjs|json|css)$/,"");
}

function buildInventorySync(){
  // Sincrónico por simplicidad
  const stack = [SRC];
  while (stack.length){
    const dir = stack.pop();
    for (const name of fs.readdirSync(dir, { withFileTypes:true })){
      const abs = path.join(dir, name.name);
      if (name.isDirectory()){
        if (["node_modules","dist","dev-dist",".git",".vite"].includes(name.name)) continue;
        stack.push(abs);
      } else {
        const rel = posix(path.relative(SRC, abs));            // p.ej. UI/Header.jsx
        const relNo = posix(noExt(rel));                       // p.ej. UI/Header
        const baseNo = path.parse(relNo).name;                 // p.ej. Header
        inventory.push({ abs, rel, relNo, baseNo });
        addToMapArray(byBaseNoExt, baseNo, abs);
        setIfUnique(byRelNoExt, relNo, abs);
      }
    }
  }
}

// Normaliza un spec a "cola" desde src (para comparar)
function normalizeSpecifierTail(fromFile, spec){
  if (spec.startsWith(".")){
    // relativo: resolvemos hasta /src y luego quedamos con cola
    const base = path.dirname(fromFile);
    const abs = path.resolve(base, spec);
    let relToSrc = posix(path.relative(SRC, abs));
    relToSrc = relToSrc.replace(/^\.\.(\/|$)/g, ""); // limpia si se salió de src (raro)
    return relToSrc;
  }
  if (spec.startsWith("/src/")) return spec.slice(1);     // quita "/" inicial -> src/...
  if (spec.startsWith("src/"))  return spec;              // ya está root-based
  return spec; // p.ej. react, lucide-react, etc. (paquetes)
}

function applyKnownMappings(tailNoExt){
  // Reglas fijas según tu nueva estructura
  const t = tailNoExt.replace(/\\/g,"/");
  const lower = t.toLowerCase();

  // utils → UI/UTILS sólo para estos nombres
  const utilsTargets = ["date","notebuilder","splitnote","noteBuilder","splitNote"];
  const lastSeg = path.parse(t).name;

  // mapeos de prefijos
  const maps = [
    {from:"components/ui/",       to:"UI/"},
    {from:"components/history/",  to:"HISTORY/"},
    {from:"components/form/",     to:"FORM/"},
    {from:"shortkeys/",           to:"SHORTKEYS/"},
    {from:"db/",                  to:"DB/"},
    {from:"store/",               to:"DB/"}, // useFormStore
    {from:"styles/",              to:"STYLES/"},
    {from:"mandate/",             to:"FORM/mandate/"},
    {from:"utils/history",        to:"HISTORY/history"},
  ];

  for (const m of maps){
    const f = m.from.toLowerCase();
    if (lower.startsWith(f)){
      const out = m.to + t.slice(m.from.length);
      return out;
    }
  }

  // utils → UI/UTILS para casos específicos
  if (lower.startsWith("utils/") && utilsTargets.map(s => s.toLowerCase()).includes(lastSeg.toLowerCase())){
    return "UI/UTILS/" + path.posix.basename(t);
  }

  return t; // sin cambio
}

function findTargetAbs(fromFile, rawSpec){
  // Paquetes (react, lucide-react, etc.)
  if (!rawSpec.startsWith(".") && !rawSpec.startsWith("/") && !rawSpec.startsWith("src/")) {
    return null;
  }

  // 1) Si resuelve tal cual, no tocamos
  if (rawSpec.startsWith(".")){
    const base = path.dirname(fromFile);
    const absNo = path.resolve(base, rawSpec);
    const found = resolveWithExts(absNo);
    if (found) return null; // ya está ok
  }
  if (rawSpec.startsWith("/src/") || rawSpec.startsWith("src/")){
    const noSlash = rawSpec.replace(/^\//,"");
    const absNo = path.join(ROOT, noSlash);
    const found = resolveWithExts(absNo);
    if (found) return null; // ya está ok
  }

  // 2) Intentar por mapping de carpetas
  let tail = normalizeSpecifierTail(fromFile, rawSpec);
  tail = tail.replace(/^(\.\/|\.\.\/)+/g, ""); // limpiamos ./../ por si acaso
  let tailNo = noExt(tail);
  let mapped = applyKnownMappings(tailNo);     // p.ej. components/ui/Header → UI/Header

  // ¿coincide exacto en inventario?
  const candidate1 = byRelNoExt.get(mapped.toLowerCase());
  if (candidate1 && candidate1 !== "__MULTI__") {
    return posix(candidate1);
  }

  // 3) Buscar por base name
  const base = path.parse(tailNo).name;
  const hits = (byBaseNoExt.get(base.toLowerCase()) || []).map(posix);

  if (hits.length === 1) {
    return hits[0];
  }

  // 4) Buscar por dos últimos segmentos (mejor señal)
  const parts = mapped.split("/");
  const tail2 = parts.slice(-2).join("/").toLowerCase(); // ej. ui/header
  if (tail2) {
    const hit2 = inventory.find(it => it.relNo.toLowerCase().endsWith(tail2));
    if (hit2) return posix(hit2.abs);
  }

  // 5) Por último, intenta exacto tailNo sin mapping
  const candidate2 = byRelNoExt.get(tailNo.toLowerCase());
  if (candidate2 && candidate2 !== "__MULTI__") {
    return posix(candidate2);
  }

  return "__UNRESOLVED__";
}

async function processCodeFile(filePath, report){
  const code = await fsp.readFile(filePath, "utf8");
  let ast;
  try {
    ast = parser.parse(code, {
      sourceType: "unambiguous",
      plugins: ["jsx","typescript","dynamicImport"]
    });
  } catch (e) {
    // No se pudo parsear: lo tratamos como texto
    return await processTextFile(filePath, report);
  }

  let changed = false;
  const changes = [];
  const unresolved = [];

  function rewrite(node, raw){
    const hadExt = /\.[a-z]+$/i.test(raw);
    const targetAbs = findTargetAbs(filePath, raw);
    if (!targetAbs) return;                 // ya resuelve o paquete
    if (targetAbs === "__UNRESOLVED__") {
      unresolved.push(raw);
      return;
    }
    // Calcula nuevo relativo
    let rel = posix(path.relative(path.dirname(filePath), targetAbs));
    rel = ensureDot(rel);
    if (!hadExt) rel = dropExt(rel);
    if (rel !== raw){
      node.value = rel;
      changes.push([raw, rel]);
      changed = true;
    }
  }

  traverse(ast, {
    ImportDeclaration(p){
      const src = p.node.source && p.node.source.value;
      if (typeof src === "string") rewrite(p.node.source, src);
    },
    ExportAllDeclaration(p){
      const src = p.node.source && p.node.source.value;
      if (typeof src === "string") rewrite(p.node.source, src);
    },
    ExportNamedDeclaration(p){
      const src = p.node.source && p.node.source.value;
      if (typeof src === "string") rewrite(p.node.source, src);
    },
    CallExpression(p){
      const callee = p.node.callee;
      const args = p.node.arguments || [];
      const isRequire = callee && callee.type === "Identifier" && callee.name === "require";
      const isImportCall = callee && callee.type === "Import";
      if ((isRequire || isImportCall) && args.length === 1){
        const a0 = args[0];
        if (a0 && a0.type === "StringLiteral"){
          const raw = a0.value;
          const hadExt = /\.[a-z]+$/i.test(raw);
          const targetAbs = findTargetAbs(filePath, raw);
          if (!targetAbs) return;
          if (targetAbs === "__UNRESOLVED__"){ unresolved.push(raw); return; }
          let rel = posix(path.relative(path.dirname(filePath), targetAbs));
          rel = ensureDot(rel);
          if (!hadExt) rel = dropExt(rel);
          if (rel !== raw){
            a0.value = rel;
            changes.push([raw, rel]);
            changed = true;
          }
        }
      }
    }
  });

  if (changed && RUN){
    const out = generate(ast, { retainLines:true }, code);
    await fsp.writeFile(filePath, out.code, "utf8");
  }
  if (changes.length || unresolved.length){
    report.push({
      file: posix(path.relative(ROOT, filePath)),
      changes,
      unresolved
    });
  }
}

async function processTextFile(filePath, report){
  let text = await fsp.readFile(filePath, "utf8");
  let original = text;
  const changes = [];
  const unresolved = [];

  // Ajuste típico index.html: tailwind.css movido a STYLES
  // Reemplazos root-based simples para '/src/styles/tailwind.css' → '/src/STYLES/tailwind.css'
  const pairs = [
    { from: /(["'\(])\/?src\/styles\/tailwind\.css(["'\)])/g, to: '$1/src/STYLES/tailwind.css$2' },
  ];
  for (const {from,to} of pairs){
    const before = text;
    text = text.replace(from, to);
    if (text !== before){
      changes.push(["/src/styles/tailwind.css","/src/STYLES/tailwind.css"]);
    }
  }

  if (text !== original && RUN){
    await fsp.writeFile(filePath, text, "utf8");
  }
  if (changes.length || unresolved.length){
    report.push({
      file: posix(path.relative(ROOT, filePath)),
      changes,
      unresolved
    });
  }
}

(async () => {
  if (!fs.existsSync(SRC)){
    console.error("No se encontró la carpeta src/ en el proyecto.");
    process.exit(1);
  }

  buildInventorySync();

  const report = [];
  // 1) raiz: index.html y configs
  const rootFiles = [
    "index.html","postcss.config.cjs","tailwind.config.cjs","vite.config.mjs","vite.config.singlefile.mjs"
  ].map(f => path.join(ROOT, f)).filter(f => fs.existsSync(f));
  for (const f of rootFiles){
    const ext = path.extname(f);
    if (extsCode.has(ext)) await processCodeFile(f, report);
    else await processTextFile(f, report);
  }

  // 2) src/**
  await walk(SRC, async (p) => {
    const ext = path.extname(p);
    if (extsCode.has(ext)) await processCodeFile(p, report);
    else if (extsText.has(ext)) await processTextFile(p, report);
  });

  // salida de reporte
  const out = {
    generatedAt: new Date().toISOString(),
    mode: DRY ? "dry" : "run",
    stats: {
      filesTouched: report.filter(r => (r.changes && r.changes.length)).length,
      unresolvedFiles: report.filter(r => (r.unresolved && r.unresolved.length)).length,
      totalChanges: report.reduce((acc,r) => acc + (r.changes?.length||0), 0),
      totalUnresolved: report.reduce((acc,r) => acc + (r.unresolved?.length||0), 0),
    },
    report
  };
  const outPath = path.join(ROOT, `auto-fix-imports-report-${DRY ? "dry" : "run"}.json`);
  await fsp.writeFile(outPath, JSON.stringify(out,null,2), "utf8");

  console.log(`\nArchivos con cambios: ${out.stats.filesTouched} | Unresolved: ${out.stats.unresolvedFiles}`);
  console.log(`Total cambios: ${out.stats.totalChanges} | Total unresolved: ${out.stats.totalUnresolved}`);
  console.log(`Reporte: ${posix(path.relative(ROOT, outPath))}`);

  if (out.stats.totalUnresolved > 0){
    console.log("\n⚠️  Hay imports que no pude resolver automáticamente. Revísa el JSON de reporte para ver cada caso.");
  } else {
    console.log("\n✅ Listo. Todos los imports localizables fueron corregidos.");
  }
})();
