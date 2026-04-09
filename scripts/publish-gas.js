// scripts/publish-gas.js
// Copia dist/index.html → gas/Index.html y publica con clasp
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const root = process.cwd();
const distHtml = path.join(root, 'dist', 'index.html');
const gasDir   = path.join(root, 'gas');
const gasHtml  = path.join(gasDir, 'Index.html');

if (!fs.existsSync(distHtml)) {
  console.error('❌ No existe dist/index.html. Corre primero: npm run build:single');
  process.exit(1);
}

// Garantiza carpeta
if (!fs.existsSync(gasDir)) fs.mkdirSync(gasDir, { recursive: true });

// Copia el HTML único al proyecto GAS
fs.copyFileSync(distHtml, gasHtml);
console.log('✅ Copiado dist/index.html → gas/Index.html');

// Empuja y despliega
try {
  execSync('clasp push', { stdio: 'inherit', cwd: gasDir });
  const ver = new Date().toISOString().replace(/[:.]/g,'-');
  execSync(`clasp version "deploy-${ver}"`, { stdio: 'inherit', cwd: gasDir });
  execSync('clasp deploy -d "prod"', { stdio: 'inherit', cwd: gasDir });
  console.log('🚀 Desplegado a Web App de Google Apps Script.');
  console.log('👉 Revisa la URL de despliegue en la salida anterior.');
} catch (e) {
  console.error('❌ Error al desplegar con clasp:', e.message);
  process.exit(1);
}
