import { create } from 'zustand';

const USERS = [
  { username: 'user',  password: 'user',  role: 'viewer', displayName: 'User' },
  { username: 'admin', password: 'admin', role: 'admin',  displayName: 'Admin' },
];

const saved = (() => {
  try { return JSON.parse(localStorage.getItem('obs-auth') || 'null'); }
  catch { return null; }
})();

export const useAuthStore = create((set) => ({
  user: saved,

  login: (username, password) => {
    const found = USERS.find((u) => u.username === username && u.password === password);
    if (!found) return false;
    const user = { username: found.username, role: found.role, displayName: found.displayName };
    localStorage.setItem('obs-auth', JSON.stringify(user));
    set({ user });
    return true;
  },

  logout: () => {
    localStorage.removeItem('obs-auth');
    set({ user: null });
  },
}));
