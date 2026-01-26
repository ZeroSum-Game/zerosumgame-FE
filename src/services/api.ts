import { getToken, removeToken } from './auth';
import { toInt, toNumber } from '../utils/parseNumber';
import { drawGoldenKeyCard, type GoldenKeyCardPayload, type GoldenKeyContext } from '../utils/goldenKey';

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
    const body = (await res.json()) as any;
    return {
      userId: toInt(body?.userId),
      playerId: toInt(body?.playerId),
      cash: toNumber(body?.cash),
      location: toInt(body?.location),
      totalAsset: body?.totalAsset != null ? toNumber(body.totalAsset) : undefined,
      character: body?.character ?? null,
    };
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
  const body = (await res.json()) as any;
  return {
    playerId: toInt(body?.playerId),
    character: String(body?.character ?? ''),
    cash: toNumber(body?.cash),
  };
};

// 유저 프로필 조회
export type ApiUserProfile = {
  nickname: string;
  totalWins: number;
  totalGames: number;
  winRate: number;
};

export type ApiNewsEvent = {
  type: string;
  title: string;
  message: string;
};

export type ApiNewsRequest = {
  round: number;
  events: ApiNewsEvent[];
  locale?: string;
};

export type ApiNewsResponse = {
  headline: string;
  summary: string;
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

export const apiGenerateNews = async (payload: ApiNewsRequest): Promise<ApiNewsResponse | null> => {
  try {
    const res = await fetch('/api/news', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as any;
    return {
      headline: String(body?.headline ?? ''),
      summary: String(body?.summary ?? ''),
    };
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
  ownerId: number | null;
  isLandmark: boolean;
  purchasePrice: number;
};

export const apiGetMap = async (): Promise<ApiMapNode[] | null> => {
  try {
    const res = await fetch('/api/map', {
      headers: getAuthHeaders(),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as any[];
    return (Array.isArray(body) ? body : []).map((node) => {
      const land = Array.isArray(node?.gameLands) && node.gameLands.length > 0 ? node.gameLands[0] : null;
      return {
        nodeIdx: toInt(node?.nodeIdx),
        name: String(node?.name ?? ''),
        type: String(node?.type ?? ''),
        continent: String(node?.continent ?? ''),
        basePrice: toNumber(node?.basePrice),
        baseToll: toNumber(node?.baseToll),
        ownerId: land?.ownerId != null ? toInt(land.ownerId) : null,
        isLandmark: Boolean(land?.isLandmark),
        purchasePrice: land?.purchasePrice != null ? toNumber(land.purchasePrice) : 0,
      } satisfies ApiMapNode;
    });
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
    const body = (await res.json()) as any;
    return {
      samsung: toNumber(body?.samsung),
      tesla: toNumber(body?.tesla),
      lockheed: toNumber(body?.lockheed),
      gold: toNumber(body?.gold),
      bitcoin: toNumber(body?.bitcoin),
    };
  } catch {
    return null;
  }
};

export const apiRollDice = async () => {
  const res = await fetch('/api/test/roll', {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    throw new Error('주사위 굴리기 실패');
  }
  return res.json();
};

// [신규] 시작점 자산 매수
export const apiBuyAsset = async (type: string, quantity: number) => {
  const res = await fetch('/api/game/buy-asset', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ type, quantity }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || '매수 실패');
  }
  return res.json();
};

export const apiStartWar = async () => {
  const res = await fetch('/api/game/war/start', {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || '전쟁 선포 실패');
  }
  return res.json();
};

// [신규] 우주여행 이동
export const apiSpaceMove = async (nodeIdx: number) => {
  const res = await fetch('/api/game/space-move', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ nodeIdx }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || '이동 실패');
  }
  return res.json();
};

// 주식 거래 (일반 거래소용)
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
  const body = (await res.json()) as any;
  const assets = body?.assets ?? {};
  return {
    playerId: toInt(body?.playerId),
    roomId: toInt(body?.roomId),
    cash: toNumber(body?.cash),
    assets: {
      samsung: toInt(assets?.samsung),
      tesla: toInt(assets?.tesla),
      lockheed: toInt(assets?.lockheed),
      gold: toInt(assets?.gold),
      bitcoin: toInt(assets?.bitcoin),
    },
    price: toNumber(body?.price),
    quantity: toInt(body?.quantity),
    type: (String(body?.type ?? '') as ApiStockTradeResult['type']) || type,
    symbol: String(body?.symbol ?? symbol),
  };
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
  const body = (await res.json()) as any;
  return {
    playerId: toInt(body?.playerId),
    cash: toNumber(body?.cash),
    nodeIdx: toInt(body?.nodeIdx),
    action: String(body?.action ?? action),
  };
};

// 플레이어 자산 조회
export type ApiPlayerLand = {
  nodeIdx: number;
  isLandmark: boolean;
  purchasePrice: number;
};

export type ApiPlayerAssets = {
  cash: number;
  lands: ApiPlayerLand[];
  assets: {
    samsung: number;
    tesla: number;
    lockheed: number;
    gold: number;
    bitcoin: number;
  };
  landTotal: number;
  stockTotal: number;
  totalAsset: number;
};

export const apiGetPlayerAssets = async (userId: number): Promise<ApiPlayerAssets | null> => {
  try {
    const res = await fetch(`/api/players/${userId}/assets`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as any;
    const assets = body?.assets ?? {};
    const landsRaw = Array.isArray(body?.lands) ? body.lands : [];
    const lands: ApiPlayerLand[] = landsRaw.map((l: any) => ({
      nodeIdx: toInt(l?.nodeIdx),
      isLandmark: Boolean(l?.isLandmark),
      purchasePrice: toNumber(l?.purchasePrice),
    }));
    return {
      cash: toNumber(body?.cash),
      lands,
      assets: {
        samsung: toInt(assets?.samsung),
        tesla: toInt(assets?.tesla),
        lockheed: toInt(assets?.lockheed),
        gold: toInt(assets?.gold),
        bitcoin: toInt(assets?.bitcoin),
      },
      landTotal: toNumber(body?.landTotal),
      stockTotal: toNumber(body?.stockTotal),
      totalAsset: toNumber(body?.totalAsset),
    };
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
    const body = (await res.json()) as any;
    return {
      myAsset: toNumber(body?.myAsset),
      oppAsset: toNumber(body?.oppAsset),
      winRate: toNumber(body?.winRate),
    };
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
  const body = (await res.json()) as any;
  return { roomId: toInt(body?.roomId), hostId: toInt(body?.hostId), nodeIdx: toInt(body?.nodeIdx) };
};

// alias for consistency
export const apiHostWorldCup = apiWorldCup;

export const apiWarLose = async (loserUserId: number) => {
  const res = await fetch('/api/game/war/lose', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ loserUserId }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error || '전쟁 패배 처리에 실패했어요.');
  }
  return (await res.json().catch(() => null)) as { ok: boolean } | null;
};

export const apiLogout = () => {
  removeToken();
  window.location.href = '/';
};
