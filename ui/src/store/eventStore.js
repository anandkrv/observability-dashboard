import { create } from 'zustand';
import { ALL_BUILDS } from '../data/builds.js';

// ── Persist helpers ────────────────────────────────────────────────────────
function load(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}
function save(key, val) {
  localStorage.setItem(key, JSON.stringify(val));
}

// ── Initial event active map: all true ────────────────────────────────────
const defaultEventMap = Object.fromEntries(ALL_BUILDS.map((b) => [b.id, true]));
const savedEventMap   = load('obs-events', defaultEventMap);
// Ensure new events (added to ALL_BUILDS) default to active
ALL_BUILDS.forEach((b) => { if (savedEventMap[b.id] === undefined) savedEventMap[b.id] = true; });

// ── Schema initial data ────────────────────────────────────────────────────
const defaultSchema = {
  businessUnits: [
    { id:1, name:'Payments',    is_active:true,  created_by:'admin' },
    { id:2, name:'Platform',    is_active:true,  created_by:'admin' },
    { id:3, name:'Operations',  is_active:true,  created_by:'admin' },
    { id:4, name:'Data',        is_active:true,  created_by:'admin' },
  ],
  domains: [
    { id:1, name:'FinancialServices', business_unit:'Payments',   is_active:true,  created_by:'admin' },
    { id:2, name:'Core Platform',     business_unit:'Platform',   is_active:true,  created_by:'admin' },
    { id:3, name:'Commerce',          business_unit:'Operations', is_active:true,  created_by:'admin' },
    { id:4, name:'Notifications',     business_unit:'Platform',   is_active:true,  created_by:'admin' },
    { id:5, name:'Analytics',         business_unit:'Data',       is_active:true,  created_by:'admin' },
  ],
  products: [
    { id:1, name:'PaymentGateway',    domain:'FinancialServices', owner:'pay-team@company.com',     is_active:true,  created_by:'admin' },
    { id:2, name:'AuthService',       domain:'Core Platform',     owner:'auth-team@company.com',    is_active:true,  created_by:'admin' },
    { id:3, name:'OrderManagement',   domain:'Commerce',          owner:'order-team@company.com',   is_active:true,  created_by:'admin' },
    { id:4, name:'NotificationSvc',   domain:'Notifications',     owner:'notif-team@company.com',   is_active:true,  created_by:'admin' },
    { id:5, name:'ReportingEngine',   domain:'Analytics',         owner:'report-team@company.com',  is_active:true,  created_by:'admin' },
    { id:6, name:'InventoryService',  domain:'Commerce',          owner:'inv-team@company.com',     is_active:true,  created_by:'admin' },
    { id:7, name:'UserProfileSvc',    domain:'Core Platform',     owner:'profile-team@company.com', is_active:true,  created_by:'admin' },
    { id:8, name:'AnalyticsPipeline', domain:'Analytics',         owner:'data-team@company.com',    is_active:true,  created_by:'admin' },
  ],
  testAreas: [
    { id:1, name:'Unit',         is_active:true,  created_by:'admin' },
    { id:2, name:'Integration',  is_active:true,  created_by:'admin' },
    { id:3, name:'E2E',          is_active:true,  created_by:'admin' },
    { id:4, name:'Performance',  is_active:false, created_by:'admin' },
  ],
  testTypes: [
    { id:1, name:'API',          test_area:'Integration', is_active:true,  created_by:'admin' },
    { id:2, name:'UI',           test_area:'E2E',         is_active:true,  created_by:'admin' },
    { id:3, name:'Database',     test_area:'Integration', is_active:true,  created_by:'admin' },
    { id:4, name:'Load',         test_area:'Performance', is_active:false, created_by:'admin' },
    { id:5, name:'Smoke',        test_area:'E2E',         is_active:true,  created_by:'admin' },
  ],
  releases: [
    { id:1,  product:'PaymentGateway',    version:'v3.2.1', platform:'linux-x64', is_active:true,  created_by:'admin' },
    { id:2,  product:'PaymentGateway',    version:'v3.1.0', platform:'linux-x64', is_active:true,  created_by:'admin' },
    { id:3,  product:'AuthService',       version:'v1.8.0', platform:'linux-x64', is_active:true,  created_by:'admin' },
    { id:4,  product:'AuthService',       version:'v1.7.5', platform:'linux-x64', is_active:true,  created_by:'admin' },
    { id:5,  product:'OrderManagement',   version:'v2.4.0', platform:'linux-x64', is_active:true,  created_by:'admin' },
    { id:6,  product:'OrderManagement',   version:'v2.3.2', platform:'win-x64',   is_active:true,  created_by:'admin' },
    { id:7,  product:'NotificationSvc',   version:'v0.9.4', platform:'linux-x64', is_active:true,  created_by:'admin' },
    { id:8,  product:'ReportingEngine',   version:'v1.5.2', platform:'linux-x64', is_active:true,  created_by:'admin' },
    { id:9,  product:'InventoryService',  version:'v4.0.1', platform:'linux-x64', is_active:true,  created_by:'admin' },
    { id:10, product:'UserProfileSvc',    version:'v2.1.0', platform:'linux-x64', is_active:true,  created_by:'admin' },
    { id:11, product:'AnalyticsPipeline', version:'v5.3.0', platform:'linux-x64', is_active:true,  created_by:'admin' },
    { id:12, product:'AnalyticsPipeline', version:'v5.2.1', platform:'linux-x64', is_active:true,  created_by:'admin' },
  ],
  appUsers: [
    { id:1, email:'admin@company.com',   display_name:'Admin',        role:'admin',  is_active:true  },
    { id:2, email:'user@company.com',    display_name:'User',         role:'viewer', is_active:true  },
    { id:3, email:'dev1@company.com',    display_name:'Dev One',      role:'editor', is_active:true  },
    { id:4, email:'dev2@company.com',    display_name:'Dev Two',      role:'editor', is_active:true  },
    { id:5, email:'qa@company.com',      display_name:'QA Engineer',  role:'viewer', is_active:true  },
    { id:6, email:'ops@company.com',     display_name:'Ops Engineer', role:'editor', is_active:false },
  ],
};

const savedSchema = load('obs-schema', defaultSchema);

// ── Store ──────────────────────────────────────────────────────────────────
export const useEventStore = create((set, get) => ({
  eventMap: savedEventMap,
  schema:   savedSchema,

  // ── Event active/inactive ────────────────────────────────────────────────
  setEventActive: (id, active) => set((s) => {
    const next = { ...s.eventMap, [id]: active };
    save('obs-events', next);
    return { eventMap: next };
  }),

  setAllActive: (ids, active) => set((s) => {
    const next = { ...s.eventMap };
    ids.forEach((id) => { next[id] = active; });
    save('obs-events', next);
    return { eventMap: next };
  }),

  isEventActive: (id) => get().eventMap[id] !== false,

  getActiveBuilds: () => ALL_BUILDS.filter((b) => get().eventMap[b.id] !== false),

  // ── Schema CRUD (generic) ────────────────────────────────────────────────
  updateSchemaTable: (table, rows) => set((s) => {
    const next = { ...s.schema, [table]: rows };
    save('obs-schema', next);
    return { schema: next };
  }),

  addSchemaRow: (table, row) => set((s) => {
    const rows = s.schema[table];
    const maxId = rows.reduce((m, r) => Math.max(m, r.id), 0);
    const next = { ...s.schema, [table]: [...rows, { ...row, id: maxId + 1 }] };
    save('obs-schema', next);
    return { schema: next };
  }),

  updateSchemaRow: (table, id, patch) => set((s) => {
    const next = { ...s.schema, [table]: s.schema[table].map((r) => r.id === id ? { ...r, ...patch } : r) };
    save('obs-schema', next);
    return { schema: next };
  }),

  deleteSchemaRow: (table, id) => set((s) => {
    const next = { ...s.schema, [table]: s.schema[table].filter((r) => r.id !== id) };
    save('obs-schema', next);
    return { schema: next };
  }),
}));
