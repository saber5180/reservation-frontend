import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api } from '../api/client';
import { useAuth } from './AuthContext';
import {
  createRealtimeSocket,
  requestNotifyPermission,
  showBrowserNotification,
} from '../lib/realtime';
import type { AdminRdv } from '../types/adminRdv';

type Ctx = {
  rdvs: AdminRdv[];
  refresh: () => Promise<void>;
  pendingCount: number;
  realtimeToast: string | null;
  clearRealtimeToast: () => void;
};

const AdminRealtimeCtx = createContext<Ctx | null>(null);

export function useAdminRealtime(): Ctx {
  const c = useContext(AdminRealtimeCtx);
  if (!c) throw new Error('useAdminRealtime doit être utilisé dans AdminRealtimeProvider');
  return c;
}

/** Compteur badge header ; 0 si pas connecté admin / hors provider. */
export function useAdminPendingCount(): number {
  return useContext(AdminRealtimeCtx)?.pendingCount ?? 0;
}

export function AdminRealtimeProvider({ children }: { children: ReactNode }) {
  const { token, user } = useAuth();
  const [rdvs, setRdvs] = useState<AdminRdv[]>([]);
  const [realtimeToast, setRealtimeToast] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await api.get<AdminRdv[]>('/reservations');
      setRdvs(data);
    } catch {
      /* garder la liste affichée en cas d’erreur réseau ponctuelle */
    }
  }, []);

  useEffect(() => {
    if (user?.role !== 'ADMIN' || !token) return;

    void refresh();
    requestNotifyPermission();

    const socket = createRealtimeSocket(token);
    let toastTimer: number | undefined;

    const bump = (msg: string, title: string, body: string) => {
      void refresh();
      setRealtimeToast(msg);
      showBrowserNotification(title, body);
      window.clearTimeout(toastTimer);
      toastTimer = window.setTimeout(() => setRealtimeToast(null), 6000);
    };

    const onNew = () =>
      bump(
        'Nouvelle demande de rendez-vous',
        'DentaRDV',
        'Un patient a demandé un rendez-vous.',
      );
    const onChanged = () =>
      bump('Réservation mise à jour', 'DentaRDV', 'Un rendez-vous a été modifié.');

    socket.on('reservation:new', onNew);
    socket.on('reservation:changed', onChanged);

    const onVis = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.clearTimeout(toastTimer);
      socket.off('reservation:new', onNew);
      socket.off('reservation:changed', onChanged);
      socket.disconnect();
    };
  }, [user?.role, token, refresh]);

  const clearRealtimeToast = useCallback(() => {
    setRealtimeToast(null);
  }, []);

  const pendingCount = useMemo(
    () => rdvs.filter((r) => r.status === 'PENDING').length,
    [rdvs],
  );

  const value = useMemo(
    () => ({ rdvs, refresh, pendingCount, realtimeToast, clearRealtimeToast }),
    [rdvs, refresh, pendingCount, realtimeToast, clearRealtimeToast],
  );

  return <AdminRealtimeCtx.Provider value={value}>{children}</AdminRealtimeCtx.Provider>;
}

/** Toast temps réel (toutes pages admin) — styles dans Layout.css */
export function AdminRealtimeToastHost() {
  const ctx = useContext(AdminRealtimeCtx);
  if (!ctx?.realtimeToast) return null;
  return (
    <div className="adm-toast" role="status">
      <span aria-hidden>🔔</span> {ctx.realtimeToast}
      <button
        type="button"
        className="adm-toast-x"
        onClick={ctx.clearRealtimeToast}
        aria-label="Fermer"
      >
        ×
      </button>
    </div>
  );
}
