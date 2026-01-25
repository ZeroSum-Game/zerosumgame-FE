import { getToken } from './auth';

type SocketLike = {
  on: (event: string, cb: (...args: any[]) => void) => void;
  off: (event: string, cb?: (...args: any[]) => void) => void;
  emit: (event: string, ...args: any[]) => void;
  disconnect: () => void;
  connected: boolean;
  id?: string;
};

declare global {
  interface Window {
    io?: (url?: string, opts?: Record<string, unknown>) => SocketLike;
  }
}

let loadPromise: Promise<void> | null = null;

export const ensureSocketIoClient = async () => {
  if (typeof window === 'undefined') return;
  if (window.io) return;
  if (loadPromise) return loadPromise;

  loadPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-sio="1"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('socket.io 스크립트 로드 실패')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = '/socket.io/socket.io.js';
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

  const token = getToken();
  if (!token) {
    throw new Error('인증 토큰이 없어요. 다시 로그인해주세요.');
  }

  // JWT 토큰을 auth 옵션으로 전달
  return window.io(undefined, {
    transports: ['websocket'],
    auth: {
      token,
    },
  });
};

