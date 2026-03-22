import { useState, useRef, useEffect, useCallback } from 'react';
import { marked } from 'marked';
import { useEventStore }  from '../../store/eventStore.js';
import { useFilterStore } from '../../store/filterStore.js';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

marked.setOptions({ breaks: true, gfm: true });

// ── Suggested starter questions ──────────────────────────────────────────
const SUGGESTIONS = [
  { label: 'Green build rate',    text: 'What is the overall green build rate across all products?' },
  { label: 'Top failures',        text: 'Which products have the most failures?' },
  { label: 'DORA metrics',        text: 'Give me the DORA metrics summary.' },
  { label: 'Stage bottlenecks',   text: 'Which pipeline stages take the longest on average?' },
  { label: 'Failing releases',    text: 'Which releases have the highest failure rate?' },
  { label: 'Platform comparison', text: 'Compare linux-x64 vs win-x64 build success rates.' },
];

// ── Simple markdown → safe HTML renderer ────────────────────────────────
function MarkdownMessage({ content }) {
  const html = marked.parse(content || '');
  return (
    <div
      className="chat-md"
      dangerouslySetInnerHTML={{ __html: html }}
      style={{
        fontSize: '0.82rem',
        lineHeight: '1.55',
        color: 'var(--text-primary)',
      }}
    />
  );
}

// ── Typing dots animation ────────────────────────────────────────────────
function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: '4px', alignItems: 'center', padding: '4px 0' }}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{
          width: '6px', height: '6px', borderRadius: '50%',
          background: 'var(--accent-blue)', opacity: 0.6,
          animation: `chatDot 1.2s ${i * 0.2}s infinite ease-in-out`,
        }} />
      ))}
    </div>
  );
}

// ── Chat message bubble ──────────────────────────────────────────────────
function Message({ msg }) {
  const isUser = msg.role === 'user';
  const isErr  = msg.error;

  return (
    <div style={{
      display:        'flex',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      marginBottom:   '12px',
      gap:            '8px',
      alignItems:     'flex-end',
    }}>
      {/* Avatar – assistant side */}
      {!isUser && (
        <div style={{
          width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.7rem', fontWeight: 700, color: '#fff',
        }}>AI</div>
      )}

      <div style={{
        maxWidth:     '82%',
        padding:      isUser ? '9px 13px' : '10px 14px',
        borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
        background:   isErr  ? 'rgba(243,18,96,0.08)'
                     : isUser ? 'var(--accent-blue)'
                     : 'var(--bg-surface)',
        border:       isErr  ? '1px solid rgba(243,18,96,0.25)'
                     : isUser ? 'none'
                     : '1px solid var(--border-subtle)',
        color:        isUser ? '#fff' : isErr ? 'var(--color-failure)' : 'var(--text-primary)',
        wordBreak:    'break-word',
        boxShadow:    '0 1px 4px rgba(0,0,0,0.1)',
      }}>
        {msg.typing ? (
          <TypingDots />
        ) : isUser ? (
          <span style={{ fontSize: '0.82rem', lineHeight: '1.5' }}>{msg.content}</span>
        ) : (
          <MarkdownMessage content={msg.content} />
        )}
      </div>

      {/* Avatar – user side */}
      {isUser && (
        <div style={{
          width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
          background: 'rgba(59,130,246,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.7rem', fontWeight: 700, color: 'var(--accent-blue)',
        }}>U</div>
      )}
    </div>
  );
}

// ── Main ChatBot component ───────────────────────────────────────────────
export function ChatBot({ activePage }) {
  const [open,     setOpen]     = useState(false);
  const [messages, setMessages] = useState([]);
  const [input,    setInput]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [unread,   setUnread]   = useState(0);
  const bottomRef  = useRef(null);
  const inputRef   = useRef(null);

  const { eventMap }  = useEventStore();
  const { schema }    = useEventStore();
  const { product, release, platform, timeline } = useFilterStore();

  // Active builds (respects event store)
  const { getActiveBuilds } = useEventStore();

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setUnread(0);
    }
  }, [open]);

  // Build context payload for the API
  const buildContext = useCallback(() => {
    const builds   = getActiveBuilds();
    const products = schema.products || [];
    return {
      builds,
      products,
      schema: {
        businessUnits: schema.businessUnits || [],
        domains:       schema.domains       || [],
        testAreas:     schema.testAreas     || [],
        releases:      schema.releases      || [],
      },
      page:    activePage,
      filters: { product, release, platform, timeline },
    };
  }, [getActiveBuilds, schema, activePage, product, release, platform, timeline]);

  async function sendMessage(text) {
    const userMsg = text.trim();
    if (!userMsg || loading) return;

    setInput('');
    const userEntry = { role: 'user', content: userMsg, id: Date.now() };
    const typingEntry = { role: 'assistant', content: '', typing: true, id: Date.now() + 1 };

    setMessages((prev) => [...prev, userEntry, typingEntry]);
    setLoading(true);

    try {
      const history = [...messages, userEntry]
        .filter((m) => !m.typing && !m.error)
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch(`${API_URL}/api/v1/chat`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ messages: history, context: buildContext() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      setMessages((prev) => [
        ...prev.filter((m) => !m.typing),
        { role: 'assistant', content: data.content, id: Date.now() + 2 },
      ]);

      if (!open) setUnread((n) => n + 1);
    } catch (err) {
      setMessages((prev) => [
        ...prev.filter((m) => !m.typing),
        { role: 'assistant', content: `**Error:** ${err.message}`, error: true, id: Date.now() + 2 },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  function clearChat() {
    setMessages([]);
    setUnread(0);
  }

  const hasMessages = messages.length > 0;

  return (
    <>
      {/* ── Global styles ── */}
      <style>{`
        @keyframes chatDot {
          0%,80%,100% { transform: scale(0.7); opacity:0.4; }
          40%          { transform: scale(1);   opacity:1;   }
        }
        .chat-md p        { margin: 0 0 6px 0; }
        .chat-md p:last-child { margin-bottom: 0; }
        .chat-md ul, .chat-md ol { margin: 4px 0 6px 16px; padding: 0; }
        .chat-md li        { margin-bottom: 3px; }
        .chat-md strong    { color: var(--text-primary); font-weight: 600; }
        .chat-md code      { font-family: var(--font-mono); font-size: 0.78em; background: var(--bg-surface-3); padding: 1px 5px; border-radius: 3px; }
        .chat-md pre       { background: var(--bg-surface-3); border-radius: 6px; padding: 10px 12px; overflow-x: auto; margin: 6px 0; }
        .chat-md pre code  { background: none; padding: 0; }
        .chat-md table     { border-collapse: collapse; width: 100%; margin: 6px 0; font-size: 0.78rem; }
        .chat-md th        { background: var(--bg-surface-2); padding: 5px 10px; border: 1px solid var(--border-subtle); text-align: left; font-weight: 600; color: var(--text-muted); text-transform: uppercase; font-size: 0.68rem; letter-spacing: 0.04em; }
        .chat-md td        { padding: 5px 10px; border: 1px solid var(--border-subtle); }
        .chat-md h1,.chat-md h2,.chat-md h3 { font-size: 0.9rem; font-weight: 700; margin: 8px 0 4px; color: var(--text-primary); }
        .chat-md blockquote { border-left: 3px solid var(--accent-blue); padding-left: 10px; color: var(--text-secondary); margin: 6px 0; }
        @keyframes chatSlideIn {
          from { opacity:0; transform: translateY(20px) scale(0.95); }
          to   { opacity:1; transform: translateY(0)    scale(1);    }
        }
        @keyframes chatPulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(59,130,246,0.4); }
          50%     { box-shadow: 0 0 0 8px rgba(59,130,246,0);  }
        }
      `}</style>

      {/* ── Chat panel ── */}
      {open && (
        <div style={{
          position:     'fixed',
          bottom:       '80px',
          right:        '20px',
          width:        '400px',
          height:       '560px',
          background:   'var(--bg-surface)',
          border:       '1px solid var(--border-subtle)',
          borderRadius: '16px',
          boxShadow:    '0 20px 60px rgba(0,0,0,0.3)',
          display:      'flex',
          flexDirection:'column',
          zIndex:       1000,
          animation:    'chatSlideIn 200ms ease',
          overflow:     'hidden',
        }}>
          {/* Header */}
          <div style={{
            padding:      '14px 16px',
            borderBottom: '1px solid var(--border-subtle)',
            background:   'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(139,92,246,0.08))',
            display:      'flex',
            alignItems:   'center',
            gap:          '10px',
            flexShrink:   0,
          }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.75rem', fontWeight: 700, color: '#fff',
              boxShadow: '0 2px 8px rgba(59,130,246,0.4)',
            }}>AI</div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Pipeline Assistant
              </p>
              <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', margin: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#18C964', display: 'inline-block' }} />
                Powered by Claude · Knows your pipeline data
              </p>
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              {hasMessages && (
                <button onClick={clearChat}
                  title="Clear chat"
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', borderRadius: '6px', fontSize: '0.75rem' }}
                  onMouseEnter={(e) => e.currentTarget.style.color='var(--text-primary)'}
                  onMouseLeave={(e) => e.currentTarget.style.color='var(--text-muted)'}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>
                  </svg>
                </button>
              )}
              <button onClick={() => setOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', borderRadius: '6px' }}
                onMouseEnter={(e) => e.currentTarget.style.color='var(--text-primary)'}
                onMouseLeave={(e) => e.currentTarget.style.color='var(--text-muted)'}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Messages area */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', background: 'var(--bg-base)' }}>
            {!hasMessages ? (
              /* Welcome screen */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
                  <div style={{
                    width: '56px', height: '56px', borderRadius: '50%', margin: '0 auto 12px',
                    background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.4rem', boxShadow: '0 4px 16px rgba(59,130,246,0.3)',
                  }}>🤖</div>
                  <p style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                    Hi! I'm your Pipeline Assistant
                  </p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                    Ask me anything about your CI builds, release metrics,<br />DORA KPIs, or pipeline health.
                  </p>
                </div>

                <div>
                  <p style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                    Quick queries
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {SUGGESTIONS.map((s) => (
                      <button key={s.label} onClick={() => sendMessage(s.text)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '8px',
                          background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
                          borderRadius: '10px', padding: '8px 12px',
                          cursor: 'pointer', textAlign: 'left', transition: 'all 150ms',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor='var(--accent-blue)'; e.currentTarget.style.background='rgba(59,130,246,0.04)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor='var(--border-subtle)'; e.currentTarget.style.background='var(--bg-surface)'; }}
                      >
                        <span style={{ fontSize: '0.75rem', color: 'var(--accent-blue)' }}>→</span>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{s.text}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              messages.map((msg) => <Message key={msg.id} msg={msg} />)
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input area */}
          <div style={{
            padding:      '12px 14px',
            borderTop:    '1px solid var(--border-subtle)',
            background:   'var(--bg-surface)',
            flexShrink:   0,
          }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about builds, releases, DORA metrics…"
                rows={1}
                style={{
                  flex:       1,
                  background: 'var(--bg-surface-2)',
                  border:     '1px solid var(--border-muted)',
                  borderRadius:'10px',
                  padding:    '9px 12px',
                  fontSize:   '0.82rem',
                  color:      'var(--text-primary)',
                  fontFamily: 'var(--font-sans)',
                  outline:    'none',
                  resize:     'none',
                  maxHeight:  '100px',
                  overflowY:  'auto',
                  lineHeight: '1.4',
                  transition: 'border-color 150ms',
                }}
                onFocus={(e) => e.target.style.borderColor='var(--accent-blue)'}
                onBlur={(e)  => e.target.style.borderColor='var(--border-muted)'}
                onInput={(e) => {
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
                }}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || loading}
                style={{
                  width:        '38px',
                  height:       '38px',
                  borderRadius: '10px',
                  border:       'none',
                  background:   !input.trim() || loading ? 'var(--bg-surface-3)' : 'var(--accent-blue)',
                  color:        !input.trim() || loading ? 'var(--text-muted)' : '#fff',
                  cursor:       !input.trim() || loading ? 'not-allowed' : 'pointer',
                  display:      'flex',
                  alignItems:   'center',
                  justifyContent:'center',
                  flexShrink:   0,
                  transition:   'all 150ms',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </div>
            <p style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: '6px', textAlign: 'center' }}>
              Enter to send · Shift+Enter for new line
            </p>
          </div>
        </div>
      )}

      {/* ── Floating action button ── */}
      <button
        onClick={() => { setOpen((o) => !o); setUnread(0); }}
        title="Pipeline Assistant"
        style={{
          position:     'fixed',
          bottom:       '20px',
          right:        '20px',
          width:        '52px',
          height:       '52px',
          borderRadius: '50%',
          border:       'none',
          background:   open ? 'var(--bg-surface-3)' : 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))',
          color:        '#fff',
          cursor:       'pointer',
          display:      'flex',
          alignItems:   'center',
          justifyContent:'center',
          boxShadow:    open ? '0 2px 12px rgba(0,0,0,0.2)' : '0 4px 20px rgba(59,130,246,0.5)',
          zIndex:       1001,
          transition:   'all 200ms ease',
          animation:    !open && !hasMessages ? 'chatPulse 2.5s infinite' : 'none',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform='scale(1.08)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform='scale(1)'; }}
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            <circle cx="9"  cy="10" r="1" fill="currentColor"/>
            <circle cx="12" cy="10" r="1" fill="currentColor"/>
            <circle cx="15" cy="10" r="1" fill="currentColor"/>
          </svg>
        )}
        {/* Unread badge */}
        {!open && unread > 0 && (
          <div style={{
            position: 'absolute', top: '-4px', right: '-4px',
            width: '18px', height: '18px', borderRadius: '50%',
            background: 'var(--color-failure)', color: '#fff',
            fontSize: '0.6rem', fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid var(--bg-base)',
          }}>{unread}</div>
        )}
      </button>
    </>
  );
}

export default ChatBot;
