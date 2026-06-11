// Nedbør neste 90 minutter (yr-stil): radarbasert areal-graf i 5-min steg.
// Skalaen er ulineær slik at lett/moderat/kraftig får hver sin tredjedel.

const W = 380;
const H = 100;
const CHART_LEFT = 52;
const CHART_RIGHT = 372;
const CHART_TOP = 10;
const CHART_BOTTOM = 70;

// mm/t → y-posisjon. Lett < 1, moderat 1–4, kraftig > 4 (METs terskler).
function yForRate(rate) {
  const r = Math.max(0, Number(rate) || 0);
  let frac;
  if (r <= 1) frac = (r / 1) * (1 / 3);
  else if (r <= 4) frac = (1 / 3) + ((r - 1) / 3) * (1 / 3);
  else frac = Math.min(1, (2 / 3) + ((r - 4) / 8) * (1 / 3));
  return CHART_BOTTOM - frac * (CHART_BOTTOM - CHART_TOP);
}

const GRID = [
  { label: 'Kraftig', frac: 1 },
  { label: 'Moderat', frac: 2 / 3 },
  { label: 'Lett', frac: 1 / 3 },
];
const X_TICKS = [0, 15, 30, 45, 60, 75, 90];

const NowcastChart = ({ nowcast }) => {
  if (!nowcast || !nowcast.points?.length) return null;

  const t0 = new Date(nowcast.points[0].time).getTime();
  const pts = nowcast.points
    .map((p) => ({ min: (new Date(p.time).getTime() - t0) / 60000, rate: p.rate }))
    .filter((p) => p.min >= 0 && p.min <= 90);
  if (pts.length < 2) return null;

  const xFor = (min) => CHART_LEFT + (min / 90) * (CHART_RIGHT - CHART_LEFT);
  const tørt = pts.every((p) => (p.rate || 0) < 0.1);

  return (
    <div className="vf-nowcast-card">
      <div className="vf-nowcast-head">
        <span className="vf-nowcast-dot" aria-hidden="true" />
        <h3 className="vf-nowcast-title">Nedbør neste 90 minutter</h3>
      </div>
      {tørt ? (
        <p className="vf-nowcast-dry">Det blir opphold de neste 90 minuttene.</p>
      ) : (
        <svg className="vf-nowcast-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Nedbørsintensitet neste 90 minutter">
          {GRID.map((g) => {
            const y = CHART_BOTTOM - g.frac * (CHART_BOTTOM - CHART_TOP);
            return (
              <g key={g.label}>
                <line x1={CHART_LEFT} y1={y} x2={CHART_RIGHT} y2={y} className="vf-nc-grid" />
                <text x={CHART_LEFT - 6} y={y + 3} className="vf-nc-ylabel" textAnchor="end">{g.label}</text>
              </g>
            );
          })}
          <line x1={CHART_LEFT} y1={CHART_BOTTOM} x2={CHART_RIGHT} y2={CHART_BOTTOM} className="vf-nc-axis" />
          <path
            className="vf-nc-area"
            d={[
              `M ${xFor(pts[0].min)} ${CHART_BOTTOM}`,
              ...pts.map((p) => `L ${xFor(p.min).toFixed(1)} ${yForRate(p.rate).toFixed(1)}`),
              `L ${xFor(pts[pts.length - 1].min)} ${CHART_BOTTOM} Z`,
            ].join(' ')}
          />
          {X_TICKS.map((m) => (
            <text key={m} x={xFor(m)} y={CHART_BOTTOM + 16} className="vf-nc-xlabel" textAnchor={m === 0 ? 'start' : 'middle'}>
              {m === 0 ? 'Nå' : (m === 90 ? '90 min' : m)}
            </text>
          ))}
        </svg>
      )}
    </div>
  );
};

export default NowcastChart;
