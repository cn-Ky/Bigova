// pdf.js çalışma dosyalarını node_modules'tan public/pdfjs altına kopyalar (npm install sonrası otomatik çalışır).
// Neden: PDF okuyucu (kitap görünümü) pdf.js'i kendi alan adımızdan yükler; böylece sıkı CSP (script-src 'self',
// worker-src 'self') bozulmaz ve sürüm her zaman package.json ile eşleşir.
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "node_modules", "pdfjs-dist");
const out = join(root, "public", "pdfjs");

if (!existsSync(src)) {
  console.warn("[copy-pdfjs] pdfjs-dist bulunamadı, atlandı.");
  process.exit(0);
}
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync(join(src, "build", "pdf.min.js"), join(out, "pdf.min.js"));
cpSync(join(src, "build", "pdf.worker.min.js"), join(out, "pdf.worker.min.js"));
cpSync(join(src, "standard_fonts"), join(out, "standard_fonts"), { recursive: true });
console.log("[copy-pdfjs] public/pdfjs güncellendi.");
