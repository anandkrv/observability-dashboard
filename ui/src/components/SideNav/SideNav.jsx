import { useState } from 'react';
import { useAuthStore } from '../../store/authStore.js';

const BASE_NAV = [
  {
    key: 'release',
    label: 'Release',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
  {
    key: 'ci-metrics',
    label: 'CI Build Metrics',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
];

const ADMIN_NAV = [
  {
    key: 'settings',
    label: 'Settings',
    adminOnly: true,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
];

export function SideNav({ activePage, onNavigate }) {
  const [collapsed, setCollapsed] = useState(false);
  const user   = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const isAdmin = user?.role === 'admin';
  const navItems = isAdmin ? [...BASE_NAV, ...ADMIN_NAV] : BASE_NAV;

  return (
    <div style={{
      width:         collapsed ? '56px' : '210px',
      minHeight:     '100vh',
      background:    'var(--bg-surface)',
      borderRight:   '1px solid var(--border-subtle)',
      display:       'flex',
      flexDirection: 'column',
      transition:    'width 220ms ease',
      flexShrink:    0,
      zIndex:        10,
    }}>
      {/* Logo */}
      <div style={{ height:'52px', display:'flex', alignItems:'center', padding:'0 14px', gap:'10px', borderBottom:'1px solid var(--border-subtle)', overflow:'hidden' }}>
        <svg width="22" height="22" viewBox="0 0 20 20" fill="none" style={{ flexShrink:0 }}>
          <circle cx="10" cy="10" r="9" stroke="var(--accent-blue)" strokeWidth="1.5" />
          <circle cx="10" cy="10" r="4" fill="var(--accent-blue)" opacity="0.7" />
          <circle cx="10" cy="10" r="1.5" fill="var(--accent-blue)" />
        </svg>
        {!collapsed && (
          <span style={{ fontSize:'0.8rem', fontWeight:700, color:'var(--text-primary)', whiteSpace:'nowrap' }}>
            Observatory
          </span>
        )}
      </div>

      {/* Nav items */}
      <nav style={{ flex:1, padding:'10px 8px', display:'flex', flexDirection:'column', gap:'2px' }}>
        {/* Section divider before Settings */}
        {navItems.map((item, idx) => {
          const active = activePage === item.key;
          const isSettings = item.key === 'settings';

          return (
            <div key={item.key}>
              {isSettings && (
                <div style={{ height:'1px', background:'var(--border-subtle)', margin:'8px 4px', opacity:0.6 }} />
              )}
              <button
                onClick={() => onNavigate(item.key)}
                title={collapsed ? item.label : undefined}
                style={{
                  display:       'flex',
                  alignItems:    'center',
                  gap:           '10px',
                  padding:       collapsed ? '9px 10px' : '9px 12px',
                  borderRadius:  'var(--radius-md)',
                  border:        'none',
                  cursor:        'pointer',
                  background:    active ? 'rgba(59,130,246,0.12)' : 'transparent',
                  color:         active ? 'var(--accent-blue)' : isSettings ? 'var(--accent-purple)' : 'var(--text-secondary)',
                  fontFamily:    'var(--font-sans)',
                  fontSize:      '0.8rem',
                  fontWeight:    active ? 600 : 400,
                  textAlign:     'left',
                  whiteSpace:    'nowrap',
                  overflow:      'hidden',
                  width:         '100%',
                  transition:    'all 150ms ease',
                  borderLeft:    active ? `2px solid ${isSettings ? 'var(--accent-purple)' : 'var(--accent-blue)'}` : '2px solid transparent',
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = 'var(--bg-surface-2)';
                    e.currentTarget.style.color = isSettings ? 'var(--accent-purple)' : 'var(--text-primary)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = isSettings ? 'var(--accent-purple)' : 'var(--text-secondary)';
                  }
                }}
              >
                <span style={{ flexShrink:0 }}>{item.icon}</span>
                {!collapsed && (
                  <span style={{ display:'flex', alignItems:'center', gap:'6px', flex:1 }}>
                    {item.label}
                    {isSettings && (
                      <span style={{ fontSize:'0.58rem', fontWeight:700, padding:'1px 5px', borderRadius:'999px', background:'rgba(139,92,246,0.15)', color:'var(--accent-purple)', textTransform:'uppercase', letterSpacing:'0.05em' }}>
                        Admin
                      </span>
                    )}
                  </span>
                )}
              </button>
            </div>
          );
        })}
      </nav>

      {/* User info + logout */}
      <div style={{ borderTop:'1px solid var(--border-subtle)', padding:'10px 8px', display:'flex', flexDirection:'column', gap:'6px' }}>
        {!collapsed && user && (
          <div style={{ padding:'8px 12px', borderRadius:'var(--radius-md)', background:'var(--bg-surface-2)', display:'flex', alignItems:'center', gap:'8px' }}>
            <div style={{
              width:'28px', height:'28px', borderRadius:'50%', flexShrink:0,
              background: user.role==='admin' ? 'rgba(139,92,246,0.2)' : 'rgba(59,130,246,0.15)',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:'0.7rem', fontWeight:700,
              color: user.role==='admin' ? 'var(--accent-purple)' : 'var(--accent-blue)',
            }}>
              {user.displayName[0].toUpperCase()}
            </div>
            <div style={{ overflow:'hidden', flex:1, minWidth:0 }}>
              <p style={{ fontSize:'0.78rem', fontWeight:600, color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {user.displayName}
              </p>
              <p style={{ fontSize:'0.65rem', color: user.role==='admin' ? 'var(--accent-purple)' : 'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.04em' }}>
                {user.role}
              </p>
            </div>
          </div>
        )}

        {/* Logout */}
        <button
          onClick={logout}
          title="Sign out"
          style={{
            display:'flex', alignItems:'center', gap:'8px',
            padding: collapsed ? '9px 10px' : '9px 12px',
            borderRadius:'var(--radius-md)', border:'none',
            background:'transparent', color:'var(--text-muted)',
            cursor:'pointer', width:'100%', transition:'all 150ms',
            fontFamily:'var(--font-sans)', fontSize:'0.8rem',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background='rgba(243,18,96,0.08)'; e.currentTarget.style.color='var(--color-failure)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='var(--text-muted)'; }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink:0 }}>
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          {!collapsed && <span>Sign Out</span>}
        </button>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? 'Expand' : 'Collapse'}
          style={{
            padding:'7px', borderRadius:'var(--radius-md)',
            border:'1px solid var(--border-muted)', background:'transparent',
            color:'var(--text-muted)', cursor:'pointer',
            display:'flex', alignItems:'center', justifyContent:'center', transition:'all 150ms',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color='var(--text-primary)'; e.currentTarget.style.borderColor='var(--border-strong)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color='var(--text-muted)'; e.currentTarget.style.borderColor='var(--border-muted)'; }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: collapsed ? 'rotate(180deg)' : 'none', transition:'transform 220ms ease' }}>
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default SideNav;
