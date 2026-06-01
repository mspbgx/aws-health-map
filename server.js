// Minimaler Produktions-Server (kein Framework, nur Node-Standardbibliothek):
//  1. liefert die gebauten Frontend-Dateien aus ./dist
//  2. stellt /api/health bereit und holt die Daten SERVERSEITIG von AWS
//     (Server-zu-Server -> kein CORS). Antwort wird kurz gecacht.
//
// Konfiguration ueber Umgebungsvariablen:
//   PORT          (Default 8080)
//   AWS_HEALTH_URL(Default https://status.aws.amazon.com/data.json)
//   CACHE_TTL_MS  (Default 30000)

import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dirname, "dist");

const PORT = Number(process.env.PORT) || 8080;
const AWS_HEALTH_URL =
  process.env.AWS_HEALTH_URL || "https://status.aws.amazon.com/data.json";
const CACHE_TTL_MS = Number(process.env.CACHE_TTL_MS) || 30_000;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".woff2": "font/woff2",
};

let cache = { ts: 0, body: null };

async function getHealth() {
  const now = Date.now();
  if (cache.body && now - cache.ts < CACHE_TTL_MS) return cache.body;
  const res = await fetch(AWS_HEALTH_URL, {
    headers: { Accept: "application/json", "User-Agent": "aws-health-map" },
  });
  if (!res.ok) throw new Error(`AWS responded with ${res.status}`);
  // AWS liefert die Daten als UTF-16 (mit BOM). res.text() wuerde immer als
  // UTF-8 dekodieren und den Inhalt zerstoeren -> Bytes selbst dekodieren.
  const bytes = new Uint8Array(await res.arrayBuffer());
  const body = decodeBody(bytes, res.headers.get("content-type"));
  cache = { ts: now, body };
  return body;
}

function decodeBody(bytes, contentType) {
  let encoding;
  if (bytes[0] === 0xfe && bytes[1] === 0xff) encoding = "utf-16be";
  else if (bytes[0] === 0xff && bytes[1] === 0xfe) encoding = "utf-16le";
  else if (/charset=utf-16be/i.test(contentType || "")) encoding = "utf-16be";
  else if (/charset=utf-16/i.test(contentType || "")) encoding = "utf-16le";
  else encoding = "utf-8";
  // ignoreBOM:false -> ein fuehrendes BOM wird entfernt
  return new TextDecoder(encoding, { ignoreBOM: false }).decode(bytes);
}

async function serveStatic(req, res) {
  let urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
  if (urlPath === "/") urlPath = "/index.html";
  // Pfad-Traversal verhindern
  const safe = normalize(urlPath).replace(/^(\.\.[/\\])+/, "");
  let filePath = join(DIST, safe);

  try {
    const info = await stat(filePath);
    if (info.isDirectory()) filePath = join(filePath, "index.html");
    const data = await readFile(filePath);
    res.writeHead(200, { "Content-Type": MIME[extname(filePath)] || "application/octet-stream" });
    res.end(data);
  } catch {
    // SPA-Fallback auf index.html
    try {
      const html = await readFile(join(DIST, "index.html"));
      res.writeHead(200, { "Content-Type": MIME[".html"] });
      res.end(html);
    } catch {
      res.writeHead(404);
      res.end("Not found");
    }
  }
}

const server = http.createServer(async (req, res) => {
  if (req.url && req.url.startsWith("/api/health")) {
    try {
      const body = await getHealth();
      res.writeHead(200, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      });
      res.end(body);
    } catch (e) {
      res.writeHead(502, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: String(e.message || e) }));
    }
    return;
  }
  if (req.url === "/healthz") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("ok");
    return;
  }
  await serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`AWS Health Map laeuft auf http://0.0.0.0:${PORT}`);
  console.log(`Proxy-Quelle: ${AWS_HEALTH_URL}`);
});
