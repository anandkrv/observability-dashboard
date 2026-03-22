import { useState, useMemo } from 'react';
import { ALL_BUILDS } from '../data/builds.js';
import { useEventStore } from '../store/eventStore.js';

// ── Style tokens ─────────────────────────────────────────────────────────────
const card = { background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '20px' };
const thSt = { padding: '9px 12px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.69rem', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-surface-2)' };
const tdSt = { padding: '9px 12px', fontSize: '0.8rem', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-subtle)', whiteSpace: 'nowrap' };
const inputSt = { background: 'var(--bg-surface-2)', color: 'var(--text-primary)', border: '1px solid var(--border-muted)', borderRadius: 'var(--radius-sm)', padding: '5px 8px', fontSize: '0.78rem', outline: 'none', fontFamily: 'var(--font-sans)', width: '100%', boxSizing: 'border-box' };
const selSt   = { ...inputSt, cursor: 'pointer' };
const STATUS_COLOR = { SUCCESS:'#18C964', FAILURE:'#F31260', ABORTED:'#7B7E8C', UNSTABLE:'#E07B39', RUNNING:'#F5A623' };

function unique(arr) { return [...new Set(arr)].sort(); }

// ── Toggle pill ───────────────────────────────────────────────────────────────
function Toggle({ active, onChange }) {
  return (
    <button onClick={() => onChange(!active)}
      style={{
        width: '40px', height: '22px', borderRadius: '11px', border: 'none', cursor: 'pointer',
        background: active ? 'var(--color-success)' : 'var(--bg-surface-3)',
        position: 'relative', transition: 'background 200ms', flexShrink: 0,
      }}>
      <div style={{
        position: 'absolute', top: '3px', left: active ? '21px' : '3px',
        width: '16px', height: '16px', borderRadius: '50%',
        background: active ? '#fff' : 'var(--text-muted)',
        transition: 'left 200ms',
      }} />
    </button>
  );
}

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const c = STATUS_COLOR[status] || '#4A5568';
  return <span style={{ padding:'2px 8px', borderRadius:'999px', background:`${c}18`, color:c, fontSize:'0.7rem', fontWeight:700, fontFamily:'var(--font-mono)' }}>{status}</span>;
}

// ── Active/Inactive pill ──────────────────────────────────────────────────────
function ActivePill({ active }) {
  return <span style={{ padding:'2px 8px', borderRadius:'999px', background: active ? 'rgba(24,201,100,0.12)' : 'rgba(123,126,140,0.15)', color: active ? 'var(--color-success)' : 'var(--text-muted)', fontSize:'0.68rem', fontWeight:700 }}>{active ? 'Active' : 'Inactive'}</span>;
}

// ─────────────────────────────────────────────────────────────────────────────
// EVENTS TAB
// ─────────────────────────────────────────────────────────────────────────────
function EventsTab() {
  const { eventMap, setEventActive, setAllActive } = useEventStore();
  const [f, setF] = useState({ product:'', release:'', build:'', platform:'', status:'' });
  const [selected, setSelected] = useState(new Set());

  const filtered = useMemo(() => ALL_BUILDS.filter((b) => {
    if (f.product  && b.product  !== f.product)  return false;
    if (f.release  && b.release  !== f.release)  return false;
    if (f.build    && b.build    !== f.build)    return false;
    if (f.platform && b.platform !== f.platform) return false;
    if (f.status   && b.status   !== f.status)   return false;
    return true;
  }), [f]);

  const activeCount   = filtered.filter((b) => eventMap[b.id] !== false).length;
  const inactiveCount = filtered.length - activeCount;

  const allSelectedActive   = selected.size > 0 && [...selected].every((id) => eventMap[id] !== false);
  const allSelectedInactive = selected.size > 0 && [...selected].every((id) => eventMap[id] === false);

  function toggleSelect(id) {
    setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleAll() {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((b) => b.id)));
  }
  function bulkSet(active) {
    setAllActive([...selected], active);
    setSelected(new Set());
  }

  const filterSel = (key, val) => setF((p) => ({ ...p, [key]: val, ...(key === 'product' ? { release:'', build:'' } : key === 'release' ? { build:'' } : {}) }));

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
      {/* Summary KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(140px,1fr))', gap:'12px' }}>
        {[
          { label:'Total Events',    val: ALL_BUILDS.length,                                          color:'var(--text-primary)' },
          { label:'Active',          val: Object.values(eventMap).filter(Boolean).length,             color:'var(--color-success)' },
          { label:'Inactive',        val: Object.values(eventMap).filter((v)=>v===false).length,      color:'var(--text-muted)' },
          { label:'Filtered (shown)',val: filtered.length,                                            color:'var(--accent-blue)' },
        ].map((k) => (
          <div key={k.label} style={card}>
            <p style={{ fontSize:'0.68rem', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'4px' }}>{k.label}</p>
            <p style={{ fontSize:'1.6rem', fontFamily:'var(--font-mono)', fontWeight:700, color:k.color }}>{k.val}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ ...card, padding:'14px 20px' }}>
        <p style={{ fontSize:'0.7rem', fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'10px' }}>Filter Events</p>
        <div style={{ display:'flex', gap:'10px', flexWrap:'wrap', alignItems:'flex-end' }}>
          {[
            { key:'product',  label:'Product',  opts: unique(ALL_BUILDS.map(b=>b.product)) },
            { key:'release',  label:'Release',  opts: unique(ALL_BUILDS.filter(b=>!f.product||b.product===f.product).map(b=>b.release)) },
            { key:'build',    label:'Build #',  opts: unique(ALL_BUILDS.filter(b=>(!f.product||b.product===f.product)&&(!f.release||b.release===f.release)).map(b=>b.build)) },
            { key:'platform', label:'Platform', opts: unique(ALL_BUILDS.map(b=>b.platform)) },
            { key:'status',   label:'Status',   opts: unique(ALL_BUILDS.map(b=>b.status)) },
          ].map(({ key, label, opts }) => (
            <div key={key} style={{ display:'flex', flexDirection:'column', gap:'3px', minWidth:'130px' }}>
              <label style={{ fontSize:'0.65rem', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em' }}>{label}</label>
              <select value={f[key]} onChange={(e)=>filterSel(key,e.target.value)} style={selSt}>
                <option value="">All</option>
                {opts.map(o=><option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          ))}
          {Object.values(f).some(Boolean) && (
            <button onClick={()=>setF({ product:'', release:'', build:'', platform:'', status:'' })}
              style={{ background:'transparent', color:'var(--text-muted)', border:'1px solid var(--border-subtle)', borderRadius:'var(--radius-sm)', padding:'5px 10px', fontSize:'0.75rem', cursor:'pointer', alignSelf:'flex-end' }}>
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Bulk actions */}
      <div style={{ display:'flex', alignItems:'center', gap:'10px', flexWrap:'wrap' }}>
        <span style={{ fontSize:'0.78rem', color:'var(--text-muted)' }}>
          {selected.size > 0 ? `${selected.size} selected` : `${filtered.length} events • ${activeCount} active, ${inactiveCount} inactive`}
        </span>
        {selected.size > 0 && (
          <>
            <button onClick={()=>bulkSet(true)}
              style={{ background:'rgba(24,201,100,0.12)', color:'var(--color-success)', border:'1px solid rgba(24,201,100,0.3)', borderRadius:'var(--radius-sm)', padding:'5px 12px', fontSize:'0.78rem', fontWeight:600, cursor:'pointer' }}>
              Activate Selected
            </button>
            <button onClick={()=>bulkSet(false)}
              style={{ background:'rgba(123,126,140,0.12)', color:'var(--text-muted)', border:'1px solid var(--border-muted)', borderRadius:'var(--radius-sm)', padding:'5px 12px', fontSize:'0.78rem', fontWeight:600, cursor:'pointer' }}>
              Deactivate Selected
            </button>
            <button onClick={()=>setSelected(new Set())}
              style={{ background:'transparent', color:'var(--text-muted)', border:'none', fontSize:'0.75rem', cursor:'pointer' }}>
              Clear selection
            </button>
          </>
        )}
        <div style={{ flex:1 }} />
        <button onClick={()=>setAllActive(filtered.map(b=>b.id), true)}
          style={{ background:'transparent', color:'var(--color-success)', border:'1px solid rgba(24,201,100,0.3)', borderRadius:'var(--radius-sm)', padding:'5px 12px', fontSize:'0.75rem', cursor:'pointer' }}>
          Activate All Filtered
        </button>
        <button onClick={()=>setAllActive(filtered.map(b=>b.id), false)}
          style={{ background:'transparent', color:'var(--text-muted)', border:'1px solid var(--border-muted)', borderRadius:'var(--radius-sm)', padding:'5px 12px', fontSize:'0.75rem', cursor:'pointer' }}>
          Deactivate All Filtered
        </button>
      </div>

      {/* Table */}
      <div style={{ overflowX:'auto', border:'1px solid var(--border-subtle)', borderRadius:'var(--radius-lg)' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr>
              <th style={{ ...thSt, width:'40px' }}>
                <input type="checkbox" checked={selected.size===filtered.length&&filtered.length>0} onChange={toggleAll}
                  style={{ cursor:'pointer', accentColor:'var(--accent-blue)' }} />
              </th>
              {['Product','Release','Build #','Platform','Status','Duration','Stages','Active'].map(h=>(
                <th key={h} style={thSt}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((b) => {
              const active = eventMap[b.id] !== false;
              const isSelected = selected.has(b.id);
              return (
                <tr key={b.id}
                  style={{ background: isSelected ? 'rgba(59,130,246,0.06)' : active ? 'transparent' : 'rgba(123,126,140,0.04)', opacity: active ? 1 : 0.55 }}
                  onMouseEnter={(e)=>{ if(!isSelected) e.currentTarget.style.background='var(--bg-surface-2)'; }}
                  onMouseLeave={(e)=>{ e.currentTarget.style.background = isSelected ? 'rgba(59,130,246,0.06)' : active ? 'transparent' : 'rgba(123,126,140,0.04)'; }}>
                  <td style={tdSt}>
                    <input type="checkbox" checked={isSelected} onChange={()=>toggleSelect(b.id)}
                      style={{ cursor:'pointer', accentColor:'var(--accent-blue)' }} />
                  </td>
                  <td style={{ ...tdSt, color:'var(--text-primary)', fontWeight:500 }}>{b.product}</td>
                  <td style={{ ...tdSt, fontFamily:'var(--font-mono)', color:'var(--accent-blue)' }}>{b.release}</td>
                  <td style={{ ...tdSt, fontFamily:'var(--font-mono)' }}>#{b.build}</td>
                  <td style={tdSt}>{b.platform}</td>
                  <td style={tdSt}><StatusBadge status={b.status} /></td>
                  <td style={{ ...tdSt, fontFamily:'var(--font-mono)' }}>{b.duration}s</td>
                  <td style={tdSt}>
                    <div style={{ display:'flex', gap:'3px' }}>
                      {b.stages.map((st)=>(
                        <span key={st.name} title={`${st.name}: ${st.s}`}
                          style={{ width:'8px', height:'8px', borderRadius:'2px', background:STATUS_COLOR[st.s]||'#4A5568', display:'inline-block' }} />
                      ))}
                    </div>
                  </td>
                  <td style={tdSt}>
                    <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                      <Toggle active={active} onChange={(v)=>setEventActive(b.id, v)} />
                      <ActivePill active={active} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GENERIC SCHEMA TABLE EDITOR
// ─────────────────────────────────────────────────────────────────────────────

function SchemaTable({ title, rows, columns, onAdd, onUpdate, onDelete }) {
  const [editId,   setEditId]   = useState(null);
  const [editData, setEditData] = useState({});
  const [addMode,  setAddMode]  = useState(false);
  const [newRow,   setNewRow]   = useState({});
  const [filterQ,  setFilterQ]  = useState('');

  const filtered = filterQ
    ? rows.filter((r) => columns.some((c) => String(r[c.key] ?? '').toLowerCase().includes(filterQ.toLowerCase())))
    : rows;

  function startEdit(row) { setEditId(row.id); setEditData({ ...row }); setAddMode(false); }
  function cancelEdit()   { setEditId(null); setEditData({}); }
  function saveEdit()     { onUpdate(editId, editData); cancelEdit(); }
  function startAdd()     { setAddMode(true); setNewRow(Object.fromEntries(columns.map(c=>[c.key, c.default ?? '']))); setEditId(null); }
  function cancelAdd()    { setAddMode(false); setNewRow({}); }
  function saveAdd()      { onAdd(newRow); cancelAdd(); }

  const editCols = columns.filter((c) => c.editable !== false);

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
        <p style={{ fontSize:'0.72rem', fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', flex:1 }}>
          {title} <span style={{ color:'var(--text-muted)', fontWeight:400 }}>({rows.length} records)</span>
        </p>
        <input value={filterQ} onChange={(e)=>setFilterQ(e.target.value)} placeholder="Search…"
          style={{ ...inputSt, width:'160px' }} />
        <button onClick={startAdd}
          style={{ background:'var(--accent-blue)', color:'#fff', border:'none', borderRadius:'var(--radius-sm)', padding:'6px 14px', fontSize:'0.78rem', fontWeight:600, cursor:'pointer' }}>
          + Add Row
        </button>
      </div>

      <div style={{ overflowX:'auto', border:'1px solid var(--border-subtle)', borderRadius:'var(--radius-lg)' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr>
              {columns.map((c)=>(<th key={c.key} style={thSt}>{c.label}</th>))}
              <th style={thSt}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {/* Add row */}
            {addMode && (
              <tr style={{ background:'rgba(59,130,246,0.06)' }}>
                {columns.map((c)=>(
                  <td key={c.key} style={tdSt}>
                    {c.editable===false ? <span style={{ color:'var(--text-muted)', fontSize:'0.7rem' }}>auto</span>
                    : c.type==='bool'  ? <Toggle active={!!newRow[c.key]} onChange={(v)=>setNewRow(p=>({...p,[c.key]:v}))} />
                    : c.options        ? (
                      <select value={newRow[c.key]||''} onChange={(e)=>setNewRow(p=>({...p,[c.key]:e.target.value}))} style={selSt}>
                        <option value="">Select…</option>
                        {c.options.map(o=><option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : (
                      <input value={newRow[c.key]||''} onChange={(e)=>setNewRow(p=>({...p,[c.key]:e.target.value}))} style={inputSt} />
                    )}
                  </td>
                ))}
                <td style={tdSt}>
                  <div style={{ display:'flex', gap:'6px' }}>
                    <button onClick={saveAdd}   style={{ background:'var(--accent-blue)', color:'#fff', border:'none', borderRadius:'var(--radius-sm)', padding:'4px 10px', fontSize:'0.75rem', cursor:'pointer', fontWeight:600 }}>Save</button>
                    <button onClick={cancelAdd} style={{ background:'transparent', color:'var(--text-muted)', border:'1px solid var(--border-muted)', borderRadius:'var(--radius-sm)', padding:'4px 10px', fontSize:'0.75rem', cursor:'pointer' }}>Cancel</button>
                  </div>
                </td>
              </tr>
            )}
            {/* Data rows */}
            {filtered.map((row)=>{
              const isEditing = editId === row.id;
              return (
                <tr key={row.id}
                  style={{ background: isEditing ? 'rgba(59,130,246,0.06)' : 'transparent' }}
                  onMouseEnter={(e)=>{ if(!isEditing) e.currentTarget.style.background='var(--bg-surface-2)'; }}
                  onMouseLeave={(e)=>{ e.currentTarget.style.background = isEditing ? 'rgba(59,130,246,0.06)' : 'transparent'; }}>
                  {columns.map((c)=>(
                    <td key={c.key} style={tdSt}>
                      {isEditing && c.editable!==false ? (
                        c.type==='bool' ? <Toggle active={!!editData[c.key]} onChange={(v)=>setEditData(p=>({...p,[c.key]:v}))} />
                        : c.options     ? (
                          <select value={editData[c.key]||''} onChange={(e)=>setEditData(p=>({...p,[c.key]:e.target.value}))} style={selSt}>
                            {c.options.map(o=><option key={o} value={o}>{o}</option>)}
                          </select>
                        ) : (
                          <input value={editData[c.key]||''} onChange={(e)=>setEditData(p=>({...p,[c.key]:e.target.value}))} style={inputSt} />
                        )
                      ) : c.type==='bool' ? (
                        <ActivePill active={row[c.key]} />
                      ) : c.key==='id' ? (
                        <span style={{ fontFamily:'var(--font-mono)', color:'var(--text-muted)' }}>{row[c.key]}</span>
                      ) : (
                        <span style={{ color: c.primary ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: c.primary ? 500 : 400 }}>
                          {String(row[c.key] ?? '—')}
                        </span>
                      )}
                    </td>
                  ))}
                  <td style={tdSt}>
                    {isEditing ? (
                      <div style={{ display:'flex', gap:'6px' }}>
                        <button onClick={saveEdit}   style={{ background:'var(--accent-blue)', color:'#fff', border:'none', borderRadius:'var(--radius-sm)', padding:'4px 10px', fontSize:'0.75rem', cursor:'pointer', fontWeight:600 }}>Save</button>
                        <button onClick={cancelEdit} style={{ background:'transparent', color:'var(--text-muted)', border:'1px solid var(--border-muted)', borderRadius:'var(--radius-sm)', padding:'4px 10px', fontSize:'0.75rem', cursor:'pointer' }}>Cancel</button>
                      </div>
                    ) : (
                      <div style={{ display:'flex', gap:'6px' }}>
                        <button onClick={()=>startEdit(row)}
                          style={{ background:'transparent', color:'var(--accent-blue)', border:'1px solid rgba(59,130,246,0.3)', borderRadius:'var(--radius-sm)', padding:'4px 10px', fontSize:'0.75rem', cursor:'pointer' }}>Edit</button>
                        <button onClick={()=>onUpdate(row.id, { is_active: !row.is_active })}
                          style={{ background:'transparent', color: row.is_active ? 'var(--text-muted)' : 'var(--color-success)', border:'1px solid var(--border-muted)', borderRadius:'var(--radius-sm)', padding:'4px 10px', fontSize:'0.75rem', cursor:'pointer' }}>
                          {row.is_active ? 'Disable' : 'Enable'}
                        </button>
                        <button onClick={()=>{ if(window.confirm(`Delete "${row.name || row.email || row.id}"?`)) onDelete(row.id); }}
                          style={{ background:'transparent', color:'var(--color-failure)', border:'1px solid rgba(243,18,96,0.3)', borderRadius:'var(--radius-sm)', padding:'4px 10px', fontSize:'0.75rem', cursor:'pointer' }}>Del</button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
            {filtered.length===0 && (
              <tr><td colSpan={columns.length+1} style={{ ...tdSt, textAlign:'center', padding:'24px', color:'var(--text-muted)' }}>No records found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCHEMA TAB
// ─────────────────────────────────────────────────────────────────────────────
const SCHEMA_TABS = [
  { key:'businessUnits', label:'Business Units' },
  { key:'domains',       label:'Domains'        },
  { key:'products',      label:'Products'       },
  { key:'testAreas',     label:'Test Areas'     },
  { key:'testTypes',     label:'Test Types'     },
  { key:'releases',      label:'Releases'       },
  { key:'appUsers',      label:'App Users'      },
];

const SCHEMA_COLS = {
  businessUnits: [
    { key:'id',         label:'ID',           editable:false },
    { key:'name',       label:'Name',         primary:true   },
    { key:'is_active',  label:'Status',       type:'bool',   default:true },
    { key:'created_by', label:'Created By'  },
  ],
  domains: [
    { key:'id',            label:'ID',            editable:false },
    { key:'name',          label:'Name',          primary:true   },
    { key:'business_unit', label:'Business Unit'  },
    { key:'is_active',     label:'Status',        type:'bool', default:true },
    { key:'created_by',    label:'Created By'     },
  ],
  products: [
    { key:'id',         label:'ID',      editable:false },
    { key:'name',       label:'Name',    primary:true   },
    { key:'domain',     label:'Domain'   },
    { key:'owner',      label:'Owner'    },
    { key:'is_active',  label:'Status',  type:'bool', default:true },
    { key:'created_by', label:'Created By' },
  ],
  testAreas: [
    { key:'id',         label:'ID',      editable:false },
    { key:'name',       label:'Name',    primary:true   },
    { key:'is_active',  label:'Status',  type:'bool', default:true },
    { key:'created_by', label:'Created By' },
  ],
  testTypes: [
    { key:'id',         label:'ID',        editable:false },
    { key:'name',       label:'Name',      primary:true   },
    { key:'test_area',  label:'Test Area'  },
    { key:'is_active',  label:'Status',    type:'bool', default:true },
    { key:'created_by', label:'Created By' },
  ],
  releases: [
    { key:'id',         label:'ID',       editable:false },
    { key:'product',    label:'Product',  primary:true   },
    { key:'version',    label:'Version'   },
    { key:'platform',   label:'Platform'  },
    { key:'is_active',  label:'Status',   type:'bool', default:true },
    { key:'created_by', label:'Created By' },
  ],
  appUsers: [
    { key:'id',           label:'ID',           editable:false },
    { key:'email',        label:'Email',         primary:true   },
    { key:'display_name', label:'Display Name'   },
    { key:'role',         label:'Role',          options:['viewer','editor','admin'] },
    { key:'is_active',    label:'Status',        type:'bool', default:true },
  ],
};

function SchemaManagementTab() {
  const { schema, addSchemaRow, updateSchemaRow, deleteSchemaRow } = useEventStore();
  const [activeSchema, setActiveSchema] = useState('businessUnits');

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
      {/* Schema sub-tabs */}
      <div style={{ display:'flex', gap:'4px', flexWrap:'wrap', borderBottom:'1px solid var(--border-subtle)', paddingBottom:'0' }}>
        {SCHEMA_TABS.map((t) => {
          const active = activeSchema === t.key;
          return (
            <button key={t.key} onClick={()=>setActiveSchema(t.key)}
              style={{
                padding:'8px 16px', border:'none', background:'transparent', cursor:'pointer',
                borderBottom: active ? '2px solid var(--accent-blue)' : '2px solid transparent',
                color: active ? 'var(--accent-blue)' : 'var(--text-secondary)',
                fontFamily:'var(--font-sans)', fontSize:'0.8rem', fontWeight: active ? 600 : 400,
                marginBottom:'-1px', transition:'all 150ms',
              }}
              onMouseEnter={(e)=>{ if(!active) e.currentTarget.style.color='var(--text-primary)'; }}
              onMouseLeave={(e)=>{ if(!active) e.currentTarget.style.color='var(--text-secondary)'; }}
            >{t.label}</button>
          );
        })}
      </div>

      <SchemaTable
        key={activeSchema}
        title={SCHEMA_TABS.find(t=>t.key===activeSchema)?.label}
        rows={schema[activeSchema] || []}
        columns={SCHEMA_COLS[activeSchema]}
        onAdd={(row)    => addSchemaRow(activeSchema, row)}
        onUpdate={(id, patch) => updateSchemaRow(activeSchema, id, patch)}
        onDelete={(id)  => deleteSchemaRow(activeSchema, id)}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SETTINGS PAGE
// ─────────────────────────────────────────────────────────────────────────────
const MAIN_TABS = [
  { key:'events', label:'Events',            icon:'⚡' },
  { key:'schema', label:'Schema Management', icon:'🗂' },
];

export function Settings() {
  const [activeTab, setActiveTab] = useState('events');

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', minHeight:0 }}>
      {/* Header */}
      <div style={{ padding:'14px 24px', borderBottom:'1px solid var(--border-subtle)', background:'var(--bg-surface)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <h1 style={{ fontSize:'1.05rem', fontWeight:700, color:'var(--text-primary)', marginBottom:'2px' }}>Settings</h1>
          <p style={{ fontSize:'0.72rem', color:'var(--text-muted)' }}>Event visibility control · Reference data management</p>
        </div>
        <span style={{ padding:'3px 10px', borderRadius:'999px', background:'rgba(139,92,246,0.12)', color:'var(--accent-purple)', fontSize:'0.68rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em' }}>
          Admin
        </span>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:'0', padding:'0 24px', borderBottom:'1px solid var(--border-subtle)', background:'var(--bg-surface)' }}>
        {MAIN_TABS.map((tab)=>{
          const active = activeTab === tab.key;
          return (
            <button key={tab.key} onClick={()=>setActiveTab(tab.key)}
              style={{
                padding:'10px 20px', border:'none',
                borderBottom: active ? '2px solid var(--accent-blue)' : '2px solid transparent',
                background:'transparent', color: active ? 'var(--accent-blue)' : 'var(--text-secondary)',
                fontFamily:'var(--font-sans)', fontSize:'0.83rem', fontWeight: active ? 600 : 400,
                cursor:'pointer', marginBottom:'-1px', transition:'all 150ms', display:'flex', alignItems:'center', gap:'6px',
              }}
              onMouseEnter={(e)=>{ if(!active) e.currentTarget.style.color='var(--text-primary)'; }}
              onMouseLeave={(e)=>{ if(!active) e.currentTarget.style.color='var(--text-secondary)'; }}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div style={{ flex:1, padding:'24px', overflowY:'auto', background:'var(--bg-base)' }}>
        {activeTab==='events' && <EventsTab />}
        {activeTab==='schema' && <SchemaManagementTab />}
      </div>
    </div>
  );
}

export default Settings;
