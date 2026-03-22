import { useState, useMemo } from 'react';
import { ALL_BUILDS } from '../data/builds.js';
import { useEventStore } from '../store/eventStore.js';

// ALL_BUILDS and useEventStore imported above

const STATUS_COLORS = {
  SUCCESS:  '#18C964',
  FAILURE:  '#F31260',
  ABORTED:  '#7B7E8C',
  UNSTABLE: '#E07B39',
  RUNNING:  '#F5A623',
};

// ─────────────────────────────────────────────────────────────────────────────
// FILTER HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function unique(arr) { return [...new Set(arr)].sort(); }

// ─────────────────────────────────────────────────────────────────────────────
// SHARED STYLE TOKENS
// ─────────────────────────────────────────────────────────────────────────────

const card = {
  background:   'var(--bg-surface)',
  border:       '1px solid var(--border-subtle)',
  borderRadius: 'var(--radius-lg)',
  padding:      '20px',
};

const sectionTitle = {
  fontSize:     '0.72rem',
  fontWeight:   600,
  color:        'var(--text-muted)',
  textTransform:'uppercase',
  letterSpacing:'0.06em',
  marginBottom: '14px',
};

const selectStyle = {
  background:   'var(--bg-surface-2)',
  color:        'var(--text-primary)',
  border:       '1px solid var(--border-muted)',
  borderRadius: 'var(--radius-sm)',
  padding:      '5px 10px',
  fontSize:     '0.78rem',
  cursor:       'pointer',
  outline:      'none',
  minWidth:     '150px',
};

const thStyle = {
  padding:       '8px 12px',
  textAlign:     'left',
  color:         'var(--text-muted)',
  fontWeight:    600,
  fontSize:      '0.7rem',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  whiteSpace:    'nowrap',
};

const tdStyle = {
  padding:    '9px 12px',
  fontSize:   '0.8rem',
  color:      'var(--text-secondary)',
  whiteSpace: 'nowrap',
};

// ─────────────────────────────────────────────────────────────────────────────
// FILTER BAR  (local to CI Build Metrics)
// ─────────────────────────────────────────────────────────────────────────────

const TIMELINES = [
  { key: '1w', label: '1W' },
  { key: '1m', label: '1M' },
  { key: '6m', label: '6M' },
];

function CIFilterBar({ filters, onChange, builds, totalBuilds }) {
  const products     = useMemo(() => unique(builds.map((b) => b.product)), [builds]);
  const releases     = useMemo(() => unique(builds.filter((b) => !filters.product || b.product === filters.product).map((b) => b.release)), [builds, filters.product]);
  const buildNumbers = useMemo(() => unique(builds.filter((b) => (!filters.product || b.product === filters.product) && (!filters.release || b.release === filters.release)).map((b) => b.build)), [builds, filters.product, filters.release]);

  function set(key, val) { onChange({ ...filters, [key]: val || null }); }

  const hasFilters = filters.product || filters.release || filters.buildNumber;

  return (
    <div style={{
      display:      'flex',
      alignItems:   'center',
      gap:          '10px',
      flexWrap:     'wrap',
      padding:      '12px 24px',
      background:   'var(--bg-surface)',
      borderBottom: '1px solid var(--border-subtle)',
    }}>
      {/* Product */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
        <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Product</label>
        <select style={selectStyle} value={filters.product ?? ''} onChange={(e) => { onChange({ ...filters, product: e.target.value || null, release: null, buildNumber: null }); }}>
          <option value="">All Products</option>
          {products.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {/* Release */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
        <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Release</label>
        <select style={selectStyle} value={filters.release ?? ''} onChange={(e) => set('release', e.target.value)}>
          <option value="">All Releases</option>
          {releases.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      {/* Build Number */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
        <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Build #</label>
        <select style={{ ...selectStyle, minWidth: '120px' }} value={filters.buildNumber ?? ''} onChange={(e) => set('buildNumber', e.target.value)}>
          <option value="">All Builds</option>
          {buildNumbers.map((b) => <option key={b} value={b}>#{b}</option>)}
        </select>
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Timeline */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'flex-end' }}>
        <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Timeline</label>
        <div style={{ display: 'flex', gap: '4px' }}>
          {TIMELINES.map((t) => (
            <button key={t.key} onClick={() => set('timeline', t.key)}
              style={{
                background:   filters.timeline === t.key ? 'var(--accent-blue)' : 'var(--bg-surface-2)',
                color:        filters.timeline === t.key ? '#fff' : 'var(--text-secondary)',
                border:       `1px solid ${filters.timeline === t.key ? 'var(--accent-blue)' : 'var(--border-muted)'}`,
                borderRadius: 'var(--radius-sm)',
                padding:      '5px 12px',
                fontSize:     '0.78rem',
                fontWeight:   filters.timeline === t.key ? 600 : 400,
                cursor:       'pointer',
              }}
            >{t.label}</button>
          ))}
        </div>
      </div>

      {/* Clear */}
      {hasFilters && (
        <button onClick={() => onChange({ product: null, release: null, buildNumber: null, timeline: filters.timeline })}
          style={{ background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '5px 10px', fontSize: '0.75rem', cursor: 'pointer', alignSelf: 'flex-end' }}>
          Clear
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTIVE FILTER CHIPS
// ─────────────────────────────────────────────────────────────────────────────

function FilterChips({ filters, count }) {
  const chips = [];
  if (filters.product)     chips.push({ label: `Product: ${filters.product}` });
  if (filters.release)     chips.push({ label: `Release: ${filters.release}` });
  if (filters.buildNumber) chips.push({ label: `Build: #${filters.buildNumber}` });

  if (chips.length === 0 && count === ALL_BUILDS.length) return null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 24px', background: 'var(--bg-base)', borderBottom: '1px solid var(--border-subtle)', flexWrap: 'wrap' }}>
      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Showing {count} build{count !== 1 ? 's' : ''}</span>
      {chips.map((c) => (
        <span key={c.label} style={{ padding: '2px 10px', borderRadius: '999px', background: 'rgba(59,130,246,0.12)', color: 'var(--accent-blue)', fontSize: '0.72rem', fontWeight: 500 }}>
          {c.label}
        </span>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STATUS BADGE
// ─────────────────────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const color = STATUS_COLORS[status] || '#4A5568';
  return (
    <span style={{
      padding: '2px 8px', borderRadius: '999px',
      background: `${color}18`, color, fontSize: '0.7rem', fontWeight: 700,
      fontFamily: 'var(--font-mono)', letterSpacing: '0.03em',
    }}>{status}</span>
  );
}

function fmtDur(s) {
  if (!s) return '—';
  if (s < 60)   return `${s}s`;
  const m = Math.floor(s / 60), r = s % 60;
  return r > 0 ? `${m}m ${r}s` : `${m}m`;
}

// ─────────────────────────────────────────────────────────────────────────────
// GREEN BUILD TAB
// ─────────────────────────────────────────────────────────────────────────────

function GreenBuildTab({ builds }) {
  const total   = builds.length;
  const success = builds.filter((b) => b.status === 'SUCCESS').length;
  const rate    = total ? Math.round((success / total) * 100) : 0;

  // Per-product summary
  const byProduct = useMemo(() => {
    const map = {};
    builds.forEach((b) => {
      if (!map[b.product]) map[b.product] = { product: b.product, releases: new Set(), platforms: new Set(), success: 0, fail: 0, total: 0, builds: [] };
      map[b.product].releases.add(b.release);
      map[b.product].platforms.add(b.platform);
      map[b.product].total++;
      if (b.status === 'SUCCESS') map[b.product].success++;
      else map[b.product].fail++;
      map[b.product].builds.push(b);
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [builds]);

  // Per-build detail table
  const buildRows = [...builds].sort((a, b) => Number(b.build) - Number(a.build)).slice(0, 20);

  const rateColor = rate >= 90 ? '#18C964' : rate >= 75 ? '#F5A623' : '#F31260';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px' }}>
        <div style={{ ...card, gridColumn: 'span 2' }}>
          <p style={sectionTitle}>Overall Green Build Rate</p>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px' }}>
            <span style={{ fontSize: '3rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: rateColor }}>{rate}%</span>
            <div style={{ marginBottom: '8px' }}>
              <span style={{ padding: '3px 8px', borderRadius: '999px', background: `${rateColor}18`, color: rateColor, fontSize: '0.75rem', fontWeight: 600 }}>
                {success} / {total} builds
              </span>
            </div>
          </div>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            {total} build{total !== 1 ? 's' : ''} in selected scope
          </p>
        </div>

        {[
          { label: 'Success', count: builds.filter(b=>b.status==='SUCCESS').length,  color: '#18C964' },
          { label: 'Failure', count: builds.filter(b=>b.status==='FAILURE').length,  color: '#F31260' },
          { label: 'Aborted', count: builds.filter(b=>b.status==='ABORTED').length,  color: '#7B7E8C' },
          { label: 'Unstable',count: builds.filter(b=>b.status==='UNSTABLE').length, color: '#E07B39' },
        ].map((s) => (
          <div key={s.label} style={card}>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</p>
            <p style={{ fontSize: '1.8rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: s.color }}>{s.count}</p>
          </div>
        ))}
      </div>

      {/* Per-product summary */}
      <div style={card}>
        <p style={sectionTitle}>Green Rate by Product · Release · Platform</p>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              {['Product', 'Releases', 'Platforms', 'Builds', 'Success', 'Fail/Other', 'Green Rate', ''].map((h) => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {byProduct.map((p) => {
              const r = Math.round((p.success / p.total) * 100);
              const c = r >= 90 ? '#18C964' : r >= 75 ? '#F5A623' : '#F31260';
              return (
                <tr key={p.product} style={{ borderBottom: '1px solid var(--border-subtle)' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-surface-2)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ ...tdStyle, color: 'var(--text-primary)', fontWeight: 600 }}>{p.product}</td>
                  <td style={tdStyle}>{[...p.releases].sort().join(', ')}</td>
                  <td style={tdStyle}>{[...p.platforms].sort().join(', ')}</td>
                  <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)' }}>{p.total}</td>
                  <td style={{ ...tdStyle, color: '#18C964', fontFamily: 'var(--font-mono)' }}>{p.success}</td>
                  <td style={{ ...tdStyle, color: '#F31260', fontFamily: 'var(--font-mono)' }}>{p.fail}</td>
                  <td style={{ ...tdStyle, color: c, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{r}%</td>
                  <td style={{ ...tdStyle, width: '100px' }}>
                    <div style={{ height: '5px', background: 'var(--bg-surface-3)', borderRadius: '3px' }}>
                      <div style={{ height: '100%', width: `${r}%`, background: c, borderRadius: '3px' }} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Build detail rows */}
      <div style={card}>
        <p style={sectionTitle}>Build Detail — Release · Build # · Platform</p>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                {['Product', 'Release', 'Build #', 'Platform', 'Status', 'Duration', 'Stages (pass/total)'].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {buildRows.map((b) => {
                const passedStages = b.stages.filter((s) => s.s === 'SUCCESS').length;
                return (
                  <tr key={b.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-surface-2)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ ...tdStyle, color: 'var(--text-primary)', fontWeight: 500 }}>{b.product}</td>
                    <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)', color: 'var(--accent-blue)' }}>{b.release}</td>
                    <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)' }}>#{b.build}</td>
                    <td style={tdStyle}>{b.platform}</td>
                    <td style={tdStyle}><StatusBadge status={b.status} /></td>
                    <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)' }}>{fmtDur(b.duration)}</td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {b.stages.map((st) => (
                          <span key={st.name} title={`${st.name}: ${st.s} (${fmtDur(st.d)})`}
                            style={{ width: '10px', height: '10px', borderRadius: '2px', background: STATUS_COLORS[st.s] || '#4A5568', display: 'inline-block', cursor: 'default' }} />
                        ))}
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '4px' }}>
                          {passedStages}/{b.stages.length}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DORA METRICS TAB
// ─────────────────────────────────────────────────────────────────────────────

const RATING_COLORS = { Elite: '#18C964', High: '#3B82F6', Medium: '#F5A623', Low: '#F31260' };
function doraRating(type, val) {
  if (type === 'df')  return val >= 3   ? 'Elite' : val >= 1  ? 'High' : val >= 0.5 ? 'Medium' : 'Low';
  if (type === 'lt')  return val <= 60  ? 'Elite' : val <= 120 ? 'High' : val <= 240 ? 'Medium' : 'Low';
  if (type === 'mttr')return val <= 30  ? 'Elite' : val <= 60  ? 'High' : val <= 180 ? 'Medium' : 'Low';
  if (type === 'cfr') return val <= 5   ? 'Elite' : val <= 10  ? 'High' : val <= 15  ? 'Medium' : 'Low';
  return 'High';
}

function DoraTab({ builds }) {
  // Derive DORA from builds
  const total     = builds.length || 1;
  const failures  = builds.filter((b) => b.status === 'FAILURE' || b.status === 'ABORTED').length;
  const cfr       = total > 0 ? +((failures / total) * 100).toFixed(1) : 0;
  const avgDur    = Math.round(builds.reduce((s, b) => s + b.duration, 0) / (total));
  const df        = +(total / 7).toFixed(1);   // simulated: builds per day over 1 week

  // Per-product DORA breakdown
  const byProduct = useMemo(() => {
    const map = {};
    builds.forEach((b) => {
      if (!map[b.product]) map[b.product] = { product: b.product, releases: new Set(), platforms: new Set(), builds: 0, failures: 0, totalDur: 0 };
      map[b.product].builds++;
      map[b.product].releases.add(b.release);
      map[b.product].platforms.add(b.platform);
      map[b.product].totalDur += b.duration;
      if (b.status === 'FAILURE' || b.status === 'ABORTED') map[b.product].failures++;
    });
    return Object.values(map);
  }, [builds]);

  const kpis = [
    { label: 'Deploy Freq',         value: `${df}/day`,       type:'df',  rating: doraRating('df', df),  sub: `${total} deploys / 7 days` },
    { label: 'Lead Time (avg dur)', value: fmtDur(avgDur),    type:'lt',  rating: doraRating('lt', Math.round(avgDur/60)), sub: 'Avg pipeline duration' },
    { label: 'Change Failure Rate', value: `${cfr}%`,         type:'cfr', rating: doraRating('cfr', cfr), sub: `${failures} failures / ${total} total` },
    { label: 'MTTR (est)',          value: fmtDur(avgDur * 0.6 | 0), type:'mttr', rating: doraRating('mttr', (avgDur*0.6/60)|0), sub: 'Estimated restore time' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
        {kpis.map((m) => (
          <div key={m.label} style={card}>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{m.label}</p>
            <p style={{ fontSize: '1.8rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>{m.value}</p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{m.sub}</span>
              <span style={{ padding: '2px 8px', borderRadius: '999px', background: `${RATING_COLORS[m.rating]}22`, color: RATING_COLORS[m.rating], fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase' }}>{m.rating}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Per-product DORA breakdown with release/build/platform */}
      <div style={card}>
        <p style={sectionTitle}>DORA Breakdown by Product · Release · Platform</p>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                {['Product', 'Releases', 'Platforms', 'Deploys', 'Failures', 'CFR', 'Avg Duration', 'Deploy Freq', 'Rating'].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {byProduct.map((p) => {
                const pCfr  = +((p.failures / (p.builds || 1)) * 100).toFixed(1);
                const pAvg  = Math.round(p.totalDur / (p.builds || 1));
                const pDf   = +(p.builds / 7).toFixed(1);
                const rating = doraRating('cfr', pCfr);
                return (
                  <tr key={p.product} style={{ borderBottom: '1px solid var(--border-subtle)' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-surface-2)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ ...tdStyle, color: 'var(--text-primary)', fontWeight: 600 }}>{p.product}</td>
                    <td style={{ ...tdStyle, color: 'var(--accent-blue)', fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>{[...p.releases].sort().join(', ')}</td>
                    <td style={tdStyle}>{[...p.platforms].sort().join(', ')}</td>
                    <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)' }}>{p.builds}</td>
                    <td style={{ ...tdStyle, color: '#F31260', fontFamily: 'var(--font-mono)' }}>{p.failures}</td>
                    <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)', color: pCfr <= 10 ? '#18C964' : '#F5A623', fontWeight: 600 }}>{pCfr}%</td>
                    <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)' }}>{fmtDur(pAvg)}</td>
                    <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)' }}>{pDf}/day</td>
                    <td style={tdStyle}>
                      <span style={{ padding: '2px 8px', borderRadius: '999px', background: `${RATING_COLORS[rating]}18`, color: RATING_COLORS[rating], fontSize: '0.65rem', fontWeight: 700 }}>{rating}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Build-level DORA detail */}
      <div style={card}>
        <p style={sectionTitle}>Build-level Detail — Release · Build # · Platform</p>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                {['Product', 'Release', 'Build #', 'Platform', 'Status', 'Duration', 'Contributed To'].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...builds].sort((a, b) => Number(b.build) - Number(a.build)).slice(0, 20).map((b) => {
                const contrib = b.status === 'SUCCESS' ? 'Deploy Freq' : b.status === 'FAILURE' ? 'CFR ↑' : 'MTTR';
                const contribColor = b.status === 'SUCCESS' ? '#18C964' : b.status === 'FAILURE' ? '#F31260' : '#F5A623';
                return (
                  <tr key={b.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-surface-2)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ ...tdStyle, color: 'var(--text-primary)', fontWeight: 500 }}>{b.product}</td>
                    <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)', color: 'var(--accent-blue)' }}>{b.release}</td>
                    <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)' }}>#{b.build}</td>
                    <td style={tdStyle}>{b.platform}</td>
                    <td style={tdStyle}><StatusBadge status={b.status} /></td>
                    <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)' }}>{fmtDur(b.duration)}</td>
                    <td style={{ ...tdStyle, color: contribColor, fontWeight: 600, fontSize: '0.72rem' }}>{contrib}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BUILD METRICS TAB
// ─────────────────────────────────────────────────────────────────────────────

function BuildMetricsTab({ builds }) {
  const total    = builds.length;
  const success  = builds.filter((b) => b.status === 'SUCCESS').length;
  const avgDur   = total ? Math.round(builds.reduce((s, b) => s + b.duration, 0) / total) : 0;

  // Stage duration aggregation
  const stageMap = {};
  builds.forEach((b) => {
    b.stages.forEach((st) => {
      if (!stageMap[st.name]) stageMap[st.name] = { name: st.name, durations: [] };
      if (st.d > 0) stageMap[st.name].durations.push(st.d);
    });
  });
  const stageDurations = Object.values(stageMap).map((s) => {
    const sorted = [...s.durations].sort((a, b) => a - b);
    const avg = sorted.length ? Math.round(sorted.reduce((a, b) => a + b, 0) / sorted.length) : 0;
    const p95 = sorted.length ? sorted[Math.floor(sorted.length * 0.95)] || sorted[sorted.length - 1] : 0;
    return { stage: s.name, avg, p95 };
  });
  const maxDur = Math.max(...stageDurations.map((s) => s.p95), 1);

  const statusBreakdown = [
    { label: 'SUCCESS',  count: builds.filter(b=>b.status==='SUCCESS').length,  color: '#18C964' },
    { label: 'FAILURE',  count: builds.filter(b=>b.status==='FAILURE').length,  color: '#F31260' },
    { label: 'ABORTED',  count: builds.filter(b=>b.status==='ABORTED').length,  color: '#7B7E8C' },
    { label: 'UNSTABLE', count: builds.filter(b=>b.status==='UNSTABLE').length, color: '#E07B39' },
  ];
  const totalStatus = statusBreakdown.reduce((s, x) => s + x.count, 0) || 1;

  // Per-build detail
  const buildRows = [...builds].sort((a, b) => Number(b.build) - Number(a.build)).slice(0, 25);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Summary KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '16px' }}>
        {[
          { label: 'Total Builds',  value: total,                           color: 'var(--text-primary)' },
          { label: 'Avg Duration',  value: fmtDur(avgDur),                  color: 'var(--accent-blue)' },
          { label: 'Success Rate',  value: `${total ? Math.round((success/total)*100) : 0}%`, color: '#18C964' },
          { label: 'Failure Count', value: builds.filter(b=>b.status==='FAILURE').length, color: '#F31260' },
        ].map((s) => (
          <div key={s.label} style={card}>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</p>
            <p style={{ fontSize: '1.8rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* Stage durations */}
        <div style={card}>
          <p style={sectionTitle}>Avg Stage Duration (across filtered builds)</p>
          {stageDurations.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>No stage data available.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {stageDurations.map((s) => (
                <div key={s.stage}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-primary)' }}>{s.stage}</span>
                    <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                      avg {fmtDur(s.avg)} · p95 {fmtDur(s.p95)}
                    </span>
                  </div>
                  <div style={{ position: 'relative', height: '8px', background: 'var(--bg-surface-3)', borderRadius: '4px' }}>
                    <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${(s.p95 / maxDur) * 100}%`, background: 'rgba(59,130,246,0.2)', borderRadius: '4px' }} />
                    <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${(s.avg / maxDur) * 100}%`, background: 'var(--accent-blue)', borderRadius: '4px' }} />
                  </div>
                </div>
              ))}
              <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                <span style={{ fontSize: '0.68rem', color: 'var(--accent-blue)' }}>■ Avg</span>
                <span style={{ fontSize: '0.68rem', color: 'rgba(59,130,246,0.4)' }}>■ p95</span>
              </div>
            </div>
          )}
        </div>

        {/* Status breakdown */}
        <div style={card}>
          <p style={sectionTitle}>Status Breakdown</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {statusBreakdown.map((s) => {
              const pct = Math.round((s.count / totalStatus) * 100);
              return (
                <div key={s.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.78rem', color: s.color, fontWeight: 600 }}>{s.label}</span>
                    <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                      {s.count} ({pct}%)
                    </span>
                  </div>
                  <div style={{ height: '6px', background: 'var(--bg-surface-3)', borderRadius: '3px' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: s.color, borderRadius: '3px', opacity: 0.8 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Full build detail table */}
      <div style={card}>
        <p style={sectionTitle}>Build Detail — Release · Build # · Platform · Stage Breakdown</p>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                {['Product', 'Release', 'Build #', 'Platform', 'Status', 'Duration', 'Stages'].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {buildRows.map((b) => (
                <tr key={b.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-surface-2)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ ...tdStyle, color: 'var(--text-primary)', fontWeight: 500 }}>{b.product}</td>
                  <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)', color: 'var(--accent-blue)' }}>{b.release}</td>
                  <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>#{b.build}</td>
                  <td style={tdStyle}>{b.platform}</td>
                  <td style={tdStyle}><StatusBadge status={b.status} /></td>
                  <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)' }}>{fmtDur(b.duration)}</td>
                  <td style={{ ...tdStyle, minWidth: '200px' }}>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {b.stages.map((st) => (
                        <span key={st.name} title={`${st.name}: ${st.s} (${fmtDur(st.d)})`}
                          style={{
                            padding: '1px 7px', borderRadius: '999px', fontSize: '0.65rem', fontWeight: 600,
                            background: `${STATUS_COLORS[st.s] || '#4A5568'}18`,
                            color: STATUS_COLORS[st.s] || '#4A5568',
                            border: `1px solid ${STATUS_COLORS[st.s] || '#4A5568'}33`,
                            cursor: 'default',
                          }}>
                          {st.name.split(' ')[0]}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'green', label: 'Green Build'   },
  { key: 'dora',  label: 'DORA Metrics'  },
  { key: 'build', label: 'Build Metrics' },
];

export function CIBuildMetrics() {
  const [activeTab, setActiveTab] = useState('green');
  const [filters, setFilters]     = useState({ product: null, release: null, buildNumber: null, timeline: '1m' });
  const { eventMap } = useEventStore();

  // Only show active events
  const activeBuilds = useMemo(() => ALL_BUILDS.filter((b) => eventMap[b.id] !== false), [eventMap]);
  const inactiveCount = ALL_BUILDS.length - activeBuilds.length;

  const filteredBuilds = useMemo(() => {
    return activeBuilds.filter((b) => {
      if (filters.product     && b.product !== filters.product)     return false;
      if (filters.release     && b.release !== filters.release)     return false;
      if (filters.buildNumber && b.build   !== filters.buildNumber) return false;
      return true;
    });
  }, [filters, activeBuilds]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* Page header */}
      <div style={{ padding: '14px 24px 12px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '2px' }}>CI Build Metrics</h1>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Pipeline health · DORA KPIs · Build analytics</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#18C964', display: 'inline-block' }} />
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Live</span>
        </div>
      </div>

      {/* Filter bar */}
      <CIFilterBar filters={filters} onChange={setFilters} builds={activeBuilds} totalBuilds={ALL_BUILDS.length} />

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0', padding: '0 24px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
        {TABS.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '10px 20px', border: 'none',
                borderBottom: active ? '2px solid var(--accent-blue)' : '2px solid transparent',
                background: 'transparent',
                color: active ? 'var(--accent-blue)' : 'var(--text-secondary)',
                fontFamily: 'var(--font-sans)', fontSize: '0.83rem',
                fontWeight: active ? 600 : 400, cursor: 'pointer',
                marginBottom: '-1px', transition: 'all 150ms ease',
              }}
              onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = 'var(--text-primary)'; }}
              onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = 'var(--text-secondary)'; }}
            >{tab.label}</button>
          );
        })}
      </div>

      {/* Inactive events banner */}
      {inactiveCount > 0 && (
        <div style={{ padding:'8px 24px', background:'rgba(245,166,35,0.08)', borderBottom:'1px solid rgba(245,166,35,0.2)', fontSize:'0.75rem', color:'#F5A623', display:'flex', alignItems:'center', gap:'6px' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          {inactiveCount} event{inactiveCount !== 1 ? 's' : ''} hidden by admin (Settings → Events)
        </div>
      )}

      {/* Active filter chips */}
      <FilterChips filters={filters} count={filteredBuilds.length} />

      {/* Tab content */}
      <div style={{ flex: 1, padding: '24px', overflowY: 'auto', background: 'var(--bg-base)' }}>
        {activeTab === 'green' && <GreenBuildTab  builds={filteredBuilds} />}
        {activeTab === 'dora'  && <DoraTab         builds={filteredBuilds} />}
        {activeTab === 'build' && <BuildMetricsTab builds={filteredBuilds} />}
      </div>
    </div>
  );
}

export default CIBuildMetrics;
