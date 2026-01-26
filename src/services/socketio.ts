import { getToken } from './auth';

type SocketLike = {
  on: (event: string, cb: (...args: any[]) => void) => void;
  off: (event: string, cb?: (...args: any[]) => void) => void;
  emit: (event: string, ...args: any[]) => void;
  disconnect: () => void;
  connected: boolean;
  connect?: () => void;
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

  const loadScript = (src: string) =>
    new Promise<void>((resolve, reject) => {
      const existing = document.querySelectorAll<HTMLScriptElement>('script[data-sio="1"]');
      existing.forEach((el) => el.remove());

      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.dataset.sio = '1';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('socket.io ?ㅽ겕由쏀듃 濡쒕뱶 ?ㅽ뙣'));
      document.head.appendChild(script);
    });

  loadPromise = (async () => {
    const desiredSrc = getSocketScriptSrc();
    const fallbackSrc = '/socket.io/socket.io.js';
    try {
      await loadScript(desiredSrc);
    } catch (err) {
      if (desiredSrc !== fallbackSrc) {
        await loadScript(fallbackSrc);
        return;
      }
      throw err;
    }
  })();

  return loadPromise;
};

export const connectSocket = async (): Promise<SocketLike> => {
  await ensureSocketIoClient();
  if (!window.io) throw new Error('socket.io ?대씪?댁뼵?몃? 遺덈윭?????놁뼱??');

  if (sharedSocket && sharedSocket.connected) {
    return sharedSocket;
  }

  const token = getToken();
  if (!token) {
    throw new Error('?몄쬆 ?좏겙???놁뼱?? ?ㅼ떆 濡쒓렇?명빐二쇱꽭??');
  }

  const backend = getBackendOrigin() ?? undefined;

  // JWT ?좏겙??auth ?듭뀡?쇰줈 ?꾨떖
  sharedSocket = window.io(backend, {
    transports: ['websocket'],
    auth: {
      token,
    },
  });
  return sharedSocket;
};
