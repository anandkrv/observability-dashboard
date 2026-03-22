import { create } from 'zustand';
import { subDays, subMonths } from 'date-fns';

function getDateRange(timeline) {
  const now = new Date();
  switch (timeline) {
    case '1w': return { dateFrom: subDays(now, 7),    dateTo: now };
    case '6m': return { dateFrom: subMonths(now, 6),  dateTo: now };
    case '1m':
    default:   return { dateFrom: subDays(now, 30),   dateTo: now };
  }
}

const savedTheme = localStorage.getItem('obs-theme') || 'dark';

export const useFilterStore = create((set, get) => ({
  product:  null,   // product id (number) | null
  release:  null,   // release id (number) | null
  platform: null,   // 'linux' | 'windows' | null
  timeline: '1m',
  ...getDateRange('1m'),

  theme: savedTheme,

  setProduct:  (product)  => set({ product, release: null }),
  setRelease:  (release)  => set({ release }),
  setPlatform: (platform) => set({ platform }),

  setTimeline: (timeline) => set({ timeline, ...getDateRange(timeline) }),

  setCustomRange: (dateFrom, dateTo) =>
    set({ timeline: 'custom', dateFrom, dateTo }),

  toggleTheme: () => set((state) => {
    const next = state.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('obs-theme', next);
    document.documentElement.setAttribute('data-theme', next);
    return { theme: next };
  }),

  reset: () =>
    set({ product: null, release: null, platform: null, timeline: '1m', ...getDateRange('1m') }),
}));
