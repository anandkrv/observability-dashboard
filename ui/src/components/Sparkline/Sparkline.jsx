import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts';

const STATUS_COLORS = {
  SUCCESS:  '#18C964',
  FAILURE:  '#F31260',
  RUNNING:  '#F5A623',
  ABORTED:  '#7B7E8C',
  UNSTABLE: '#E07B39',
};

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background:   'var(--bg-surface-3)',
      border:       '1px solid var(--border-muted)',
      borderRadius: '6px',
      padding:      '6px 10px',
      fontSize:     '11px',
      color:        'var(--text-primary)',
    }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} style={{ color: STATUS_COLORS[p.dataKey] || p.color }}>
          {p.dataKey}: {p.value}
        </div>
      ))}
    </div>
  );
}

export function Sparkline({ data = [], height = 40, lines = ['SUCCESS', 'FAILURE'] }) {
  if (!data || data.length < 2) {
    return (
      <div style={{
        height,
        display:    'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color:      'var(--text-muted)',
        fontSize:   '11px',
      }}>
        No data
      </div>
    );
  }

  // Normalize data: each item should have { day, SUCCESS, FAILURE, ... }
  const chartData = data.map((d) => ({
    day:      typeof d.day === 'string' ? d.day.slice(0, 10) : d.day,
    SUCCESS:  Number(d.SUCCESS  || 0),
    FAILURE:  Number(d.FAILURE  || 0),
    RUNNING:  Number(d.RUNNING  || 0),
    ABORTED:  Number(d.ABORTED  || 0),
    UNSTABLE: Number(d.UNSTABLE || 0),
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
        <Tooltip content={<CustomTooltip />} />
        {lines.map((key) => (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            stroke={STATUS_COLORS[key] || '#888'}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

export default Sparkline;
