import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { geoNaturalEarth1, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import worldData from "world-atlas/countries-110m.json";
import { REGIONS } from "./regions.js";
import { fetchHealth } from "./health.js";

const WIDTH = 960;
const HEIGHT = 500;

const REFRESH_OPTIONS = [
  { label: "1 min", ms: 60_000 },
  { label: "5 min", ms: 300_000 },
  { label: "10 min", ms: 600_000 },
];

const STATUS_COLOR = {
  ok: "#2ecc71",
  warning: "#f1c40f",
  critical: "#e74c3c",
};

const STATUS_LABEL = {
  ok: "No issues",
  warning: "Degraded",
  critical: "Disruption",
};

// Weltkarte einmalig projizieren (haengt nicht von den Health-Daten ab).
const land = feature(worldData, worldData.objects.countries);
const projection = geoNaturalEarth1().fitSize([WIDTH, HEIGHT], land);
const pathGen = geoPath(projection);
const countryPaths = land.features.map((f) => pathGen(f));

const REGION_POINTS = REGIONS.map((r) => {
  const [x, y] = projection([r.lon, r.lat]);
  return { ...r, x, y };
});

export default function App() {
  const [health, setHealth] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [intervalMs, setIntervalMs] = useState(REFRESH_OPTIONS[1].ms);
  const [selected, setSelected] = useState(null); // region code im Popup
  const [hovered, setHovered] = useState(null); // region code unter dem Cursor
  const timerRef = useRef(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const map = await fetchHealth();
      setHealth(map);
      setUpdatedAt(new Date());
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  // Direkt beim Rendern laden + Auto-Refresh nach gewaehltem Intervall.
  useEffect(() => {
    load();
    timerRef.current = setInterval(load, intervalMs);
    return () => clearInterval(timerRef.current);
  }, [load, intervalMs]);

  const counts = useMemo(() => {
    const c = { ok: 0, warning: 0, critical: 0 };
    if (health) for (const r of REGIONS) c[health[r.code]?.status || "ok"]++;
    return c;
  }, [health]);

  const selectedRegion = selected ? REGIONS.find((r) => r.code === selected) : null;
  const selectedData = selected && health ? health[selected] : null;
  const hoveredPoint = hovered ? REGION_POINTS.find((r) => r.code === hovered) : null;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-dot" />
          <h1>AWS Health Map</h1>
          <span className="region-count">{REGIONS.length} regions</span>
        </div>
        <div className="controls">
          <div className="legend">
            <Legend color={STATUS_COLOR.ok} label={`OK ${counts.ok}`} />
            <Legend color={STATUS_COLOR.warning} label={`Warning ${counts.warning}`} />
            <Legend color={STATUS_COLOR.critical} label={`Disruption ${counts.critical}`} />
          </div>
          <label className="refresh">
            <span>Refresh</span>
            <select
              value={intervalMs}
              onChange={(e) => setIntervalMs(Number(e.target.value))}
            >
              {REFRESH_OPTIONS.map((o) => (
                <option key={o.ms} value={o.ms}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      <div className="statusline">
        {error ? (
          <span className="err">Failed to load: {error}</span>
        ) : loading && !health ? (
          <span>Loading AWS health data…</span>
        ) : (
          <span>
            Updated: {updatedAt ? updatedAt.toLocaleTimeString("en-US") : "—"}
            {" · "}
            {REGIONS.length} regions
          </span>
        )}
      </div>

      <div className="map-wrap">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="map" role="img"
             aria-label="World map of AWS regions">
          <g className="land">
            {countryPaths.map((d, i) => (
              <path key={i} d={d} />
            ))}
          </g>
          <g className="regions">
            {REGION_POINTS.map((r) => {
              const status = health?.[r.code]?.status || "ok";
              const active = selected === r.code;
              return (
                <g
                  key={r.code}
                  className={`region ${active ? "active" : ""}`}
                  transform={`translate(${r.x},${r.y})`}
                  onClick={() => setSelected(r.code)}
                  onMouseEnter={() => setHovered(r.code)}
                  onMouseLeave={() => setHovered((h) => (h === r.code ? null : h))}
                  role="button"
                  tabIndex={0}
                  onFocus={() => setHovered(r.code)}
                  onBlur={() => setHovered((h) => (h === r.code ? null : h))}
                  onKeyDown={(e) => e.key === "Enter" && setSelected(r.code)}
                >
                  {status !== "ok" && (
                    <circle className="pulse" r="9" fill={STATUS_COLOR[status]} />
                  )}
                  <circle
                    r="5.5"
                    fill={STATUS_COLOR[status]}
                    stroke="#0b1622"
                    strokeWidth="1.2"
                  />
                </g>
              );
            })}
          </g>
          {hoveredPoint && (
            <g
              className="tooltip"
              transform={`translate(${hoveredPoint.x},${hoveredPoint.y})`}
            >
              <text className="tooltip-label" y="-12">
                {hoveredPoint.name}
              </text>
            </g>
          )}
        </svg>
      </div>

      {selectedRegion && (
        <Popup
          region={selectedRegion}
          data={selectedData}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function Legend({ color, label }) {
  return (
    <span className="legend-item">
      <span className="legend-dot" style={{ background: color }} />
      {label}
    </span>
  );
}

function Popup({ region, data, onClose }) {
  const status = data?.status || "ok";
  const events = data?.events || [];
  return (
    <div className="overlay" onClick={onClose}>
      <div className="popup" onClick={(e) => e.stopPropagation()}>
        <button className="close" onClick={onClose} aria-label="Close">
          ×
        </button>
        <div className="popup-head">
          <span className="status-pill" style={{ background: STATUS_COLOR[status] }}>
            {STATUS_LABEL[status]}
          </span>
          <h2>
            {region.name} <span className="code">{region.code}</span>
          </h2>
        </div>

        {events.length === 0 ? (
          <p className="no-events">No known issues in this region.</p>
        ) : (
          <ul className="events">
            {events.map((ev, i) => (
              <li key={i} className={`event sev-${ev.severity}`}>
                <div className="event-summary">{ev.summary}</div>
                {ev.description && (
                  <div className="event-desc">{ev.description}</div>
                )}
                {ev.date && (
                  <div className="event-date">{formatDate(ev.date)}</div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function formatDate(d) {
  // AWS Legacy liefert Unix-Sekunden als String; sonst best effort.
  const n = Number(d);
  const date = Number.isFinite(n) && n > 1e9 ? new Date(n * 1000) : new Date(d);
  return Number.isNaN(date.getTime()) ? String(d) : date.toLocaleString("en-US");
}
