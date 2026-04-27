//ce fichier gère l'authentification de l'administrateur en utilisant Zustand pour stocker le token et les informations de l'administrateur, ainsi que les fonctions de connexion et de déconnexion.
import { create } from 'zustand';
import type { AdminInfo } from './adminApi';

interface AuthState {
  token:    string | null;
  admin:    AdminInfo | null;
  isLogged: boolean;
  login:    (token: string, admin: AdminInfo) => void;
  logout:   () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token:    localStorage.getItem('admin_token'),
  admin:    (() => { try { const s = localStorage.getItem('admin_info'); return s ? JSON.parse(s) : null; } catch { return null; } })(),
  isLogged: !!localStorage.getItem('admin_token'),
  login: (token, admin) => {
    localStorage.setItem('admin_token', token);
    localStorage.setItem('admin_info', JSON.stringify(admin));
    set({ token, admin, isLogged: true });
  },
  logout: () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_info');
    set({ token: null, admin: null, isLogged: false });
  },
}));