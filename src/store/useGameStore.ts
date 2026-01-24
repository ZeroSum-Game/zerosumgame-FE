import { create } from 'zustand';
import { BOARD_DATA, TILE_COUNT, type Continent } from '../utils/boardUtils';
import { formatKRWKo } from '../utils/formatKRW';

export const GAME_RULES = {
  START_CASH: 2000000,
  START_SALARY: 500000,
  MAX_ROUNDS: 10,
  TAX_RATE: 0.15,
  TAKEOVER_MULTIPLIER: 1.5,
  LANDMARK_COST_MULTIPLIER: 1.0,
  STOCK_PRICE_CHANGE_MIN: -0.1,
  STOCK_PRICE_CHANGE_MAX: 0.15,
  CRYPTO_PRICE_CHANGE_MIN: -0.12,
  CRYPTO_PRICE_CHANGE_MAX: 0.18,
  DIVIDEND_MIN: 0.02,
  DIVIDEND_MAX: 0.05,
  MOVE_STEP_MS: 230,
} as const;

export type CharacterType = 'ELON' | 'SAMSUNG' | 'TRUMP' | 'PUTIN';

export type StockSymbol = 'SAMSUNG' | 'SK_HYNIX' | 'HYUNDAI' | 'BITCOIN' | 'GOLD';

export const STOCK_INFO: Record<StockSymbol, { name: string; nameKr: string; basePrice: number }> = {
  SAMSUNG: { name: 'SAMSUNG', nameKr: '삼성전자', basePrice: 72500 },
  SK_HYNIX: { name: 'SK HYNIX', nameKr: 'SK하이닉스', basePrice: 178000 },
  HYUNDAI: { name: 'HYUNDAI', nameKr: '현대차', basePrice: 215000 },
  BITCOIN: { name: 'BITCOIN', nameKr: '비트코인', basePrice: 95450000 },
  GOLD: { name: 'GOLD', nameKr: '금', basePrice: 285000 },
};

export const TILE_TO_STOCK: Record<number, StockSymbol> = {
  4: 'HYUNDAI',
  9: 'GOLD',
  14: 'SK_HYNIX',
  18: 'SAMSUNG',
  25: 'BITCOIN',
};

export const CHARACTER_INFO: Record<
  CharacterType,
  { name: string; color: string; emoji: string; abilityShort: string; abilityDetail: string }
> = {
  ELON: {
    name: '일론 머스크',
    color: '#3b82f6',
    emoji: '🚀',
    abilityShort: '시작 자금 +₩1,000,000',
    abilityDetail: '다른 플레이어보다 1,000,000원 더 많은 상태로 시작합니다.',
  },
  SAMSUNG: {
    name: '이재용',
    color: '#1e40af',
    emoji: '📱',
    abilityShort: '삼성전자 주식 1주',
    abilityDetail: '게임 시작 시 삼성전자 주식 1주를 보유한 상태로 시작합니다.',
  },
  TRUMP: {
    name: '트럼프',
    color: '#ef4444',
    emoji: '🏛️',
    abilityShort: '내 땅 통행료 +5%',
    abilityDetail: '본인이 소유한 지역의 통행료에 +5%를 추가로 부과합니다.',
  },
  PUTIN: {
    name: '푸틴',
    color: '#dc2626',
    emoji: '🐻',
    abilityShort: '전쟁 승리확률 +10%',
    abilityDetail: '전쟁 이벤트 진행 시 승리 확률이 10% 증가합니다.',
  },
};

export type LandType = 'LAND' | 'LANDMARK';

export type LandState = {
  ownerId: number;
  type: LandType;
};

export type Player = {
  id: number;
  name: string;
  character: CharacterType | null;
  position: number;
  cash: number;
  isReady: boolean;
  isBankrupt: boolean;
  stockHoldings: Partial<Record<StockSymbol, number>>;
  tollRateMultiplier: number;
  warWinChanceBonus: number; // 0.1 = +10%
};

export type EventLogType =
  | 'SYSTEM'
  | 'TURN'
  | 'MOVE'
  | 'LAND'
  | 'MARKET'
  | 'DIVIDEND'
  | 'TAX'
  | 'MINIGAME'
  | 'KEY'
  | 'WAR';

export type EventLogEntry = {
  id: string;
  round: number;
  type: EventLogType;
  title: string;
  message: string;
  createdAt: number;
};

export type ModalState =
  | { type: 'LAND_BUY'; tileId: number }
  | { type: 'LAND_UPGRADE'; tileId: number }
  | { type: 'LAND_VISIT'; tileId: number; ownerId: number; toll: number; takeoverPrice?: number }
  | { type: 'LAND_TAKEOVER_RESPONSE'; tileId: number; buyerId: number; ownerId: number; price: number; toll: number }
  | { type: 'ASSET_TRADE'; allowedSymbols: StockSymbol[]; symbol: StockSymbol }
  | { type: 'MINIGAME'; salary: number }
  | { type: 'GOLDEN_KEY'; title: string; description: string }
  | { type: 'WAR_SELECT'; byCard: boolean }
  | { type: 'WAR_RESULT'; title: string; description: string }
  | { type: 'TAX'; due: number }
  | { type: 'INFO'; title: string; description: string };

type PageType = 'login' | 'lobby' | 'game' | 'result';
type PhaseType = 'IDLE' | 'ROLLING' | 'MOVING' | 'MODAL' | 'GAME_OVER';

type GameResult = {
  winnerId: number | null;
  ranking: { playerId: number; netWorth: number }[];
  reason: string;
  endedAtRound: number;
};

type GoldenKeyDef = {
  title: string;
  description: string;
  effect: (set: (fn: (state: GameState) => Partial<GameState> | GameState) => void, get: () => GameState) => void;
};

type GameState = {
  currentPage: PageType;
  setCurrentPage: (page: PageType) => void;

  players: Player[];
  currentPlayerIndex: number;
  maxPlayers: number;

  round: number;
  maxRounds: number;
  phase: PhaseType;

  dice: [number, number];
  isDouble: boolean;
  hasRolledThisTurn: boolean;
  extraRolls: number;
  consecutiveDoubles: number;

  selectedTile: number | null;
  lands: Record<number, LandState>;
  landPrices: Record<number, number>;
  assetPrices: Record<StockSymbol, number>;

  activeModal: ModalState | null;
  queuedModal: ModalState | null;

  eventLog: EventLogEntry[];

  isRolling: boolean;
  rollTrigger: number;

  gameResult: GameResult | null;

  addPlayer: (name: string) => void;
  removePlayer: (id: number) => void;
  selectCharacter: (playerId: number, character: CharacterType) => void;
  setPlayerReady: (playerId: number, ready: boolean) => void;

  startGame: () => void;
  resetToLobby: () => void;
  resetAll: () => void;

  selectTile: (id: number) => void;
  closeModal: () => void;

  startRoll: () => void;
  setDiceValues: (rolls: [number, number]) => void;
  endTurn: () => void;

  // Land actions
  buyLand: () => void;
  buildLandmark: () => void;
  payTollOrPropose: (action: 'PAY' | 'PROPOSE') => void;
  respondTakeover: (accept: boolean) => void;

  // Trading
  setTradeSymbol: (symbol: StockSymbol) => void;
  buyAsset: (quantity: number) => void;
  sellAsset: (quantity: number) => void;

  // Modal helpers
  completeMinigame: (success: boolean) => void;
  confirmTax: () => void;
  chooseWarTarget: (defenderId: number) => void;
};

const STOCK_SYMBOLS = ['SAMSUNG', 'SK_HYNIX', 'HYUNDAI', 'BITCOIN', 'GOLD'] as const satisfies readonly StockSymbol[];
const EQUITY_SYMBOLS = ['SAMSUNG', 'SK_HYNIX', 'HYUNDAI'] as const;
type EquitySymbol = (typeof EQUITY_SYMBOLS)[number];

const clamp = (min: number, max: number, value: number) => Math.max(min, Math.min(max, value));
const randBetween = (min: number, max: number) => min + Math.random() * (max - min);

const makeId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const getBaseLandPrices = () => {
  const entries: [number, number][] = BOARD_DATA
    .filter((s) => s.type === 'COUNTRY' && typeof s.price === 'number')
    .map((s) => [s.id, s.price as number]);
  return Object.fromEntries(entries) as Record<number, number>;
};

const getInitialAssetPrices = (): Record<StockSymbol, number> => ({
  SAMSUNG: STOCK_INFO.SAMSUNG.basePrice,
  SK_HYNIX: STOCK_INFO.SK_HYNIX.basePrice,
  HYUNDAI: STOCK_INFO.HYUNDAI.basePrice,
  BITCOIN: STOCK_INFO.BITCOIN.basePrice,
  GOLD: STOCK_INFO.GOLD.basePrice,
});

const formatMoney = formatKRWKo;

const getPlayerById = (players: Player[], id: number) => players.find((p) => p.id === id) ?? null;

const getOwnedCountryTileIdsByPlayer = (lands: Record<number, LandState>, ownerId: number) => {
  return Object.entries(lands)
    .filter(([, land]) => land.ownerId === ownerId)
    .map(([tileId]) => Number(tileId))
    .filter((tileId) => BOARD_DATA[tileId]?.type === 'COUNTRY');
};

const getContinentCountryIds = (continent: Continent) =>
  BOARD_DATA.filter((s) => s.type === 'COUNTRY' && s.continent === continent).map((s) => s.id);

const hasContinentMonopoly = (lands: Record<number, LandState>, ownerId: number, continent: Continent) => {
  const required = getContinentCountryIds(continent);
  if (required.length === 0) return false;
  return required.every((tileId) => lands[tileId]?.ownerId === ownerId);
};

const computeLandValue = (tileId: number, land: LandState, landPrices: Record<number, number>) => {
  const base = landPrices[tileId] ?? BOARD_DATA[tileId]?.price ?? 0;
  const mult = land.type === 'LANDMARK' ? 1.8 : 1.0;
  return Math.round(base * mult);
};

const computeToll = (
  tileId: number,
  land: LandState,
  landPrices: Record<number, number>,
  lands: Record<number, LandState>,
  ownerTollMultiplier: number
) => {
  const base = landPrices[tileId] ?? BOARD_DATA[tileId]?.price ?? 0;
  const stageRate = land.type === 'LANDMARK' ? 0.35 : 0.18;
  const continent = BOARD_DATA[tileId]?.continent;
  const monopolyBonus = continent && hasContinentMonopoly(lands, land.ownerId, continent) ? 1.5 : 1.0;
  return Math.round(base * stageRate * monopolyBonus * ownerTollMultiplier);
};

const computeHoldingsValue = (holdings: Partial<Record<StockSymbol, number>>, prices: Record<StockSymbol, number>) => {
  return STOCK_SYMBOLS.reduce((sum, symbol) => sum + (holdings[symbol] ?? 0) * prices[symbol], 0);
};

const computeNetWorth = (
  player: Player,
  assetPrices: Record<StockSymbol, number>,
  landPrices: Record<number, number>,
  lands: Record<number, LandState>
) => {
  const holdingsValue = computeHoldingsValue(player.stockHoldings, assetPrices);
  const landValue = Object.entries(lands).reduce((sum, [tileId, land]) => {
    if (land.ownerId !== player.id) return sum;
    return sum + computeLandValue(Number(tileId), land, landPrices);
  }, 0);
  return Math.round(player.cash + holdingsValue + landValue);
};

const computeWarAssets = (player: Player, prices: Record<StockSymbol, number>) => {
  const stockValue = EQUITY_SYMBOLS.reduce((sum, s) => sum + (player.stockHoldings[s] ?? 0) * prices[s], 0);
  const goldValue = (player.stockHoldings.GOLD ?? 0) * prices.GOLD;
  const btcValue = (player.stockHoldings.BITCOIN ?? 0) * prices.BITCOIN;
  return player.cash + stockValue * 0.8 + goldValue * 1.0 + btcValue * 0.6;
};

let moveRunId = 0;
let moveTimers: number[] = [];

const clearMoveTimers = () => {
  moveTimers.forEach((id) => window.clearTimeout(id));
  moveTimers = [];
};

const useGameStore = create<GameState>((set, get) => {
  const pushLog = (type: EventLogType, title: string, message: string) => {
    const round = get().round;
    const entry: EventLogEntry = {
      id: makeId(),
      round,
      type,
      title,
      message,
      createdAt: Date.now(),
    };
    set((state) => ({ eventLog: [entry, ...state.eventLog].slice(0, 80) }));
  };

  const liquidateToCover = (playerId: number, amountNeeded: number, reasonTitle: string) => {
    const state = get();
    const player = state.players.find((p) => p.id === playerId);
    if (!player || player.isBankrupt) return false;

    let cash = player.cash;
    const holdings = { ...player.stockHoldings };
    const sellOrder: StockSymbol[] = ['BITCOIN', 'GOLD', 'SAMSUNG', 'SK_HYNIX', 'HYUNDAI'];

    for (const symbol of sellOrder) {
      if (cash >= amountNeeded) break;
      const qty = holdings[symbol] ?? 0;
      if (qty <= 0) continue;
      const unit = state.assetPrices[symbol];
      const neededUnits = Math.ceil((amountNeeded - cash) / unit);
      const sellQty = Math.min(qty, neededUnits);
      if (sellQty <= 0) continue;

      cash += sellQty * unit;
      holdings[symbol] = qty - sellQty;
      pushLog('MARKET', '강제 매각', `${getPlayerById(state.players, playerId)?.name ?? '플레이어'}: ${symbol} ${sellQty}개 매도 (${formatMoney(sellQty * unit)})`);
    }

    let newLands = state.lands;
    if (cash < amountNeeded) {
      const owned = Object.entries(state.lands)
        .filter(([, land]) => land.ownerId === playerId)
        .map(([tileId, land]) => ({
          tileId: Number(tileId),
          land,
          saleValue: Math.round(computeLandValue(Number(tileId), land, state.landPrices) * 0.8),
        }))
        .sort((a, b) => b.saleValue - a.saleValue);

      for (const item of owned) {
        if (cash >= amountNeeded) break;
        cash += item.saleValue;
        const { [item.tileId]: _, ...rest } = newLands;
        newLands = rest;
        pushLog('LAND', '강제 매각', `${getPlayerById(state.players, playerId)?.name ?? '플레이어'}: ${BOARD_DATA[item.tileId]?.name ?? '땅'} 매각 (${formatMoney(item.saleValue)})`);
      }
    }

    if (cash < amountNeeded) {
      pushLog('SYSTEM', '파산', `${getPlayerById(state.players, playerId)?.name ?? '플레이어'} 파산! (${reasonTitle})`);
      set((s) => ({
        lands: Object.fromEntries(Object.entries(s.lands).filter(([, land]) => land.ownerId !== playerId)),
        players: s.players.map((p) =>
          p.id === playerId
            ? { ...p, isBankrupt: true, cash: 0, stockHoldings: {}, position: 0 }
            : p
        ),
      }));
      return false;
    }

    set((s) => ({
      lands: newLands,
      players: s.players.map((p) => (p.id === playerId ? { ...p, cash, stockHoldings: holdings } : p)),
    }));
    return true;
  };

  const transferCash = (fromId: number, toId: number | null, amount: number, title: string) => {
    const state = get();
    const payer = state.players.find((p) => p.id === fromId);
    if (!payer || payer.isBankrupt) return false;
    const amt = Math.max(0, Math.round(amount));
    if (amt <= 0) return true;

    const ok = payer.cash >= amt || liquidateToCover(fromId, amt, title);
    if (!ok) return false;

    set((s) => ({
      players: s.players.map((p) => {
        if (p.id === fromId) return { ...p, cash: p.cash - amt };
        if (toId && p.id === toId) return { ...p, cash: p.cash + amt };
        return p;
      }),
    }));
    return true;
  };

  const checkGameEnd = () => {
    const state = get();
    if (state.currentPage !== 'game') return;
    const alive = state.players.filter((p) => !p.isBankrupt);
    if (alive.length <= 1) {
      const winner = alive[0]?.id ?? null;
      const ranking = state.players
        .map((p) => ({
          playerId: p.id,
          netWorth: computeNetWorth(p, state.assetPrices, state.landPrices, state.lands),
        }))
        .sort((a, b) => b.netWorth - a.netWorth);
      set({
        currentPage: 'result',
        phase: 'GAME_OVER',
        gameResult: {
          winnerId: winner,
          ranking,
          reason: '다른 플레이어 전원 파산',
          endedAtRound: state.round,
        },
      });
      return;
    }

    const continents: Continent[] = ['ASIA', 'AFRICA', 'EUROPE', 'AMERICA'];
    for (const p of alive) {
      const monopoly = continents.find((c) => hasContinentMonopoly(state.lands, p.id, c));
      if (monopoly) {
        const ranking = state.players
          .map((player) => ({
            playerId: player.id,
            netWorth: computeNetWorth(player, state.assetPrices, state.landPrices, state.lands),
          }))
          .sort((a, b) => b.netWorth - a.netWorth);
        set({
          currentPage: 'result',
          phase: 'GAME_OVER',
          gameResult: {
            winnerId: p.id,
            ranking,
            reason: `대륙 통일 (${monopoly})`,
            endedAtRound: state.round,
          },
        });
        return;
      }
    }

    if (state.round > state.maxRounds) {
      const ranking = state.players
        .map((p) => ({
          playerId: p.id,
          netWorth: computeNetWorth(p, state.assetPrices, state.landPrices, state.lands),
        }))
        .sort((a, b) => b.netWorth - a.netWorth);
      set({
        currentPage: 'result',
        phase: 'GAME_OVER',
        gameResult: {
          winnerId: ranking[0]?.playerId ?? null,
          ranking,
          reason: `${state.maxRounds}턴 종료`,
          endedAtRound: state.maxRounds,
        },
      });
    }
  };

  const resolveLanding = () => {
    const state = get();
    const currentPlayer = state.players[state.currentPlayerIndex];
    if (!currentPlayer || currentPlayer.isBankrupt) return;

    const tileId = currentPlayer.position;
    const space = BOARD_DATA[tileId];
    if (!space) return;

    if (space.type === 'START') {
      pushLog('TURN', '시작', `${currentPlayer.name} 시작 칸 도착`);
      set({
        phase: 'MODAL',
        activeModal: { type: 'ASSET_TRADE', allowedSymbols: ['GOLD', 'BITCOIN'] as StockSymbol[], symbol: 'GOLD' },
      });
      return;
    }

    if (space.type === 'STOCK') {
      const symbol = TILE_TO_STOCK[tileId];
      if (symbol) {
        const allowed: StockSymbol[] =
          symbol === 'GOLD' || symbol === 'BITCOIN'
            ? (['GOLD', 'BITCOIN'] as StockSymbol[])
            : [symbol];
        pushLog('MARKET', '거래소', `${space.name} 도착 - 거래 가능`);
        set({ phase: 'MODAL', activeModal: { type: 'ASSET_TRADE', allowedSymbols: allowed, symbol } });
        return;
      }
    }

    if (space.type === 'MINIGAME') {
      pushLog('MINIGAME', '미니게임', `${currentPlayer.name} 미니게임 도전!`);
      set({ phase: 'MODAL', activeModal: { type: 'MINIGAME', salary: GAME_RULES.START_SALARY } });
      return;
    }

    if (space.type === 'KEY') {
      const defs: GoldenKeyDef[] = [
        {
          title: '관세 부과',
          description: '글로벌 관세 이슈! 주식이 일제히 하락합니다.',
          effect: (setFn, getFn) => {
            const s = getFn();
            const next = { ...s.assetPrices };
            (['SAMSUNG', 'SK_HYNIX', 'HYUNDAI'] as StockSymbol[]).forEach((sym) => {
              next[sym] = Math.round(next[sym] * 0.94);
            });
            const nextLandPrices = Object.fromEntries(
              Object.entries(s.landPrices).map(([id, price]) => [id, Math.max(1, Math.round(price * 0.97))])
            ) as Record<number, number>;
            setFn(() => ({ assetPrices: next, landPrices: nextLandPrices }));
          },
        },
        {
          title: '반도체 사이클',
          description: '반도체 호황! 삼성전자/하이닉스 급등, 현대차 약세.',
          effect: (setFn, getFn) => {
            const s = getFn();
            const next = { ...s.assetPrices };
            next.SAMSUNG = Math.round(next.SAMSUNG * 1.12);
            next.SK_HYNIX = Math.round(next.SK_HYNIX * 1.14);
            next.HYUNDAI = Math.round(next.HYUNDAI * 0.95);
            const nextLandPrices = { ...s.landPrices };
            Object.entries(nextLandPrices).forEach(([id, price]) => {
              const tileId = Number(id);
              if (BOARD_DATA[tileId]?.continent === 'ASIA') nextLandPrices[tileId] = Math.max(1, Math.round(price * 1.05));
            });
            setFn(() => ({ assetPrices: next, landPrices: nextLandPrices }));
          },
        },
        {
          title: '전기차 보조금 폐지',
          description: '전기차 수요 둔화! 현대차 하락, 금은 안전자산으로 상승.',
          effect: (setFn, getFn) => {
            const s = getFn();
            const next = { ...s.assetPrices };
            next.HYUNDAI = Math.round(next.HYUNDAI * 0.88);
            next.GOLD = Math.round(next.GOLD * 1.06);
            const nextLandPrices = { ...s.landPrices };
            Object.entries(nextLandPrices).forEach(([id, price]) => {
              const tileId = Number(id);
              if (BOARD_DATA[tileId]?.continent === 'EUROPE') nextLandPrices[tileId] = Math.max(1, Math.round(price * 0.96));
            });
            setFn(() => ({ assetPrices: next, landPrices: nextLandPrices }));
          },
        },
        {
          title: '인수합병',
          description: '깜짝 M&A! 랜덤 주식이 급등합니다.',
          effect: (setFn, getFn) => {
            const s = getFn();
            const equity: StockSymbol[] = ['SAMSUNG', 'SK_HYNIX', 'HYUNDAI'];
            const pick = equity[Math.floor(Math.random() * equity.length)];
            const next = { ...s.assetPrices };
            next[pick] = Math.round(next[pick] * 1.18);
            const continents: Continent[] = ['ASIA', 'AFRICA', 'EUROPE', 'AMERICA'];
            const continent = continents[Math.floor(Math.random() * continents.length)];
            const nextLandPrices = { ...s.landPrices };
            Object.entries(nextLandPrices).forEach(([id, price]) => {
              const tileId = Number(id);
              if (BOARD_DATA[tileId]?.continent === continent) nextLandPrices[tileId] = Math.max(1, Math.round(price * 1.06));
            });
            setFn(() => ({ assetPrices: next, landPrices: nextLandPrices }));
          },
        },
        {
          title: '강탈',
          description: '부유한 플레이어의 현금을 일부 빼앗습니다.',
          effect: (_, getFn) => {
            const s = getFn();
            const alive = s.players.filter((p) => !p.isBankrupt);
            if (alive.length < 2) return;
            const richest = [...alive].sort(
              (a, b) => computeNetWorth(b, s.assetPrices, s.landPrices, s.lands) - computeNetWorth(a, s.assetPrices, s.landPrices, s.lands)
            )[0];
            const current = s.players[s.currentPlayerIndex];
            if (!current || !richest || richest.id === current.id) return;
            const steal = Math.min(300000, richest.cash);
            transferCash(richest.id, current.id, steal, '강탈');
          },
        },
        {
          title: '러-우 전쟁',
          description: '전쟁 발발! 금/비트코인 상승. 전쟁을 즉시 선포할 수 있습니다. (승률 +5%)',
          effect: (setFn, getFn) => {
            const s = getFn();
            const next = { ...s.assetPrices };
            next.GOLD = Math.round(next.GOLD * 1.12);
            next.BITCOIN = Math.round(next.BITCOIN * 1.08);
            const nextLandPrices = { ...s.landPrices };
            Object.entries(nextLandPrices).forEach(([id, price]) => {
              const tileId = Number(id);
              if (BOARD_DATA[tileId]?.continent === 'EUROPE') nextLandPrices[tileId] = Math.max(1, Math.round(price * 0.93));
            });
            setFn(() => ({ assetPrices: next, landPrices: nextLandPrices, queuedModal: { type: 'WAR_SELECT', byCard: true } }));
          },
        },
      ];

      const picked = defs[Math.floor(Math.random() * defs.length)];
      picked.effect(set, get);
      pushLog('KEY', `황금열쇠: ${picked.title}`, picked.description);
      set({ phase: 'MODAL', activeModal: { type: 'GOLDEN_KEY', title: picked.title, description: picked.description } });
      return;
    }

    if (space.type === 'TAX') {
      const due = Math.round(
        computeNetWorth(currentPlayer, state.assetPrices, state.landPrices, state.lands) * GAME_RULES.TAX_RATE
      );
      pushLog('TAX', '국세청', `${currentPlayer.name} 세금 납부: ${formatMoney(due)}`);
      set({ phase: 'MODAL', activeModal: { type: 'TAX', due } });
      return;
    }

    if (space.name === '전쟁') {
      pushLog('WAR', '전쟁', `${currentPlayer.name} 전쟁 선포!`);
      set({ phase: 'MODAL', activeModal: { type: 'WAR_SELECT', byCard: false } });
      return;
    }

    if (space.name === '올림픽') {
      const dest = BOARD_DATA.find((s) => s.name === '프랑스')?.id ?? 21;
      const fee = 200000;
      pushLog('TURN', '올림픽', `전원 ${BOARD_DATA[dest]?.name ?? '개최국'}로 이동! 관광료 ${formatMoney(fee)}`);
      set((s) => ({
        players: s.players.map((p) => (p.isBankrupt ? p : { ...p, position: dest })),
      }));
      set({ phase: 'MODAL', activeModal: { type: 'INFO', title: '올림픽 개최!', description: `전원 ${BOARD_DATA[dest]?.name ?? '개최국'}로 이동합니다.` } });
      setTimeout(() => {
        const after = get();
        after.players
          .filter((p) => !p.isBankrupt)
          .forEach((p) => {
            transferCash(p.id, null, fee, '관광료');
          });

        const land = after.lands[dest];
        if (land) {
          const owner = after.players.find((p) => p.id === land.ownerId) ?? null;
          const toll = computeToll(dest, land, after.landPrices, after.lands, owner?.tollRateMultiplier ?? 1);
          after.players
            .filter((p) => !p.isBankrupt && p.id !== land.ownerId)
            .forEach((p) => transferCash(p.id, land.ownerId, toll, '관광 통행료'));
          if (owner) {
            pushLog('LAND', '관광 통행료', `${BOARD_DATA[dest]?.name ?? '개최국'} 소유자 ${owner.name}에게 ${formatMoney(toll)}씩 지급`);
          }
        }
      }, 0);
      return;
    }

    if (space.name === '월드컵' || space.name === '우주여행') {
      const dest = BOARD_DATA.find((s) => s.name === '미국')?.id ?? 31;
      const fee = 200000;
      pushLog('TURN', '월드컵', `전원 ${BOARD_DATA[dest]?.name ?? '개최국'}로 이동! 관광료 ${formatMoney(fee)}`);
      set((s) => ({
        players: s.players.map((p) => (p.isBankrupt ? p : { ...p, position: dest })),
      }));
      set({ phase: 'MODAL', activeModal: { type: 'INFO', title: '월드컵 개최!', description: `전원 ${BOARD_DATA[dest]?.name ?? '개최국'}로 이동합니다.` } });
      setTimeout(() => {
        const after = get();
        after.players
          .filter((p) => !p.isBankrupt)
          .forEach((p) => {
            transferCash(p.id, null, fee, '관광료');
          });

        const land = after.lands[dest];
        if (land) {
          const owner = after.players.find((p) => p.id === land.ownerId) ?? null;
          const toll = computeToll(dest, land, after.landPrices, after.lands, owner?.tollRateMultiplier ?? 1);
          after.players
            .filter((p) => !p.isBankrupt && p.id !== land.ownerId)
            .forEach((p) => transferCash(p.id, land.ownerId, toll, '관광 통행료'));
          if (owner) {
            pushLog('LAND', '관광 통행료', `${BOARD_DATA[dest]?.name ?? '개최국'} 소유자 ${owner.name}에게 ${formatMoney(toll)}씩 지급`);
          }
        }
      }, 0);
      return;
    }

    if (space.type === 'COUNTRY') {
      const land = state.lands[tileId];
      if (!land) {
        pushLog('LAND', '매입 기회', `${space.name} 구매 가능 (${formatMoney(state.landPrices[tileId] ?? space.price ?? 0)})`);
        set({ phase: 'MODAL', activeModal: { type: 'LAND_BUY', tileId } });
        return;
      }

      if (land.ownerId === currentPlayer.id) {
        if (land.type === 'LAND') {
          set({ phase: 'MODAL', activeModal: { type: 'LAND_UPGRADE', tileId } });
        } else {
          pushLog('LAND', '랜드마크', `${space.name} (랜드마크)`);
        }
        return;
      }

      const owner = state.players.find((p) => p.id === land.ownerId);
      const toll = computeToll(tileId, land, state.landPrices, state.lands, owner?.tollRateMultiplier ?? 1);
      const takeoverPrice =
        land.type === 'LANDMARK'
          ? undefined
          : Math.round((state.landPrices[tileId] ?? space.price ?? 0) * GAME_RULES.TAKEOVER_MULTIPLIER);

      set({
        phase: 'MODAL',
        activeModal: { type: 'LAND_VISIT', tileId, ownerId: land.ownerId, toll, takeoverPrice },
      });
      return;
    }

    pushLog('TURN', '이동', `${currentPlayer.name} ${space.name} 도착`);
  };

  const applyRoundEconomy = () => {
    set((state) => {
      const nextPrices = { ...state.assetPrices };
      const changes: string[] = [];

      EQUITY_SYMBOLS.forEach((symbol) => {
        const pct = randBetween(GAME_RULES.STOCK_PRICE_CHANGE_MIN, GAME_RULES.STOCK_PRICE_CHANGE_MAX);
        const before = nextPrices[symbol];
        nextPrices[symbol] = Math.max(1, Math.round(before * (1 + pct)));
        changes.push(`${STOCK_INFO[symbol].nameKr} ${pct >= 0 ? '▲' : '▼'}${Math.abs(pct * 100).toFixed(0)}%`);
      });

      (['GOLD', 'BITCOIN'] as StockSymbol[]).forEach((symbol) => {
        const pct = randBetween(GAME_RULES.CRYPTO_PRICE_CHANGE_MIN, GAME_RULES.CRYPTO_PRICE_CHANGE_MAX);
        const before = nextPrices[symbol];
        nextPrices[symbol] = Math.max(1, Math.round(before * (1 + pct)));
        changes.push(`${STOCK_INFO[symbol].nameKr} ${pct >= 0 ? '▲' : '▼'}${Math.abs(pct * 100).toFixed(0)}%`);
      });

      const dividendRates: Record<EquitySymbol, number> = {
        SAMSUNG: randBetween(GAME_RULES.DIVIDEND_MIN, GAME_RULES.DIVIDEND_MAX),
        SK_HYNIX: randBetween(GAME_RULES.DIVIDEND_MIN, GAME_RULES.DIVIDEND_MAX),
        HYUNDAI: randBetween(GAME_RULES.DIVIDEND_MIN, GAME_RULES.DIVIDEND_MAX),
      };

      const players = state.players.map((p) => {
        if (p.isBankrupt) return p;
        const dividend = EQUITY_SYMBOLS.reduce((sum, sym) => {
          const qty = p.stockHoldings[sym] ?? 0;
          return sum + qty * nextPrices[sym] * dividendRates[sym];
        }, 0);
        if (dividend <= 0) return p;
        return { ...p, cash: p.cash + Math.round(dividend) };
      });

      return { assetPrices: nextPrices, players };
    });

    const state = get();
    pushLog('MARKET', `시장 변동 (턴 ${state.round}/${state.maxRounds})`, '주가/자산 가격이 변동했습니다.');
    pushLog('DIVIDEND', '배당금 지급', '보유 주식에 따라 배당금이 지급되었습니다.');
  };

  const getNextAlivePlayerIndex = (fromIndex: number) => {
    const state = get();
    if (state.players.length === 0) return 0;
    for (let i = 1; i <= state.players.length; i++) {
      const nextIdx = (fromIndex + i) % state.players.length;
      if (!state.players[nextIdx]?.isBankrupt) return nextIdx;
    }
    return fromIndex;
  };

  return {
    currentPage: 'login',
    setCurrentPage: (page) => set({ currentPage: page }),

    players: [],
    currentPlayerIndex: 0,
    maxPlayers: 4,

    round: 1,
    maxRounds: GAME_RULES.MAX_ROUNDS,
    phase: 'IDLE',

    dice: [1, 1],
    isDouble: false,
    hasRolledThisTurn: false,
    extraRolls: 0,
    consecutiveDoubles: 0,

    selectedTile: null,
    lands: {},
    landPrices: getBaseLandPrices(),
    assetPrices: getInitialAssetPrices(),

    activeModal: null,
    queuedModal: null,

    eventLog: [],

    isRolling: false,
    rollTrigger: 0,

    gameResult: null,

    addPlayer: (name) => {
      const { players, maxPlayers } = get();
      if (players.length >= maxPlayers) return;
      const newPlayer: Player = {
        id: Date.now() + Math.floor(Math.random() * 1000),
        name,
        character: null,
        position: 0,
        cash: GAME_RULES.START_CASH,
        isReady: false,
        isBankrupt: false,
        stockHoldings: {},
        tollRateMultiplier: 1,
        warWinChanceBonus: 0,
      };
      set({ players: [...players, newPlayer] });
    },

    removePlayer: (id) => {
      const { players } = get();
      set({ players: players.filter((p) => p.id !== id) });
    },

    selectCharacter: (playerId, character) => {
      const { players } = get();
      const isTaken = players.some((p) => p.character === character && p.id !== playerId);
      if (isTaken) return;
      set({
        players: players.map((p) => (p.id === playerId ? { ...p, character } : p)),
      });
    },

    setPlayerReady: (playerId, ready) => {
      const { players } = get();
      set({
        players: players.map((p) => (p.id === playerId ? { ...p, isReady: ready } : p)),
      });
    },

    startGame: () => {
      const { players, currentPage } = get();
      if (currentPage === 'game') return;
      const allReady = players.every((p) => p.isReady && p.character);
      if (!allReady || players.length < 2) return;

      clearMoveTimers();
      moveRunId += 1;

      set({
        currentPage: 'game',
        phase: 'IDLE',
        round: 1,
        currentPlayerIndex: 0,
        dice: [1, 1],
        isDouble: false,
        hasRolledThisTurn: false,
        extraRolls: 0,
        consecutiveDoubles: 0,
        selectedTile: null,
        lands: {},
        landPrices: getBaseLandPrices(),
        assetPrices: getInitialAssetPrices(),
        activeModal: null,
        queuedModal: null,
        eventLog: [],
        isRolling: false,
        rollTrigger: 0,
        gameResult: null,
        players: players.map((p) => {
          const base: Player = {
            ...p,
            position: 0,
            cash: GAME_RULES.START_CASH,
            isBankrupt: false,
            stockHoldings: {},
            tollRateMultiplier: 1,
            warWinChanceBonus: 0,
          };
          if (!p.character) return base;
          switch (p.character) {
            case 'ELON':
              return { ...base, cash: base.cash + 1000000 };
            case 'SAMSUNG':
              return { ...base, stockHoldings: { ...base.stockHoldings, SAMSUNG: 1 } };
            case 'TRUMP':
              return { ...base, tollRateMultiplier: 1.05 };
            case 'PUTIN':
              return { ...base, warWinChanceBonus: 0.1 };
            default:
              return base;
          }
        }),
      });

      pushLog('SYSTEM', '게임 시작', `최대 ${GAME_RULES.MAX_ROUNDS}턴`);
      applyRoundEconomy();
    },

    resetToLobby: () => {
      clearMoveTimers();
      moveRunId += 1;
      set((state) => ({
        currentPage: 'lobby',
        phase: 'IDLE',
        round: 1,
        currentPlayerIndex: 0,
        dice: [1, 1],
        isDouble: false,
        hasRolledThisTurn: false,
        extraRolls: 0,
        consecutiveDoubles: 0,
        selectedTile: null,
        lands: {},
        landPrices: getBaseLandPrices(),
        assetPrices: getInitialAssetPrices(),
        activeModal: null,
        queuedModal: null,
        eventLog: [],
        isRolling: false,
        rollTrigger: 0,
        gameResult: null,
        players: state.players.map((p) => ({
          ...p,
          position: 0,
          cash: GAME_RULES.START_CASH,
          isReady: false,
          isBankrupt: false,
          stockHoldings: {},
          tollRateMultiplier: 1,
          warWinChanceBonus: 0,
        })),
      }));
    },

    resetAll: () => {
      clearMoveTimers();
      moveRunId += 1;
      set({
        currentPage: 'login',
        players: [],
        currentPlayerIndex: 0,
        round: 1,
        maxRounds: GAME_RULES.MAX_ROUNDS,
        phase: 'IDLE',
        dice: [1, 1],
        isDouble: false,
        hasRolledThisTurn: false,
        extraRolls: 0,
        consecutiveDoubles: 0,
        selectedTile: null,
        lands: {},
        landPrices: getBaseLandPrices(),
        assetPrices: getInitialAssetPrices(),
        activeModal: null,
        queuedModal: null,
        eventLog: [],
        isRolling: false,
        rollTrigger: 0,
        gameResult: null,
      });
    },

    selectTile: (id) => set({ selectedTile: id }),

    closeModal: () => {
      const queued = get().queuedModal;
      if (queued) {
        set({ activeModal: queued, queuedModal: null, phase: 'MODAL' });
        return;
      }
      set({ activeModal: null, phase: 'IDLE' });
      checkGameEnd();
    },

    startRoll: () => {
      const state = get();
      if (state.currentPage !== 'game') return;
      if (state.phase !== 'IDLE') return;
      if (state.activeModal) return;

      const currentPlayer = state.players[state.currentPlayerIndex];
      if (!currentPlayer || currentPlayer.isBankrupt) return;

      const canRoll = !state.hasRolledThisTurn || state.extraRolls > 0;
      if (!canRoll) return;

      set((s) => ({
        isRolling: true,
        rollTrigger: s.rollTrigger + 1,
        phase: 'ROLLING',
        extraRolls: s.hasRolledThisTurn ? Math.max(0, s.extraRolls - 1) : s.extraRolls,
        hasRolledThisTurn: true,
      }));
    },

    setDiceValues: ([d1, d2]) => {
      const state = get();
      const isDouble = d1 === d2;
      const newConsecutiveDoubles = isDouble ? state.consecutiveDoubles + 1 : 0;

      // Check for triple doubles - go to war tile (id: 8)
      const WAR_TILE_ID = 8;
      if (newConsecutiveDoubles >= 3) {
        const currentPlayer = state.players[state.currentPlayerIndex];
        pushLog('SYSTEM', '트리플 더블!', `${currentPlayer?.name ?? '플레이어'} 연속 더블 3회! 전쟁 칸으로 강제 이동!`);

        set((s) => ({
          isRolling: false,
          dice: [d1, d2],
          isDouble: true,
          extraRolls: 0,
          consecutiveDoubles: 0,
          phase: 'IDLE',
          players: s.players.map((p, idx) =>
            idx === s.currentPlayerIndex ? { ...p, position: WAR_TILE_ID } : p
          ),
        }));

        // Resolve landing at war tile after a short delay
        setTimeout(() => {
          resolveLanding();
        }, 300);
        return;
      }

      const steps = d1 + d2;
      set((s) => ({
        isRolling: false,
        dice: [d1, d2],
        isDouble,
        extraRolls: isDouble ? s.extraRolls + 1 : s.extraRolls,
        consecutiveDoubles: newConsecutiveDoubles,
        phase: 'MOVING',
      }));

      clearMoveTimers();
      moveRunId += 1;
      const currentRun = moveRunId;

      for (let i = 1; i <= steps; i++) {
        const timer = window.setTimeout(() => {
          if (get().phase !== 'MOVING') return;
          if (moveRunId !== currentRun) return;

          set((s) => {
            const player = s.players[s.currentPlayerIndex];
            if (!player || player.isBankrupt) return s;
            const nextPos = (player.position + 1) % TILE_COUNT;
            const passedStart = nextPos === 0;

            const nextPlayers = s.players.map((p, idx) => {
              if (idx !== s.currentPlayerIndex) return p;
              const cash = passedStart ? p.cash + GAME_RULES.START_SALARY : p.cash;
              return { ...p, position: nextPos, cash };
            });

            return { players: nextPlayers };
          });

          const after = get();
          const movingPlayer = after.players[after.currentPlayerIndex];
          if (!movingPlayer || movingPlayer.isBankrupt) return;
          if (movingPlayer.position === 0) {
            pushLog('TURN', '월급', `${movingPlayer.name} 월급 지급: ${formatMoney(GAME_RULES.START_SALARY)}`);
          }

          if (i === steps) {
            set({ phase: 'IDLE' });
            resolveLanding();
          }
        }, i * GAME_RULES.MOVE_STEP_MS);
        moveTimers.push(timer);
      }
    },

    endTurn: () => {
      const state = get();
      if (state.currentPage !== 'game') return;
      if (state.phase !== 'IDLE') return;
      if (!state.hasRolledThisTurn) return;

      const nextIdx = getNextAlivePlayerIndex(state.currentPlayerIndex);
      const wrapped = nextIdx <= state.currentPlayerIndex;

      if (wrapped) {
        const nextRound = state.round + 1;
        set({
          round: nextRound,
          currentPlayerIndex: nextIdx,
          hasRolledThisTurn: false,
          extraRolls: 0,
          consecutiveDoubles: 0,
          isDouble: false,
          dice: [1, 1],
        });
        pushLog('TURN', '턴 종료', `${state.round}턴 종료`);
        if (nextRound <= state.maxRounds) applyRoundEconomy();
        checkGameEnd();
        return;
      }

      set({
        currentPlayerIndex: nextIdx,
        hasRolledThisTurn: false,
        extraRolls: 0,
        consecutiveDoubles: 0,
        isDouble: false,
        dice: [1, 1],
      });
      pushLog('TURN', '턴 변경', `${state.players[nextIdx]?.name ?? '플레이어'} 차례`);
      checkGameEnd();
    },

    buyLand: () => {
      const state = get();
      if (state.phase !== 'MODAL') return;
      const modal = state.activeModal;
      if (!modal || modal.type !== 'LAND_BUY') return;

      const player = state.players[state.currentPlayerIndex];
      if (!player || player.isBankrupt) return;
      const tileId = modal.tileId;
      const price = state.landPrices[tileId] ?? BOARD_DATA[tileId]?.price ?? 0;

      if (player.cash < price) {
        set({ activeModal: { type: 'INFO', title: '잔액 부족', description: '현금이 부족합니다.' }, phase: 'MODAL' });
        return;
      }

      set((s) => ({
        players: s.players.map((p, idx) => (idx === s.currentPlayerIndex ? { ...p, cash: p.cash - price } : p)),
        lands: { ...s.lands, [tileId]: { ownerId: player.id, type: 'LAND' } },
        activeModal: null,
        phase: 'IDLE',
      }));
      pushLog('LAND', '땅 구매', `${player.name} ${BOARD_DATA[tileId]?.name ?? '땅'} 구매 (${formatMoney(price)})`);
      checkGameEnd();
    },

    buildLandmark: () => {
      const state = get();
      if (state.phase !== 'MODAL') return;
      const modal = state.activeModal;
      if (!modal || modal.type !== 'LAND_UPGRADE') return;

      const player = state.players[state.currentPlayerIndex];
      if (!player || player.isBankrupt) return;
      const tileId = modal.tileId;
      const land = state.lands[tileId];
      if (!land || land.ownerId !== player.id || land.type !== 'LAND') return;

      const cost = Math.round((state.landPrices[tileId] ?? BOARD_DATA[tileId]?.price ?? 0) * GAME_RULES.LANDMARK_COST_MULTIPLIER);
      if (player.cash < cost) {
        set({ activeModal: { type: 'INFO', title: '잔액 부족', description: '랜드마크 건설 비용이 부족합니다.' }, phase: 'MODAL' });
        return;
      }

      set((s) => ({
        players: s.players.map((p, idx) => (idx === s.currentPlayerIndex ? { ...p, cash: p.cash - cost } : p)),
        lands: { ...s.lands, [tileId]: { ...s.lands[tileId], type: 'LANDMARK' } },
        activeModal: null,
        phase: 'IDLE',
      }));
      pushLog('LAND', '랜드마크', `${player.name} ${BOARD_DATA[tileId]?.name ?? '땅'} 랜드마크 건설 (${formatMoney(cost)})`);
      checkGameEnd();
    },

    payTollOrPropose: (action) => {
      const state = get();
      if (state.phase !== 'MODAL') return;
      const modal = state.activeModal;
      if (!modal || modal.type !== 'LAND_VISIT') return;
      const player = state.players[state.currentPlayerIndex];
      if (!player || player.isBankrupt) return;

      if (action === 'PAY' || !modal.takeoverPrice) {
        transferCash(player.id, modal.ownerId, modal.toll, '통행료');
        pushLog('LAND', '통행료', `${player.name} → ${getPlayerById(state.players, modal.ownerId)?.name ?? '플레이어'} ${formatMoney(modal.toll)}`);
        set({ activeModal: null, phase: 'IDLE' });
        checkGameEnd();
        return;
      }

      const buyerWorth = computeNetWorth(player, state.assetPrices, state.landPrices, state.lands);
      if (buyerWorth < modal.takeoverPrice) {
        set({ activeModal: { type: 'INFO', title: '인수 불가', description: '총 자산이 부족합니다.' }, phase: 'MODAL' });
        return;
      }

      set({
        activeModal: {
          type: 'LAND_TAKEOVER_RESPONSE',
          tileId: modal.tileId,
          buyerId: player.id,
          ownerId: modal.ownerId,
          price: modal.takeoverPrice,
          toll: modal.toll,
        },
        phase: 'MODAL',
      });
    },

    respondTakeover: (accept) => {
      const state = get();
      if (state.phase !== 'MODAL') return;
      const modal = state.activeModal;
      if (!modal || modal.type !== 'LAND_TAKEOVER_RESPONSE') return;

      const buyer = getPlayerById(state.players, modal.buyerId);
      const owner = getPlayerById(state.players, modal.ownerId);
      if (!buyer || !owner) return;

      if (accept) {
        const paid = transferCash(modal.buyerId, modal.ownerId, modal.price, '인수');
        if (!paid) {
          set({
            activeModal: { type: 'INFO', title: '인수 실패', description: '결제에 실패했습니다. (파산 또는 자산 부족)' },
            phase: 'MODAL',
          });
          checkGameEnd();
          return;
        }
        set((s) => ({
          lands: { ...s.lands, [modal.tileId]: { ownerId: modal.buyerId, type: s.lands[modal.tileId]?.type ?? 'LAND' } },
          activeModal: null,
          phase: 'IDLE',
        }));
        pushLog('LAND', '인수 성공', `${buyer.name} → ${owner.name} ${formatMoney(modal.price)} (타일: ${BOARD_DATA[modal.tileId]?.name ?? '땅'})`);
        checkGameEnd();
        return;
      }

      transferCash(modal.buyerId, modal.ownerId, modal.toll, '통행료');
      pushLog('LAND', '인수 거절', `${owner.name} 거절 → 통행료 ${formatMoney(modal.toll)}`);
      set({ activeModal: null, phase: 'IDLE' });
      checkGameEnd();
    },

    setTradeSymbol: (symbol) => {
      const state = get();
      const modal = state.activeModal;
      if (!modal || modal.type !== 'ASSET_TRADE') return;
      if (!modal.allowedSymbols.includes(symbol)) return;
      set({ activeModal: { ...modal, symbol } });
    },

    buyAsset: (quantity) => {
      const state = get();
      if (state.phase !== 'MODAL') return;
      const modal = state.activeModal;
      if (!modal || modal.type !== 'ASSET_TRADE') return;
      const player = state.players[state.currentPlayerIndex];
      if (!player || player.isBankrupt) return;

      const qty = Math.max(1, Math.floor(quantity));
      const price = state.assetPrices[modal.symbol];
      const total = price * qty;
      if (player.cash < total) {
        set({ activeModal: { type: 'INFO', title: '잔액 부족', description: '현금이 부족합니다.' }, phase: 'MODAL' });
        return;
      }
      const currentHolding = player.stockHoldings[modal.symbol] ?? 0;
      set((s) => ({
        players: s.players.map((p, idx) =>
          idx === s.currentPlayerIndex
            ? {
                ...p,
                cash: p.cash - total,
                stockHoldings: { ...p.stockHoldings, [modal.symbol]: currentHolding + qty },
              }
            : p
        ),
      }));
      pushLog('MARKET', '매수', `${player.name} ${STOCK_INFO[modal.symbol].nameKr} ${qty}개 매수 (${formatMoney(total)})`);
    },

    sellAsset: (quantity) => {
      const state = get();
      if (state.phase !== 'MODAL') return;
      const modal = state.activeModal;
      if (!modal || modal.type !== 'ASSET_TRADE') return;
      const player = state.players[state.currentPlayerIndex];
      if (!player || player.isBankrupt) return;

      const qty = Math.max(1, Math.floor(quantity));
      const holding = player.stockHoldings[modal.symbol] ?? 0;
      if (holding < qty) {
        set({ activeModal: { type: 'INFO', title: '보유 부족', description: '보유 수량이 부족합니다.' }, phase: 'MODAL' });
        return;
      }
      const price = state.assetPrices[modal.symbol];
      const total = price * qty;
      set((s) => ({
        players: s.players.map((p, idx) =>
          idx === s.currentPlayerIndex
            ? {
                ...p,
                cash: p.cash + total,
                stockHoldings: { ...p.stockHoldings, [modal.symbol]: holding - qty },
              }
            : p
        ),
      }));
      pushLog('MARKET', '매도', `${player.name} ${STOCK_INFO[modal.symbol].nameKr} ${qty}개 매도 (${formatMoney(total)})`);
    },

    completeMinigame: (success) => {
      const state = get();
      const modal = state.activeModal;
      if (!modal || modal.type !== 'MINIGAME') return;
      const player = state.players[state.currentPlayerIndex];
      if (!player || player.isBankrupt) return;

      if (success) {
        set((s) => ({
          players: s.players.map((p, idx) =>
            idx === s.currentPlayerIndex ? { ...p, cash: p.cash + modal.salary } : p
          ),
          activeModal: { type: 'WAR_RESULT', title: '미니게임 성공!', description: `월급 ${formatMoney(modal.salary)} 지급!` },
          phase: 'MODAL',
        }));
        pushLog('MINIGAME', '성공', `${player.name} 보상 ${formatMoney(modal.salary)}`);
        return;
      }

      set({
        activeModal: { type: 'WAR_RESULT', title: '미니게임 실패', description: '아쉽네요! 다음 기회에…' },
        phase: 'MODAL',
      });
      pushLog('MINIGAME', '실패', `${player.name} 실패`);
    },

    confirmTax: () => {
      const state = get();
      const modal = state.activeModal;
      if (!modal || modal.type !== 'TAX') return;
      const player = state.players[state.currentPlayerIndex];
      if (!player || player.isBankrupt) return;

      transferCash(player.id, null, modal.due, '세금');
      set({ activeModal: null, phase: 'IDLE' });
      checkGameEnd();
    },

    chooseWarTarget: (defenderId) => {
      const state = get();
      const modal = state.activeModal;
      if (!modal || modal.type !== 'WAR_SELECT') return;

      const attacker = state.players[state.currentPlayerIndex];
      const defender = getPlayerById(state.players, defenderId);
      if (!attacker || !defender || attacker.id === defender.id) return;
      if (attacker.isBankrupt || defender.isBankrupt) return;

      const attackerWar = computeWarAssets(attacker, state.assetPrices);
      const defenderWar = computeWarAssets(defender, state.assetPrices);
      const ratio = attackerWar + defenderWar <= 0 ? 0.5 : attackerWar / (attackerWar + defenderWar);
      const baseWin = 30 + ratio * 40;

      let conditionBonus = 0;

      const warCountries = ['러시아', '이란', '우크라이나'];
      const ownedIds = getOwnedCountryTileIdsByPlayer(state.lands, attacker.id);
      const ownsWarCountry = ownedIds.some((id) => warCountries.includes(BOARD_DATA[id]?.name ?? ''));
      if (ownsWarCountry) conditionBonus += 5;
      if (modal.byCard) conditionBonus += 5;

      const alive = state.players.filter((p) => !p.isBankrupt);
      const attackerGoldValue = (attacker.stockHoldings.GOLD ?? 0) * state.assetPrices.GOLD;
      const topGold = Math.max(
        ...alive.map((p) => (p.stockHoldings.GOLD ?? 0) * state.assetPrices.GOLD)
      );
      if (attackerGoldValue >= topGold && topGold > 0) conditionBonus += 3;

      const attackerNet = computeNetWorth(attacker, state.assetPrices, state.landPrices, state.lands);
      const attackerBtcValue = (attacker.stockHoldings.BITCOIN ?? 0) * state.assetPrices.BITCOIN;
      const btcShare = attackerNet <= 0 ? 0 : attackerBtcValue / attackerNet;
      if (btcShare >= 0.3) conditionBonus -= 3;

      const winChance = clamp(25, 80, baseWin + conditionBonus + attacker.warWinChanceBonus * 100);
      const roll = Math.random() * 100;
      const isWin = roll < winChance;

      if (isWin) {
        const loot = clamp(200000, 1500000, Math.round(defenderWar * 0.2));
        transferCash(defender.id, attacker.id, loot, '전쟁 전리품');

        const defenderLands = Object.entries(state.lands)
          .filter(([, land]) => land.ownerId === defender.id && land.type !== 'LANDMARK')
          .map(([tileId]) => Number(tileId))
          .sort((a, b) => (state.landPrices[b] ?? 0) - (state.landPrices[a] ?? 0));

        if (defenderLands.length > 0) {
          const stealTile = defenderLands[0];
          set((s) => ({
            lands: { ...s.lands, [stealTile]: { ...s.lands[stealTile], ownerId: attacker.id } },
          }));
          pushLog('WAR', '영토 획득', `${attacker.name} ${BOARD_DATA[stealTile]?.name ?? '땅'} 점령!`);
        }

        pushLog('WAR', '승리', `${attacker.name} 승리! 승률 ${winChance.toFixed(0)}% / 전리품 ${formatMoney(loot)}`);
        set({
          activeModal: {
            type: 'WAR_RESULT',
            title: '전쟁 승리!',
            description: `${attacker.name} 승리 (승률 ${winChance.toFixed(0)}%). 전리품 ${formatMoney(loot)} 획득!`,
          },
          phase: 'MODAL',
        });
        checkGameEnd();
        return;
      }

      const penalty = clamp(150000, 1200000, Math.round(attackerWar * 0.12));
      transferCash(attacker.id, defender.id, penalty, '전쟁 패배');
      pushLog('WAR', '패배', `${attacker.name} 패배… (승률 ${winChance.toFixed(0)}%) 손실 ${formatMoney(penalty)}`);
      set({
        activeModal: {
          type: 'WAR_RESULT',
          title: '전쟁 패배',
          description: `${attacker.name} 패배 (승률 ${winChance.toFixed(0)}%). 손실 ${formatMoney(penalty)}.`,
        },
        phase: 'MODAL',
      });
      checkGameEnd();
    },
  };
});

export default useGameStore;
