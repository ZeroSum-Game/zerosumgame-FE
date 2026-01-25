import { getToken } from './auth';

type SocketLike = {
  on: (event: string, cb: (...args: any[]) => void) => void;
  off: (event: string, cb?: (...args: any[]) => void) => void;
  emit: (event: string, ...args: any[]) => void;
  disconnect: () => void;
  connected: boolean;
  id?: string;
};

const getBackendOrigin = () => {
  const raw = (import.meta as any)?.env?.VITE_BACKEND_URL as string | undefined;
  if (!raw) {
    // In dev we always have a backend (via Vite proxy config); prefer direct socket connection
    // to avoid ws-proxy instability, even if env isn't loaded (e.g. HMR edge cases).
    if ((import.meta as any)?.env?.DEV) return 'http://127.0.0.1:3000';
    return null;
  }
  try {
    return new URL(raw).origin;
  } catch {
    return raw.replace(/\/+$/, '');
  }
};

const getSocketScriptSrc = () => {
  const backend = getBackendOrigin();
  return backend ? `${backend}/socket.io/socket.io.js` : '/socket.io/socket.io.js';
};

declare global {
  interface Window {
    io?: (url?: string, opts?: Record<string, unknown>) => SocketLike;
  }
}

let loadPromise: Promise<void> | null = null;
let sharedSocket: SocketLike | null = null;

export const ensureSocketIoClient = async () => {
  if (typeof window === 'undefined') return;
  if (window.io) return;
  if (loadPromise) return loadPromise;

  loadPromise = new Promise<void>((resolve, reject) => {
    const desiredSrc = getSocketScriptSrc();
    const existing = document.querySelector<HTMLScriptElement>('script[data-sio="1"]');
    if (existing) {
      // HMR can keep the old script tag around; ensure it's pointing to the desired origin.
      if (existing.src && desiredSrc && existing.src !== desiredSrc) {
        existing.remove();
      } else {
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener('error', () => reject(new Error('socket.io 스크립트 로드 실패')), { once: true });
        return;
      }
    }

    const script = document.createElement('script');
    script.src = desiredSrc;
    script.async = true;
    script.dataset.sio = '1';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('socket.io 스크립트 로드 실패'));
    document.head.appendChild(script);
  });

  return loadPromise;
};

export const connectSocket = async (): Promise<SocketLike> => {
  await ensureSocketIoClient();
  if (!window.io) throw new Error('socket.io 클라이언트를 불러올 수 없어요.');

  if (sharedSocket && sharedSocket.connected) {
    return sharedSocket;
  }

  const token = getToken();
  if (!token) {
    throw new Error('인증 토큰이 없어요. 다시 로그인해주세요.');
  }

  const backend = getBackendOrigin() ?? undefined;

  // JWT 토큰을 auth 옵션으로 전달
  sharedSocket = window.io(backend, {
    transports: ['websocket'],
    auth: {
      token,
    },
  });
  return sharedSocket;
};
