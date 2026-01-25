import { getToken, removeToken } from './auth';

// 인증 헤더 생성
const getAuthHeaders = (): HeadersInit => {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

export type ApiMe = {
  userId: number;
  playerId: number;
  cash: number;
  location: number;
  totalAsset?: number;
  character?: string | null;
};

export const apiGetMe = async (): Promise<ApiMe | null> => {
  try {
    const res = await fetch('/api/me', {
      headers: getAuthHeaders(),
    });
    if (!res.ok) return null;
    return (await res.json()) as ApiMe;
  } catch {
    return null;
  }
};

export const apiSetCharacter = async (backendCharacter: string) => {
  const res = await fetch('/api/game/character', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ character: backendCharacter }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error || '캐릭터 선택에 실패했어요.');
  }
  return (await res.json()) as { playerId: number; character: string; cash: string | number };
};

// 유저 프로필 조회
export type ApiUserProfile = {
  nickname: string;
  totalWins: number;
  totalGames: number;
  winRate: number;
};

export const apiGetUserProfile = async (): Promise<ApiUserProfile | null> => {
  try {
    const res = await fetch('/api/users/profile', {
      headers: getAuthHeaders(),
    });
    if (!res.ok) return null;
    return (await res.json()) as ApiUserProfile;
  } catch {
    return null;
  }
};

// 맵 정보 조회
export type ApiMapNode = {
  nodeIdx: number;
  name: string;
  type: string;
  continent: string;
  basePrice: number;
  baseToll: number;
  ownerId?: number | null;
  isLandmark?: boolean;
};

export const apiGetMap = async (): Promise<ApiMapNode[] | null> => {
  try {
    const res = await fetch('/api/map', {
      headers: getAuthHeaders(),
    });
    if (!res.ok) return null;
    return (await res.json()) as ApiMapNode[];
  } catch {
    return null;
  }
};

// 마켓 정보 조회
export type ApiMarket = {
  samsung: number;
  tesla: number;
  lockheed: number;
  gold: number;
  bitcoin: number;
};

export const apiGetMarket = async (): Promise<ApiMarket | null> => {
  try {
    const res = await fetch('/api/market', {
      headers: getAuthHeaders(),
    });
    if (!res.ok) return null;
    return (await res.json()) as ApiMarket;
  } catch {
    return null;
  }
};

// 주식 거래
export type ApiStockTradeResult = {
  playerId: number;
  roomId: number;
  cash: number;
  assets: Record<string, number>;
  price: number;
  quantity: number;
  type: 'BUY' | 'SELL';
  symbol: string;
};

export const apiTradeStock = async (
  symbol: 'SAMSUNG' | 'TESLA' | 'LOCKHEED' | 'GOLD' | 'BITCOIN',
  quantity: number,
  type: 'BUY' | 'SELL'
): Promise<ApiStockTradeResult> => {
  const res = await fetch('/api/game/stock', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ symbol, quantity, type }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error || '주식 거래에 실패했어요.');
  }
  return (await res.json()) as ApiStockTradeResult;
};

// 땅 구매/인수/랜드마크/매각
export type ApiPurchaseResult = {
  playerId: number;
  cash: number;
  nodeIdx: number;
  action: string;
};

export const apiPurchaseLand = async (
  action: 'BUY' | 'TAKEOVER' | 'LANDMARK' | 'SELL',
  nodeIdx?: number
): Promise<ApiPurchaseResult> => {
  const res = await fetch('/api/game/purchase', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ action, nodeIdx }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error || '땅 거래에 실패했어요.');
  }
  return (await res.json()) as ApiPurchaseResult;
};

// 플레이어 자산 조회
export type ApiPlayerAssets = {
  cash: number;
  lands: number[];
  stocks: Record<string, number>;
  totalLandValue: number;
  totalStockValue: number;
  totalAsset: number;
};

export const apiGetPlayerAssets = async (userId: number): Promise<ApiPlayerAssets | null> => {
  try {
    const res = await fetch(`/api/players/${userId}/assets`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) return null;
    return (await res.json()) as ApiPlayerAssets;
  } catch {
    return null;
  }
};

// 전쟁 승률 조회
export type ApiWarRate = {
  myAsset: number;
  oppAsset: number;
  winRate: number;
};

export const apiGetWarRate = async (opponentUserId: number): Promise<ApiWarRate | null> => {
  try {
    const res = await fetch('/api/game/war-rate', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ opponentUserId }),
    });
    if (!res.ok) return null;
    return (await res.json()) as ApiWarRate;
  } catch {
    return null;
  }
};

// 월드컵 개최
export const apiWorldCup = async (nodeIdx: number) => {
  const res = await fetch('/api/game/worldcup', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ nodeIdx }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error || '월드컵 개최에 실패했어요.');
  }
  return (await res.json()) as { roomId: number; hostId: number; nodeIdx: number };
};

export const apiLogout = () => {
  removeToken();
  window.location.href = '/';
};
