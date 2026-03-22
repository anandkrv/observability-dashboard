import { useEffect, useRef, useState } from 'react';
import { usePipelineRuns } from '../../hooks/usePipelineRuns.js';
import { StatusBadge } from '../StatusBadge/StatusBadge.jsx';
import { PipelineDetailsDialog } from '../PipelineDetailsDialog/PipelineDetailsDialog.jsx';
import { format } from 'date-fns';

function formatDuration(ms) {
  if (!ms) return '—';
  if (ms < 60000) return `${(ms / 1000).toFixed(0)}s`;
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${m}m ${s}s`;
}

const STAGE_COLORS = {
  SUCCESS:  { bg: 'rgba(24,201,100,0.18)',  color: '#18C964' },
  FAILURE:  { bg: 'rgba(243,18,96,0.18)',   color: '#F31260' },
  RUNNING:  { bg: 'rgba(245,166,35,0.18)',  color: '#F5A623' },
  ABORTED:  { bg: 'rgba(123,126,140,0.18)', color: '#7B7E8C' },
  UNSTABLE: { bg: 'rgba(224,123,57,0.18)',  color: '#E07B39' },
};

function StagePill({ name, status }) {
  const c = STAGE_COLORS[status] || STAGE_COLORS.ABORTED;
  return (
    <span style={{
      display:      'inline-block',
      background:   c.bg,
      color:        c.color,
      border:       `1px solid ${c.color}44`,
      borderRadius: '4px',
      padding:      '2px 7px',
      fontSize:     '10px',
      fontFamily:   'var(--font-mono)',
      whiteSpace:   'nowrap',
    }}>
      {name}
    </span>
  );
}

export function PipelineRunsDialog({ productId, productName, filterStatus, dateFrom, dateTo, onClose }) {
  const dialogRef    = useRef(null);
  const [selectedRunId, setSelectedRunId] = useState(null);

  const { data, isLoading, error } = usePipelineRuns({
    productId,
    status:   filterStatus,
    dateFrom,
    dateTo,
    limit:    100,
  });

  const runs = data?.runs || [];

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    const handleClose = () => onClose?.();
    dialog.addEventListener('close', handleClose);
    return () => dialog.removeEventListener('close', handleClose);
  }, [onClose]);

  const handleBackdropClick = (e) => {
    if (e.target === dialogRef.current) dialogRef.current.close();
  };

  return (
    <>
      <dialog
        ref={dialogRef}
        onClick={handleBackdropClick}
        style={{
          background:   'var(--bg-surface)',
          border:       '1px solid var(--border-muted)',
          borderRadius: 'var(--radius-lg)',
          color:        'var(--text-primary)',
          padding:      0,
          maxWidth:     '800px',
          width:        '95vw',
          maxHeight:    '85vh',
          overflow:     'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          padding:        '16px 20px',
          borderBottom:   '1px solid var(--border-subtle)',
          background:     'var(--bg-surface-2)',
        }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: '1rem' }}>
              {productName} — Pipeline Runs
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              {filterStatus
                ? <>Filtered: <StatusBadge status={filterStatus} showCount={false} size="sm" /></>
                : 'All statuses'}
              {' · '}
              {isLoading ? 'Loading...' : `${runs.length} run${runs.length !== 1 ? 's' : ''}`}
            </div>
          </div>
          <button
            onClick={() => dialogRef.current?.close()}
            style={{
              background: 'transparent',
              border:     'none',
              color:      'var(--text-muted)',
              cursor:     'pointer',
              fontSize:   '18px',
              lineHeight: 1,
              padding:    '4px 8px',
            }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', maxHeight: 'calc(85vh - 70px)', padding: '16px 20px' }}>
          {isLoading && (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              Loading runs...
            </div>
          )}
          {error && (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-failure)' }}>
              Failed to load runs.
            </div>
          )}
          {!isLoading && !error && runs.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              No runs found.
            </div>
          )}
          {runs.map((run) => (
            <div
              key={run.id}
              onClick={() => setSelectedRunId(run.id)}
              style={{
                display:       'flex',
                flexDirection: 'column',
                gap:           '8px',
                padding:       '12px 14px',
                marginBottom:  '8px',
                background:    'var(--bg-surface-2)',
                border:        '1px solid var(--border-subtle)',
                borderRadius:  'var(--radius-md)',
                cursor:        'pointer',
                transition:    'border-color 150ms ease',
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--border-strong)'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-subtle)'}
            >
              {/* Row 1: status + product info + duration + date */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <StatusBadge status={run.status} showCount={false} size="sm" />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {run.version}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {run.platform}
                </span>
                {run.branch && (
                  <span style={{
                    fontSize:     '0.72rem',
                    color:        'var(--accent-blue)',
                    fontFamily:   'var(--font-mono)',
                    background:   'rgba(59,130,246,0.1)',
                    borderRadius: '3px',
                    padding:      '1px 6px',
                  }}>
                    {run.branch}
                  </span>
                )}
                <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {formatDuration(run.duration_ms)}
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  {run.started_at ? format(new Date(run.started_at), 'MMM d, HH:mm') : '—'}
                </span>
              </div>

              {/* Row 2: stage pills */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {(run.stages || []).map((stage) => (
                  <StagePill key={stage.id || stage.name} name={stage.name} status={stage.status} />
                ))}
                {(!run.stages || run.stages.length === 0) && (
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Click for details →</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </dialog>

      {selectedRunId && (
        <PipelineDetailsDialog
          runId={selectedRunId}
          onClose={() => setSelectedRunId(null)}
        />
      )}
    </>
  );
}

export default PipelineRunsDialog;
