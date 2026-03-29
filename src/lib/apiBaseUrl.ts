function trimBase(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

/**
 * URL de base pour `fetch` (sans slash final).
 * - Si `VITE_API_URL` est défini → utilisé tel quel (ex. http://localhost:3000 ou https://api…).
 * - En **dev** sans variable → `http://localhost:5173/api` (proxy Vite → Nest, évite CORS).
 * - Sinon → http://localhost:3000 (fallback).
 */
export function getApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_URL;
  const explicit = raw !== undefined && raw !== null ? String(raw).trim() : '';
  if (explicit !== '') {
    return trimBase(explicit);
  }
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    return trimBase(`${window.location.origin}/api`);
  }
  return 'http://localhost:3000';
}

/**
 * Origine pour Socket.IO (sans slash final, path `/socket.io` géré par le client).
 * Même logique : en dev sans `VITE_API_URL` → même origine que la page (proxy Vite `/socket.io`).
 */
export function getRealtimeOrigin(): string {
  const raw = import.meta.env.VITE_API_URL;
  const explicit = raw !== undefined && raw !== null ? String(raw).trim() : '';
  if (explicit !== '') {
    return trimBase(explicit);
  }
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    return trimBase(window.location.origin);
  }
  return 'http://localhost:3000';
}
