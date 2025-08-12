// tools/fix-imports.js
// Corrige imports/exports según reorg-manifest.json
// Uso:
//   node tools/fix-imports.js --dry
//   node tools/fix-imports.js --run
// Opcional:
//   --manifest ruta/a/reorg-manifest.json  (por defecto: ./reorg-manifest.json)
//
// Recomendación: commit antes y después.

const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const generate = require("@babel/generator").default;

const DRY = process.argv.includes("--dry");
const RUN = process.argv.includes("--run");
const manifestArgIdx = process.argv.findIndex(a => a === "--manifest");
const MANIFEST_PATH = manifestArgIdx !== -1
  ? process.argv[manifestArgIdx + 1]
  : "reorg-manifest.json";

if (!DRY && !RUN) {
  console.log("Uso: node tools/fix-imports.js --dry | --run [--manifest reorg-manifest.json]");
  process.exit(1);
}

const ROOT = process.cwd();
const SRC = path.join(ROOT, "src");

// Extensiones que intentaremos resolver
const EXTENSIONS = [
  "", ".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs", ".json",
  "/index.js", "/index.jsx", "/index.ts", "/index.tsx", "/index.mjs", "/index.cjs"
];

function posix(p) { return p.replace(/\\/g, "/"); }
function ensureDot(rel) {
  if (!rel.startsWith(".")) return "./" + rel;
  return rel;
}
function dropExt(p) {
  // Deja sin extensión (estilo Vite)
  return p.replace(/\.(jsx?|tsx?|mjs|cjs)$/, "");
}
function pathNoExt(p) {
  return p.replace(/\.(jsx?|tsx?|mjs|cjs|json)$/, "");
}

// Carga manifest
function loadManifest(p) {
  const full = path.isAbsolute(p) ? p : path.join(ROOT, p);
  if (!fs.existsSync(full)) {
    console.error(`No se encontró el manifest: ${full}`);
    process.exit(1);
  }
  const data = JSON.parse(fs.readFileSync(full, "utf8"));
  if (!Array.isArray(data.moves)) {
    console.error("El manifest no contiene 'moves'.");
    process.exit(1);
  }
  return data.moves;
}

// Mapa: oldAbs -> newAbs
function buildMoveMap(moves) {
  const map = new Map();
  for (const m of moves) {
    // En manifest, from/to son relativos al root
    const absFrom = path.join(ROOT, m.from);
    const absTo   = path.join(ROOT, m.to);
    map.set(posix(absFrom), posix(absTo));
  }
  return map;
}

// Resuelve un import relativo desde filePath + specifier hacia un abs path "antiguo"
function resolveImportAbs(filePath, spec) {
  const base = path.dirname(filePath);
  let probe = path.resolve(base, spec);
  probe = posix(probe);
  const list = [];
  for (const ext of EXTENSIONS) {
    list.push(probe + ext);
  }
  return list;
}

// Intenta mapear un specifier a nuevo relativo usando la tabla de movimientos
function rewriteSpecifier(filePath, spec, moveMap) {
  // 1) Si es relativo ("./" o "../")
  if (spec.startsWith(".")) {
    const candidates = resolveImportAbs(filePath, spec);
    for (const cand of candidates) {
      if (moveMap.has(cand)) {
        const newAbs = moveMap.get(cand);
        // Genera ruta relativa desde el archivo actual a la nueva ubicación
        let rel = posix(path.relative(path.dirname(filePath), newAbs));
        rel = ensureDot(rel);
        // Preserva estilo: si el import original no tenía extensión, entregamos sin extensión
        if (!/\.[a-z]+$/i.test(spec)) rel = dropExt(rel);
        return rel;
      }
    }
    return null;
  }

  // 2) Si comienza con "src/" o "/src/" (referencia root)
  if (spec.startsWith("src/") || spec.startsWith("/src/")) {
    const noSlash = spec.replace(/^\//, "");
    const abs = posix(path.join(ROOT, noSlash));
    // match directo (con extensiones)
    const absVariants = [abs, ...EXTENSIONS.filter(e => e).map(e => abs + e)];
    for (const cand of absVariants) {
      if (moveMap.has(cand)) {
        const newAbs = moveMap.get(cand);
        let newRootRel = posix(path.relative(ROOT, newAbs)); // "src/..."
        if (spec.startsWith("/")) newRootRel = "/" + newRootRel;
        // Preserva extensión si la había
        if (!/\.[a-z]+$/i.test(spec)) newRootRel = dropExt(newRootRel);
        return newRootRel;
      }
    }
    return null;
  }

  // 3) Otros casos (alias @/..., módulos npm): no tocamos
  return null;
}

// Procesa archivos código con Babel (js,jsx,ts,tsx,mjs,cjs)
async function processCodeFile(filePath, moveMap, report) {
  const code = await fsp.readFile(filePath, "utf8");
  let ast;
  try {
    ast = parser.parse(code, {
      sourceType: "unambiguous",
      plugins: ["jsx", "typescript", "dynamicImport"]
    });
  } catch (e) {
    // Puede fallar en config CJS/otros: fallback a texto
    return await processTextFile(filePath, moveMap, report);
  }

  let changed = false;
  const changes = [];

  function tryRewrite(node, rawValue) {
    const updated = rewriteSpecifier(filePath, rawValue, moveMap);
    if (updated && updated !== rawValue) {
      changes.push([rawValue, updated]);
      node.value = updated;
      changed = true;
    }
  }

  traverse(ast, {
    ImportDeclaration(pathNode) {
      const src = pathNode.node.source && pathNode.node.source.value;
      if (typeof src === "string") tryRewrite(pathNode.node.source, src);
    },
    ExportAllDeclaration(pathNode) {
      const src = pathNode.node.source && pathNode.node.source.value;
      if (typeof src === "string") tryRewrite(pathNode.node.source, src);
    },
    ExportNamedDeclaration(pathNode) {
      const src = pathNode.node.source && pathNode.node.source.value;
      if (typeof src === "string") tryRewrite(pathNode.node.source, src);
    },
    CallExpression(pathNode) {
      const callee = pathNode.node.callee;
      const args = pathNode.node.arguments || [];
      // require("...") ó import("...")
      const isRequire = callee && callee.type === "Identifier" && callee.name === "require";
      const isImportCall = callee && callee.type === "Import";
      if ((isRequire || isImportCall) && args.length === 1) {
        const arg0 = args[0];
        if (arg0 && arg0.type === "StringLiteral") {
          const raw = arg0.value;
          const updated = rewriteSpecifier(filePath, raw, moveMap);
          if (updated && updated !== raw) {
            changes.push([raw, updated]);
            arg0.value = updated;
            changed = true;
          }
        }
      }
    }
  });

  if (changed) {
    if (RUN) {
      const out = generate(ast, { retainLines: true }, code);
      await fsp.writeFile(filePath, out.code, "utf8");
    }
    report.push({ file: posix(path.relative(ROOT, filePath)), changes });
  }
}

// Procesa archivos de texto (HTML/Configs) con reemplazos básicos root-based
async function processTextFile(filePath, moveMap, report) {
  let text = await fsp.readFile(filePath, "utf8");
  let original = text;
  const changes = [];

  // En archivos no-JS, sólo reemplazamos apariciones root-based:
  // "src/..." y "/src/..."
  for (const [oldAbs, newAbs] of moveMap.entries()) {
    let oldRoot = posix(path.relative(ROOT, oldAbs)); // "src/..."
    let newRoot = posix(path.relative(ROOT, newAbs)); // "src/..."
    // sin extensión si el texto original no la tenía → difícil saber, así que reemplazo literal
    // Reemplazamos ambas variantes
    const candidates = [oldRoot, "/" + oldRoot];
    for (const cand of candidates) {
      if (text.includes(cand)) {
        const re = new RegExp(cand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
        text = text.replace(re, cand.startsWith("/") ? ("/" + newRoot) : newRoot);
        changes.push([cand, cand.startsWith("/") ? ("/" + newRoot) : newRoot]);
      }
    }
  }

  if (text !== original) {
    if (RUN) await fsp.writeFile(filePath, text, "utf8");
    report.push({ file: posix(path.relative(ROOT, filePath)), changes });
  }
}

// Recorre proyecto y aplica transformaciones
async function walk(dir, cb) {
  const entries = await fsp.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      // ignora node_modules y dist/dev-dist
      if (e.name === "node_modules" || e.name === "dist" || e.name === "dev-dist" || e.name === ".git") continue;
      await walk(p, cb);
    } else {
      await cb(p);
    }
  }
}

(async () => {
  // Cargar manifest
  const movesRaw = loadManifest(MANIFEST_PATH);
  const moveMap = buildMoveMap(movesRaw);

  const report = [];
  const extsCode = new Set([".js",".jsx",".ts",".tsx",".mjs",".cjs"]);
  const extsText = new Set([".html"]);

  // 1) Raíz (index.html y configs)
  const rootFiles = [
    "index.html",
    "package.json",             // casi nunca necesita cambios, pero lo revisamos luego si hace falta
    "package-jock.json",
    "postcss.config.cjs",
    "tailwind.config.cjs",
    "vite.config.mjs",
    "vite.config.singlefile.mjs",
  ].map(f => path.join(ROOT, f)).filter(f => fs.existsSync(f));

  for (const f of rootFiles) {
    const ext = path.extname(f);
    if (extsCode.has(ext)) await processCodeFile(f, moveMap, report);
    else await processTextFile(f, moveMap, report);
  }

  // 2) src/**
  await walk(SRC, async (filePath) => {
    const ext = path.extname(filePath);
    if (extsCode.has(ext)) {
      await processCodeFile(filePath, moveMap, report);
    } else if (extsText.has(ext)) {
      await processTextFile(filePath, moveMap, report);
    }
  });

  // Reporte
  if (report.length === 0) {
    console.log("No se detectaron cambios de imports.");
  } else {
    console.log(`Archivos modificados: ${report.length}`);
    for (const r of report) {
      console.log(`\n# ${r.file}`);
      for (const [oldV, newV] of r.changes) {
        console.log(`  - "${oldV}"  =>  "${newV}"`);
      }
    }
  }

  // Guardar reporte en JSON
  const outPath = path.join(ROOT, `fix-imports-report${DRY ? "-dry" : ""}.json`);
  await fsp.writeFile(outPath, JSON.stringify(report, null, 2), "utf8");
  console.log(`\nReporte: ${posix(path.relative(ROOT, outPath))}`);
})();
