import { create } from 'zustand';
import { api, fetchData, tokenStore } from './api';

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
      // مدیر کل به ساختمان خاصی وصل نیست و از فهرست همه‌ی ساختمان‌ها انتخاب می‌کند.
      let allowed = user.buildingIds;
      if (user.roles.includes('SUPER_ADMIN')) {
        const { data } = await fetchData<{ id: string }[]>('/buildings', { limit: 100 });
        allowed = data.map((b) => b.id);
      }
      // ساختمان ذخیره‌شده ممکن است متعلق به کاربر قبلی باشد.
      const current = get().buildingId;
      if (allowed.length > 0 && (!current || !allowed.includes(current))) {
        get().setBuilding(allowed[0]);
      }
      set({ user, loading: false });
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
