const STATUS_CONFIG = {
  SUCCESS:  { label: 'S', color: '#18C964', bg: 'rgba(24,201,100,0.15)',  full: 'SUCCESS'  },
  FAILURE:  { label: 'F', color: '#F31260', bg: 'rgba(243,18,96,0.15)',   full: 'FAILURE'  },
  RUNNING:  { label: 'R', color: '#F5A623', bg: 'rgba(245,166,35,0.15)',  full: 'RUNNING'  },
  ABORTED:  { label: 'A', color: '#7B7E8C', bg: 'rgba(123,126,140,0.15)', full: 'ABORTED'  },
  UNSTABLE: { label: 'U', color: '#E07B39', bg: 'rgba(224,123,57,0.15)',  full: 'UNSTABLE' },
};

export function StatusBadge({ status, count, onClick, showCount = true, size = 'md' }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.ABORTED;

  const sizeMap = {
    sm: { fontSize: '10px', padding: '2px 6px', minWidth: '22px' },
    md: { fontSize: '11px', padding: '3px 8px', minWidth: '28px' },
    lg: { fontSize: '13px', padding: '4px 10px', minWidth: '36px' },
  };
  const sz = sizeMap[size] || sizeMap.md;

  const style = {
    display:        'inline-flex',
    alignItems:     'center',
    gap:            '4px',
    backgroundColor: cfg.bg,
    color:          cfg.color,
    border:         `1px solid ${cfg.color}33`,
    borderRadius:   '4px',
    fontFamily:     'var(--font-mono)',
    fontWeight:     600,
    cursor:         onClick ? 'pointer' : 'default',
    userSelect:     'none',
    transition:     'all 150ms ease',
    whiteSpace:     'nowrap',
    ...sz,
  };

  const hoverStyle = onClick ? {
    backgroundColor: cfg.color + '30',
    borderColor:     cfg.color + '88',
    transform:       'translateY(-1px)',
  } : {};

  return (
    <span
      style={style}
      title={cfg.full + (count != null ? ` (${count})` : '')}
      onClick={onClick}
      onMouseEnter={onClick ? (e) => Object.assign(e.currentTarget.style, hoverStyle) : undefined}
      onMouseLeave={onClick ? (e) => Object.assign(e.currentTarget.style, style) : undefined}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      <span>{cfg.label}</span>
      {showCount && count != null && (
        <span style={{ fontSize: sz.fontSize }}>{count}</span>
      )}
    </span>
  );
}

export { STATUS_CONFIG };
export default StatusBadge;
