/** URL de l’API sans slash final (fetch + Socket.IO). */
export function getApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  return String(raw).trim().replace(/\/+$/, '');
}
