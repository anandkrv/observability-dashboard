import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useFilterStore } from '../../store/filterStore.js';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

async function fetchProducts() {
  const { data } = await axios.get(`${API_URL}/api/v1/products`);
  return data.products || [];
}

async function fetchReleases(productId) {
  const params = productId ? { product_id: productId } : {};
  const { data } = await axios.get(`${API_URL}/api/v1/releases`, { params });
  return data.releases || [];
}

const TIMELINES = [
  { key: '1w', label: '1W' },
  { key: '1m', label: '1M' },
  { key: '6m', label: '6M' },
];

const PLATFORMS = ['linux', 'windows'];

const selectStyle = {
  background:   'var(--bg-surface-2)',
  color:        'var(--text-primary)',
  border:       '1px solid var(--border-muted)',
  borderRadius: 'var(--radius-sm)',
  padding:      '6px 10px',
  fontSize:     '0.8rem',
  cursor:       'pointer',
  outline:      'none',
  minWidth:     '140px',
};

export function FilterBar() {
  const { product, release, platform, timeline, theme, setProduct, setRelease, setPlatform, setTimeline, toggleTheme, reset } =
    useFilterStore();

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn:  fetchProducts,
  });

  const { data: releases = [] } = useQuery({
    queryKey: ['releases', product],
    queryFn:  () => fetchReleases(product),
    enabled:  true,
  });

  return (
    <div style={{
      display:      'flex',
      alignItems:   'center',
      gap:          '12px',
      flexWrap:     'wrap',
      padding:      '12px 20px',
      background:   'var(--bg-surface)',
      borderBottom: '1px solid var(--border-subtle)',
    }}>
      {/* Product selector */}
      <select
        value={product ?? ''}
        onChange={(e) => setProduct(e.target.value ? Number(e.target.value) : null)}
        style={selectStyle}
      >
        <option value="">All Products</option>
        {products.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>

      {/* Release selector */}
      <select
        value={release ?? ''}
        onChange={(e) => setRelease(e.target.value ? Number(e.target.value) : null)}
        style={selectStyle}
        disabled={releases.length === 0}
      >
        <option value="">All Releases</option>
        {releases.map((r) => (
          <option key={r.id} value={r.id}>{r.version} ({r.platform}) — {r.product_name}</option>
        ))}
      </select>

      {/* Platform selector */}
      <select
        value={platform ?? ''}
        onChange={(e) => setPlatform(e.target.value || null)}
        style={selectStyle}
      >
        <option value="">All Platforms</option>
        {PLATFORMS.map((p) => (
          <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
        ))}
      </select>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Timeline buttons */}
      <div style={{ display: 'flex', gap: '4px' }}>
        {TIMELINES.map((t) => (
          <button
            key={t.key}
            onClick={() => setTimeline(t.key)}
            style={{
              background:   timeline === t.key ? 'var(--accent-blue)' : 'var(--bg-surface-2)',
              color:        timeline === t.key ? '#fff' : 'var(--text-secondary)',
              border:       `1px solid ${timeline === t.key ? 'var(--accent-blue)' : 'var(--border-muted)'}`,
              borderRadius: 'var(--radius-sm)',
              padding:      '5px 12px',
              fontSize:     '0.8rem',
              fontWeight:   timeline === t.key ? 600 : 400,
              cursor:       'pointer',
              transition:   'all 150ms ease',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Reset */}
      {(product || release || platform) && (
        <button
          onClick={reset}
          style={{
            background:   'transparent',
            color:        'var(--text-muted)',
            border:       '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            padding:      '5px 10px',
            fontSize:     '0.75rem',
            cursor:       'pointer',
          }}
        >
          Clear
        </button>
      )}

      <div style={{ width: '1px', height: '24px', background: 'var(--border-muted)' }} />

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        title={theme === 'dark' ? 'Switch to Light mode' : 'Switch to Dark mode'}
        style={{
          background:   'var(--bg-surface-2)',
          color:        'var(--text-secondary)',
          border:       '1px solid var(--border-muted)',
          borderRadius: 'var(--radius-sm)',
          padding:      '5px 10px',
          fontSize:     '0.85rem',
          cursor:       'pointer',
          display:      'flex',
          alignItems:   'center',
          gap:          '5px',
          transition:   'all 150ms ease',
          userSelect:   'none',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-blue)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-muted)';  e.currentTarget.style.color = 'var(--text-secondary)'; }}
      >
        {theme === 'dark' ? '☀️' : '🌙'}
        <span style={{ fontSize: '0.75rem' }}>{theme === 'dark' ? 'Light' : 'Dark'}</span>
      </button>
    </div>
  );
}

export default FilterBar;
