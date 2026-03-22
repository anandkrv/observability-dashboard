import { useState } from 'react';
import { useProductSummary } from '../../hooks/useProducts.js';
import { StatusBadge } from '../StatusBadge/StatusBadge.jsx';
import { Sparkline } from '../Sparkline/Sparkline.jsx';
import { PipelineRunsDialog } from '../PipelineRunsDialog/PipelineRunsDialog.jsx';
import { useFilterStore } from '../../store/filterStore.js';
import { formatDistanceToNow } from 'date-fns';

function OverallStatusDot({ counts }) {
  if (counts.FAILURE  > 0) return <span style={{ color: '#F31260', fontSize: '8px' }}>●</span>;
  if (counts.RUNNING  > 0) return <span style={{ color: '#F5A623', fontSize: '8px' }}>●</span>;
  if (counts.UNSTABLE > 0) return <span style={{ color: '#E07B39', fontSize: '8px' }}>●</span>;
  if (counts.SUCCESS  > 0) return <span style={{ color: '#18C964', fontSize: '8px' }}>●</span>;
  return <span style={{ color: '#7B7E8C', fontSize: '8px' }}>●</span>;
}

export function ProductTile({ product }) {
  const { dateFrom, dateTo } = useFilterStore();
  const { data: summary, isLoading } = useProductSummary(product.id, dateFrom, dateTo);

  const [dialogStatus, setDialogStatus] = useState(null);  // status string or 'all'

  const counts  = summary?.status_counts  || {};
  const release = summary?.latest_release || {};
  const lastRun = summary?.last_run       || null;
  const timeline = summary?.timeline      || [];

  const totalRuns = Object.values(counts).reduce((a, b) => a + Number(b), 0);

  const handleStatusClick = (status) => {
    setDialogStatus(status);
  };

  return (
    <>
      <div style={{
        background:   'var(--bg-surface)',
        border:       '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        padding:      '16px',
        display:      'flex',
        flexDirection:'column',
        gap:          '12px',
        transition:   'border-color 200ms ease, box-shadow 200ms ease',
        cursor:       'default',
      }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'var(--border-muted)';
          e.currentTarget.style.boxShadow   = '0 4px 20px rgba(0,0,0,0.4)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--border-subtle)';
          e.currentTarget.style.boxShadow   = 'none';
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              {!isLoading && <OverallStatusDot counts={counts} />}
              <span style={{ fontWeight: 600, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {product.name}
              </span>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {product.domain_name} · {product.business_unit_name}
            </div>
          </div>

          {/* Version / platform chips */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px', marginLeft: '8px' }}>
            {release.version && (
              <span style={{
                fontFamily:   'var(--font-mono)',
                fontSize:     '0.7rem',
                color:        'var(--text-secondary)',
                background:   'var(--bg-surface-2)',
                border:       '1px solid var(--border-subtle)',
                borderRadius: '3px',
                padding:      '2px 6px',
              }}>
                v{release.version}
              </span>
            )}
            {release.platform && (
              <span style={{
                fontSize:     '0.68rem',
                color:        'var(--text-muted)',
                background:   'var(--bg-surface-3)',
                borderRadius: '3px',
                padding:      '1px 5px',
              }}>
                {release.platform}
              </span>
            )}
          </div>
        </div>

        {/* Status pills */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {['SUCCESS', 'FAILURE', 'RUNNING', 'ABORTED', 'UNSTABLE'].map((s) => (
            <StatusBadge
              key={s}
              status={s}
              count={counts[s] || 0}
              showCount={true}
              size="sm"
              onClick={counts[s] > 0 ? () => handleStatusClick(s) : undefined}
            />
          ))}
        </div>

        {/* Sparkline */}
        <div style={{ height: '44px' }}>
          {isLoading ? (
            <div style={{ height: '44px', background: 'var(--bg-surface-2)', borderRadius: '4px', animation: 'pulse 1.5s infinite' }} />
          ) : (
            <Sparkline data={timeline} height={44} lines={['SUCCESS', 'FAILURE']} />
          )}
        </div>

        {/* Footer: last run info */}
        <div style={{
          display:        'flex',
          justifyContent: 'space-between',
          alignItems:     'center',
          fontSize:       '0.7rem',
          color:          'var(--text-muted)',
          borderTop:      '1px solid var(--border-subtle)',
          paddingTop:     '10px',
        }}>
          <span>
            {totalRuns} run{totalRuns !== 1 ? 's' : ''}
          </span>
          {lastRun ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <StatusBadge status={lastRun.status} showCount={false} size="sm" />
              <span>{formatDistanceToNow(new Date(lastRun.started_at), { addSuffix: true })}</span>
            </span>
          ) : (
            <span>No runs</span>
          )}
          <button
            onClick={() => handleStatusClick(null)}
            style={{
              background:   'transparent',
              border:       '1px solid var(--border-muted)',
              borderRadius: 'var(--radius-sm)',
              color:        'var(--text-secondary)',
              cursor:       'pointer',
              fontSize:     '0.68rem',
              padding:      '2px 7px',
            }}
          >
            All runs
          </button>
        </div>
      </div>

      {/* Dialog */}
      {dialogStatus !== null && (
        <PipelineRunsDialog
          productId={product.id}
          productName={product.name}
          filterStatus={dialogStatus || undefined}
          dateFrom={dateFrom}
          dateTo={dateTo}
          onClose={() => setDialogStatus(null)}
        />
      )}
    </>
  );
}

export default ProductTile;
