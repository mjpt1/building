import { create } from 'zustand';
import { api, tokenStore } from './api';

export interface AuthUser {
  id: string;
  mobile: string;
  fullName: string;
  roles: string[];
  permissions: string[];
  buildingIds: string[];
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  buildingId: string | null;
  setUser: (u: AuthUser | null) => void;
  setBuilding: (id: string) => void;
  loadMe: () => Promise<void>;
  logout: () => Promise<void>;
  hasPerm: (perm: string) => boolean;
  hasRole: (...roles: string[]) => boolean;
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  loading: true,
  buildingId: typeof window !== 'undefined' ? localStorage.getItem('saman_building') : null,

  setUser: (user) => set({ user }),
  setBuilding: (id) => {
    if (typeof window !== 'undefined') localStorage.setItem('saman_building', id);
    set({ buildingId: id });
  },

  loadMe: async () => {
    if (!tokenStore.getAccess()) {
      set({ user: null, loading: false });
      return;
    }
    try {
      const res = await api.get('/auth/me');
      const user: AuthUser = res.data.data;
      set({ user, loading: false });
      // انتخاب پیش‌فرض ساختمان
      if (!get().buildingId && user.buildingIds.length > 0) {
        get().setBuilding(user.buildingIds[0]);
      }
    } catch {
      set({ user: null, loading: false });
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout', { refreshToken: tokenStore.getRefresh() });
    } catch {
      /* ignore */
    }
    tokenStore.clear();
    set({ user: null });
    if (typeof window !== 'undefined') window.location.href = '/login';
  },

  hasPerm: (perm) => {
    const u = get().user;
    if (!u) return false;
    if (u.roles.includes('SUPER_ADMIN')) return true;
    return u.permissions.includes(perm);
  },

  hasRole: (...roles) => {
    const u = get().user;
    return !!u && roles.some((r) => u.roles.includes(r));
  },
}));
