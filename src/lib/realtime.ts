import { io, type Socket } from 'socket.io-client';
import { getApiBaseUrl } from './apiBaseUrl';

/**
 * Socket.IO en production : derrière Render / nginx / CDN, le WebSocket pur échoue souvent.
 * On tente d’abord le long-polling (HTTP), puis upgrade WebSocket si possible.
 */
export function createRealtimeSocket(token: string): Socket {
  const API_URL = getApiBaseUrl();

  if (import.meta.env.PROD) {
    if (API_URL.includes('localhost') || API_URL.includes('127.0.0.1')) {
      console.error(
        '[DentaRDV] En production, VITE_API_URL doit être l’URL HTTPS de votre API (ex. Render). ' +
          'Sur Vercel : Project Settings → Environment Variables → VITE_API_URL, puis redéployer.',
      );
    }
    if (typeof window !== 'undefined' && window.location.protocol === 'https:' && API_URL.startsWith('http:')) {
      console.error(
        '[DentaRDV] Le site est en HTTPS mais VITE_API_URL est en HTTP : le navigateur bloque (contenu mixte). ' +
          'Utilisez https:// pour l’API.',
      );
    }
  }

  const socket = io(API_URL, {
    auth: { token },
    // Polling d’abord : passe mieux derrière proxies / hébergeurs gratuits
    transports: ['polling', 'websocket'],
    path: '/socket.io',
    reconnection: true,
    reconnectionAttempts: 12,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 10000,
    timeout: 20000,
    withCredentials: true,
    autoConnect: true,
  });

  socket.on('connect_error', (err) => {
    console.warn('[DentaRDV temps réel]', err.message);
  });

  return socket;
}

export function requestNotifyPermission(): void {
  if (typeof Notification === 'undefined') return;
  if (typeof window !== 'undefined' && window.location.protocol !== 'https:' && !window.location.hostname.includes('localhost')) {
    console.warn(
      '[DentaRDV] Les notifications navigateur nécessitent HTTPS (sauf localhost). Déployez le front en HTTPS.',
    );
    return;
  }
  if (Notification.permission === 'default') {
    void Notification.requestPermission();
  }
}

export function showBrowserNotification(title: string, body: string): void {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
    return;
  }
  try {
    new Notification(title, { body, icon: '/dentardv-logo.png' });
  } catch {
    try {
      new Notification(title, { body, icon: '/favicon.svg' });
    } catch {
      /* ignore */
    }
  }
}
