// Holt die AWS-Health-Daten und normalisiert sie zu einem Mapping
// { [regionCode]: { status: "ok"|"warning"|"critical", events: [...] } }.
//
// Default-Quelle ist der same-origin-Pfad /api/health (vom Node-Server bzw.
// vom Vite-Dev-Proxy an AWS weitergereicht). Ueberschreibbar zur Build-Zeit
// via VITE_HEALTH_URL, falls man direkt gegen einen Endpunkt fetchen will.
import { REGIONS } from "./regions.js";

const HEALTH_URL = import.meta.env.VITE_HEALTH_URL || "/api/health";

const REGION_CODES = REGIONS.map((r) => r.code)
  // laengste Codes zuerst, damit z.B. "us-east-1" vor "us-east" matcht
  .sort((a, b) => b.length - a.length);

// Aus einem beliebigen Event-Objekt den Region-Code herausziehen.
function extractRegion(ev) {
  if (ev.region && REGION_CODES.includes(ev.region)) return ev.region;
  const haystack = [ev.service, ev.service_name, ev.event_id, ev.summary]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  for (const code of REGION_CODES) {
    if (haystack.includes(code)) return code;
  }
  return null;
}

// Gilt das Event als erledigt/aufgeloest?
function isResolved(ev) {
  const status = String(ev.status ?? ev.status_code ?? "").toLowerCase();
  const summary = String(ev.summary || ev.event_type_code || "").toLowerCase();
  if (status === "0" || status === "resolved" || status === "closed") return true;
  if (summary.includes("[resolved]") || summary.includes("resolved:")) return true;
  return false;
}

// Schweregrad eines aktiven Events -> "warning" (gelb) oder "critical" (rot).
function severityOf(ev) {
  const raw = String(ev.status ?? ev.status_code ?? ev.impact ?? "").toLowerCase();
  // Legacy data.json: numerisch. 1 = informational, 2 = degradation, 3 = disruption.
  if (raw === "1" || raw === "2") return "warning";
  if (raw === "3" || Number(raw) >= 3) return "critical";
  // Textuelle Varianten (neuere Formate)
  if (/(outage|disruption|critical|down)/.test(raw)) return "critical";
  if (/(degrad|elevated|warning|informational|info)/.test(raw)) return "warning";
  // Aktives Event ohne klaren Code -> als Warnung behandeln
  return "warning";
}

function rank(status) {
  return status === "critical" ? 2 : status === "warning" ? 1 : 0;
}

// Rohantwort -> flaches Event-Array. Unterstuetzt sowohl
// die Legacy-Struktur { current: [...] } als auch ein reines Array.
function toEventArray(raw) {
  if (Array.isArray(raw)) return raw;
  if (raw && Array.isArray(raw.current)) return raw.current;
  if (raw && Array.isArray(raw.events)) return raw.events;
  return [];
}

export async function fetchHealth() {
  const res = await fetch(HEALTH_URL, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Health endpoint responded with ${res.status}`);
  const raw = await res.json();
  const events = toEventArray(raw);

  // Basis: jede Region "ok"
  const map = {};
  for (const r of REGIONS) map[r.code] = { status: "ok", events: [] };

  for (const ev of events) {
    if (isResolved(ev)) continue;
    const code = extractRegion(ev);
    if (!code || !map[code]) continue;
    const sev = severityOf(ev);
    map[code].events.push({
      summary: ev.summary || ev.event_type_code || "AWS Health Event",
      description: stripHtml(ev.description || ev.details || ""),
      date: ev.date || ev.start_time || ev.startTime || null,
      severity: sev,
    });
    if (rank(sev) > rank(map[code].status)) map[code].status = sev;
  }

  return map;
}

function stripHtml(html) {
  if (!html) return "";
  return String(html)
    .replace(/<br\s*\/?>(\s*)/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}
