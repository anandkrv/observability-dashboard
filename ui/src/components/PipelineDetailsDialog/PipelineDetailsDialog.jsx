import { useEffect, useRef } from 'react';
import { usePipelineRunDetail } from '../../hooks/usePipelineRuns.js';
import { StatusBadge } from '../StatusBadge/StatusBadge.jsx';
import { formatDistanceToNow, format } from 'date-fns';

function formatDuration(ms) {
  if (!ms) return '—';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  return `${mins}m ${secs}s`;
}

export function PipelineDetailsDialog({ runId, onClose }) {
  const dialogRef = useRef(null);
  const { data: run, isLoading, error } = usePipelineRunDetail(runId);

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

  const maxDuration = run?.stages?.reduce((m, s) => Math.max(m, s.duration_ms || 0), 1) || 1;

  return (
    <dialog
      ref={dialogRef}
      onClick={handleBackdropClick}
      style={{
        background:   'var(--bg-surface)',
        border:       '1px solid var(--border-muted)',
        borderRadius: 'var(--radius-lg)',
        color:        'var(--text-primary)',
        padding:      0,
        maxWidth:     '720px',
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
          <div style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '4px' }}>
            Pipeline Run Details
          </div>
          {run && (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {run.event_id}
            </div>
          )}
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

      {/* Content */}
      <div style={{ padding: '20px', overflowY: 'auto', maxHeight: 'calc(85vh - 70px)' }}>
        {isLoading && (
          <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px' }}>
            Loading...
          </div>
        )}
        {error && (
          <div style={{ color: 'var(--color-failure)', textAlign: 'center', padding: '40px' }}>
            Failed to load run details.
          </div>
        )}
        {run && (
          <>
            {/* Run meta */}
            <div style={{
              display:             'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap:                 '12px',
              marginBottom:        '20px',
            }}>
              {[
                { label: 'Product',    value: run.product_name },
                { label: 'Version',    value: run.version },
                { label: 'Platform',   value: run.platform },
                { label: 'Status',     value: <StatusBadge status={run.status} showCount={false} size="sm" /> },
                { label: 'Branch',     value: run.branch || '—' },
                { label: 'Triggered',  value: run.triggered_by || '—' },
                { label: 'Duration',   value: formatDuration(run.duration_ms) },
                { label: 'Started',    value: run.started_at ? format(new Date(run.started_at), 'MMM d, HH:mm') : '—' },
              ].map(({ label, value }) => (
                <div key={label} style={{
                  background:   'var(--bg-surface-2)',
                  border:       '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding:      '10px 12px',
                }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
                    {label}
                  </div>
                  <div style={{ fontSize: '0.85rem', fontFamily: typeof value === 'string' ? 'var(--font-mono)' : undefined }}>
                    {value}
                  </div>
                </div>
              ))}
            </div>

            {/* Commit */}
            {run.commit_sha && (
              <div style={{ marginBottom: '16px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Commit: <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-blue)' }}>
                  {run.commit_sha.slice(0, 14)}
                </span>
              </div>
            )}

            {/* Stages */}
            {run.stages && run.stages.length > 0 && (
              <>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Stages
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {run.stages.map((stage) => (
                    <div key={stage.id} style={{
                      background:   'var(--bg-surface-2)',
                      border:       '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding:      '10px 14px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: stage.error_message ? '8px' : '6px' }}>
                        <StatusBadge status={stage.status} showCount={false} size="sm" />
                        <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>{stage.name}</span>
                        <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {formatDuration(stage.duration_ms)}
                        </span>
                      </div>

                      {/* Duration bar */}
                      <div style={{
                        height:       '4px',
                        background:   'var(--bg-surface-3)',
                        borderRadius: '2px',
                        overflow:     'hidden',
                      }}>
                        <div style={{
                          height:       '100%',
                          width:        `${Math.round(((stage.duration_ms || 0) / maxDuration) * 100)}%`,
                          background:   stage.status === 'SUCCESS'  ? 'var(--color-success)'
                                      : stage.status === 'FAILURE'  ? 'var(--color-failure)'
                                      : stage.status === 'RUNNING'  ? 'var(--color-running)'
                                      : stage.status === 'UNSTABLE' ? 'var(--color-unstable)'
                                      : 'var(--color-aborted)',
                          borderRadius: '2px',
                          transition:   'width 0.3s ease',
                        }} />
                      </div>

                      {stage.error_message && (
                        <div style={{
                          marginTop:    '6px',
                          fontSize:     '0.75rem',
                          color:        'var(--color-failure)',
                          fontFamily:   'var(--font-mono)',
                          padding:      '4px 8px',
                          background:   'rgba(243,18,96,0.08)',
                          borderRadius: 'var(--radius-sm)',
                        }}>
                          {stage.error_message}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </dialog>
  );
}

export default PipelineDetailsDialog;
