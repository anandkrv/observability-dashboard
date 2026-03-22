import { useState } from 'react';
import { useAuthStore } from '../store/authStore.js';
import { useFilterStore } from '../store/filterStore.js';

export function LoginPage() {
  const login       = useAuthStore((s) => s.login);
  const theme       = useFilterStore((s) => s.theme);
  const toggleTheme = useFilterStore((s) => s.toggleTheme);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password.');
      return;
    }
    setLoading(true);
    setError('');
    await new Promise((r) => setTimeout(r, 600)); // simulate auth
    const ok = login(username.trim(), password);
    setLoading(false);
    if (!ok) setError('Invalid username or password.');
  }

  return (
    <div style={{
      minHeight:       '100vh',
      display:         'flex',
      alignItems:      'center',
      justifyContent:  'center',
      background:      'var(--bg-base)',
      fontFamily:      'var(--font-sans)',
      position:        'relative',
    }}>
      {/* Theme toggle */}
      <button onClick={toggleTheme}
        style={{
          position: 'absolute', top: '16px', right: '16px',
          background: 'var(--bg-surface)', color: 'var(--text-secondary)',
          border: '1px solid var(--border-muted)', borderRadius: 'var(--radius-sm)',
          padding: '6px 12px', fontSize: '0.8rem', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: '6px',
        }}>
        {theme === 'dark' ? '☀️' : '🌙'}
        <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
      </button>

      {/* Card */}
      <div style={{
        width:        '380px',
        background:   'var(--bg-surface)',
        border:       '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-xl)',
        padding:      '40px',
        boxShadow:    '0 20px 60px rgba(0,0,0,0.25)',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '32px', gap: '12px' }}>
          <div style={{ position: 'relative' }}>
            <svg width="48" height="48" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="9" stroke="var(--accent-blue)" strokeWidth="1.2" />
              <circle cx="10" cy="10" r="5" fill="var(--accent-blue)" opacity="0.2" />
              <circle cx="10" cy="10" r="2.5" fill="var(--accent-blue)" opacity="0.7" />
              <circle cx="10" cy="10" r="1"   fill="var(--accent-blue)" />
            </svg>
          </div>
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
              Pipeline Observatory
            </h1>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>CI/CD Observability Platform</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => { setUsername(e.target.value); setError(''); }}
              placeholder="Enter username"
              autoComplete="username"
              autoFocus
              style={{
                background:   'var(--bg-surface-2)',
                border:       `1px solid ${error ? 'var(--color-failure)' : 'var(--border-muted)'}`,
                borderRadius: 'var(--radius-md)',
                padding:      '10px 14px',
                fontSize:     '0.88rem',
                color:        'var(--text-primary)',
                outline:      'none',
                transition:   'border-color 150ms',
                fontFamily:   'var(--font-sans)',
                width:        '100%',
                boxSizing:    'border-box',
              }}
              onFocus={(e) => { if (!error) e.target.style.borderColor = 'var(--accent-blue)'; }}
              onBlur={(e)  => { if (!error) e.target.style.borderColor = 'var(--border-muted)'; }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              placeholder="Enter password"
              autoComplete="current-password"
              style={{
                background:   'var(--bg-surface-2)',
                border:       `1px solid ${error ? 'var(--color-failure)' : 'var(--border-muted)'}`,
                borderRadius: 'var(--radius-md)',
                padding:      '10px 14px',
                fontSize:     '0.88rem',
                color:        'var(--text-primary)',
                outline:      'none',
                transition:   'border-color 150ms',
                fontFamily:   'var(--font-sans)',
                width:        '100%',
                boxSizing:    'border-box',
              }}
              onFocus={(e) => { if (!error) e.target.style.borderColor = 'var(--accent-blue)'; }}
              onBlur={(e)  => { if (!error) e.target.style.borderColor = 'var(--border-muted)'; }}
            />
          </div>

          {/* Error */}
          {error && (
            <div style={{
              padding: '10px 14px', borderRadius: 'var(--radius-md)',
              background: 'rgba(243,18,96,0.08)', border: '1px solid rgba(243,18,96,0.25)',
              color: 'var(--color-failure)', fontSize: '0.8rem',
            }}>
              {error}
            </div>
          )}

          {/* Submit */}
          <button type="submit" disabled={loading}
            style={{
              background:    loading ? 'var(--bg-surface-3)' : 'var(--accent-blue)',
              color:         loading ? 'var(--text-muted)' : '#fff',
              border:        'none',
              borderRadius:  'var(--radius-md)',
              padding:       '11px',
              fontSize:      '0.88rem',
              fontWeight:    600,
              cursor:        loading ? 'not-allowed' : 'pointer',
              fontFamily:    'var(--font-sans)',
              transition:    'all 150ms ease',
              marginTop:     '4px',
              letterSpacing: '0.02em',
            }}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        {/* Hint */}
        <div style={{
          marginTop:    '28px',
          paddingTop:   '20px',
          borderTop:    '1px solid var(--border-subtle)',
          display:      'flex',
          flexDirection:'column',
          gap:          '6px',
        }}>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center', marginBottom: '6px' }}>
            Demo credentials
          </p>
          {[
            { label: 'Viewer', user: 'user',  pass: 'user',  badge: 'viewer' },
            { label: 'Admin',  user: 'admin', pass: 'admin', badge: 'admin'  },
          ].map((c) => (
            <button key={c.user}
              onClick={() => { setUsername(c.user); setPassword(c.pass); setError(''); }}
              style={{
                display:       'flex',
                alignItems:    'center',
                justifyContent:'space-between',
                background:    'var(--bg-surface-2)',
                border:        '1px solid var(--border-subtle)',
                borderRadius:  'var(--radius-sm)',
                padding:       '7px 12px',
                cursor:        'pointer',
                transition:    'border-color 150ms',
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--border-strong)'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-subtle)'}
            >
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{c.user}</span>
                {' / '}
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{c.pass}</span>
              </span>
              <span style={{
                padding: '2px 8px', borderRadius: '999px', fontSize: '0.65rem', fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.05em',
                background: c.badge === 'admin' ? 'rgba(139,92,246,0.15)' : 'rgba(59,130,246,0.12)',
                color:      c.badge === 'admin' ? 'var(--accent-purple)'  : 'var(--accent-blue)',
              }}>{c.badge}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
