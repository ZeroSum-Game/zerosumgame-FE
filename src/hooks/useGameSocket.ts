import { useEffect, useRef, useCallback, useState } from 'react';
import { connectSocket } from '../services/socketio';
import { isAuthenticated } from '../services/auth';
import { fromBackendCharacter } from '../utils/characterMapping';
import useGameStore, {
  CHARACTER_INFO,
  GAME_RULES,
  clampDiceValue,
  START_TILE_TRADE_SYMBOLS,
  TILE_TO_STOCK,
  type CharacterType,
  type EventLogType,
  type Player,
  type StockSymbol,
  type WarPayload,
} from '../store/useGameStore';
import { toInt, toNumber } from '../utils/parseNumber';
import { apiDrawGoldenKey, apiGetMap, apiGetMarket, apiGetMe, apiGetPlayerAssets } from '../services/api';
import { BOARD_DATA } from '../utils/boardUtils';
import { applyWarMultiplier } from '../utils/warMultiplier';
import { playSound } from '../utils/sounds';

type SocketLike = Awaited<ReturnType<typeof connectSocket>>;

const mapBackendPlayer = (p: any, index: number): Player => {
  const character = fromBackendCharacter(p.character) as CharacterType | null;
  const avatar = character ? CHARACTER_INFO[character].avatar : '/assets/characters/default.png';

  return {
    id: toInt(p?.playerId ?? p?.id, index + 1),
    userId: toInt(p?.userId),
    name: String(p?.nickname ?? `Player ${p?.userId ?? index + 1}`),
    avatar,
    character,
    position: toInt(p?.location, 0),
    cash: toNumber(p?.cash, 3000000),
    totalAsset: p.totalAsset != null ? toNumber(p.totalAsset) : undefined,
    isReady: true,
    isBankrupt: Boolean(p?.isBankrupt),
    stockHoldings: {},
    tollRateMultiplier: character === 'TRUMP' ? 1.10 : 1.0,
    warWinChanceBonus: character === 'PUTIN' ? 0.1 : 0,
  };
};

export type OrderPickResult = {
  userId: number;
  playerId: number;
  cardNumber: number;
  turnOrder: number;
  nickname: string;
};

export type OrderPickingState = {
  isPickingOrder: boolean;
  availableCards: number[];
  pickedCards: number[];
  myPickedCard: number | null;
  revealedCards: Record<number, number>;
  orderResults: OrderPickResult[] | null;
};

const sortPlayersByCardOrder = <T extends { userId: number }>(
  players: T[],
  orderResults: Array<{ userId: number; cardNumber: number }> | null | undefined
) => {
  if (!orderResults || orderResults.length === 0) return players;
  const orderMap = new Map(orderResults.map((result) => [result.userId, result.cardNumber]));
  return players
    .map((player, index) => ({
      player,
      index,
      cardNumber: orderMap.get(player.userId),
    }))
    .sort((a, b) => {
      if (a.cardNumber != null && b.cardNumber != null) return a.cardNumber - b.cardNumber;
      if (a.cardNumber != null) return -1;
      if (b.cardNumber != null) return 1;
      return a.index - b.index;
    })
    .map(({ player }) => player);
};

export type GameSocketState = {
  connected: boolean;
  error: string | null;
  currentTurnUserId: number | null;
  myUserId: number | null;
  roomId: number | null;
  orderPicking: OrderPickingState;
};

export type GameSocketContextValue = GameSocketState & {
  socket: SocketLike | null;
  rollDice: () => void;
  endTurn: () => void;
  isMyTurn: () => boolean;
  pickOrderCard: (cardNumber: number) => void;
  selectWarSpoils: (winnerId: number, loserId: number, landId: number | null) => void;
  startWarFight: (opponentUserId: number) => void;
};

export const useGameSocket = (roomId: number = 1) => {
  const socketRef = useRef<SocketLike | null>(null);
  const [state, setState] = useState<GameSocketState>({
    connected: false,
    error: null,
    currentTurnUserId: null,
    myUserId: null,
    roomId: null,
    orderPicking: {
      isPickingOrder: false,
      availableCards: [],
      pickedCards: [],
      myPickedCard: null,
      revealedCards: {},
      orderResults: null,
    },
  });

  const store = useGameStore.getState();
  const storeRef = useRef(store);
  const socketStateRef = useRef(state);
  socketStateRef.current = state;
  const myUserIdRef = useRef<number | null>(null);
  const currentTurnUserIdRef = useRef<number | null>(null);
  const rollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const moveRunIdRef = useRef(0);
  const moveTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const orderResultsRef = useRef<OrderPickResult[] | null>(null);
  const currentPlayerIndex = useGameStore((s) => s.currentPlayerIndex);
  const playersSnapshot = useGameStore((s) => s.players);

  const translateSocketError = (message?: string | null) => {
    if (!message) return null;
    const normalized = String(message).trim();
    switch (normalized) {
      case 'Login session expired':
        return '로그인 세션이 만료되었습니다. 다시 로그인해 주세요.';
      case 'Room not joined':
        return '방에 참가되어 있지 않습니다. 로비로 이동합니다.';
      case 'Player not found':
        return '플레이어를 찾을 수 없습니다. 로비로 이동합니다.';
      case 'Another player is rolling':
        return '다른 플레이어가 주사위를 굴리는 중입니다.';
      case 'Already rolling':
        return '이미 주사위를 굴리는 중입니다.';
      case 'Failed to broadcast dice result':
        return '주사위 결과 전송에 실패했습니다. 다시 시도해 주세요.';
      case 'Failed to roll dice':
        return '주사위를 굴리는 데 실패했습니다.';
      case 'Dice is still rolling':
        return '주사위가 아직 굴러가는 중입니다.';
      default:
        return normalized;
    }
  };

  const appendEventLog = useCallback((type: EventLogType, title: string, message: string, roundOverride?: number) => {
    const round = roundOverride ?? useGameStore.getState().round;
    const entry = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      round,
      type,
      title,
      message,
      createdAt: Date.now(),
    };
    useGameStore.setState((s) => ({ eventLog: [entry, ...s.eventLog].slice(0, 80) }));
  }, []);

  useEffect(() => {
    storeRef.current = useGameStore.getState();
  });

  useEffect(() => {
    myUserIdRef.current = state.myUserId;
    currentTurnUserIdRef.current = state.currentTurnUserId;
  }, [state.currentTurnUserId, state.myUserId]);

  const resolveTurnUserId = useCallback(
    (turnUserIdValue: unknown, turnPlayerIdValue: unknown, playersList: any[] | null | undefined) => {
      const direct = toInt(turnUserIdValue, 0);
      if (direct > 0) return direct;
      const playerId = toInt(turnPlayerIdValue, 0);
      if (playerId <= 0 || !Array.isArray(playersList)) return null;
      const found = playersList.find(
        (p: any) => toInt(p?.playerId ?? p?.id, 0) === playerId
      );
      const fallbackUserId = toInt(found?.userId, 0);
      return fallbackUserId > 0 ? fallbackUserId : null;
    },
    []
  );

  const clearRollTimeout = useCallback(() => {
    if (!rollTimeoutRef.current) return;
    clearTimeout(rollTimeoutRef.current);
    rollTimeoutRef.current = null;
  }, []);

  const clearMoveTimers = useCallback(() => {
    if (moveTimersRef.current.length === 0) return;
    moveTimersRef.current.forEach((id) => clearTimeout(id));
    moveTimersRef.current = [];
  }, []);

  const scheduleRollTimeout = useCallback(() => {
    clearRollTimeout();
    rollTimeoutRef.current = setTimeout(() => {
      useGameStore.setState({
        isRolling: false,
        rollStage: 'IDLE',
        rollingUserId: null,
        pendingDice: null,
      });
      setState((s) => ({ ...s, error: '주사위 결과를 받지 못했습니다. 다시 시도해 주세요.' }));
    }, 6000);
  }, [clearRollTimeout]);

  const parseWar = useCallback((war: any): WarPayload | null => {
    if (!war) return null;
    return {
      active: Boolean(war?.active),
      warLine: war?.warLine != null ? toInt(war.warLine) : null,
      warNode: war?.warNode != null ? toInt(war.warNode) : null,
      turnsLeft: toInt(war?.turnsLeft),
      recoveryActive: Boolean(war?.recoveryActive),
      recoveryLine: toNumber(war?.recoveryLine, 1),
      recoveryNode: toNumber(war?.recoveryNode, 1),
      adjacentLines: Array.isArray(war?.adjacentLines) ? war.adjacentLines.map((v: any) => toInt(v)) : [],
    };
  }, []);

  const syncMap = useCallback(async () => {
    const map = await apiGetMap();
    if (!map) return;

    const nextLandPrices: Record<number, number> = {};
    const nextLandTolls: Record<number, number> = {};
    const nextLands: Record<number, { ownerId: number; type: 'LAND' | 'LANDMARK'; purchasePrice?: number }> = {};

    map.forEach((n) => {
      if (n.type === 'LAND') {
        nextLandPrices[n.nodeIdx] = n.basePrice;
        nextLandTolls[n.nodeIdx] = n.baseToll;
      }
      if (n.ownerId != null) {
        nextLands[n.nodeIdx] = {
          ownerId: n.ownerId,
          type: n.isLandmark ? 'LANDMARK' : 'LAND',
          purchasePrice: n.purchasePrice
        };
      }
    });

    useGameStore.setState({
      landPrices: nextLandPrices,
      prevLandPrices: { ...nextLandPrices }, // Reset prev to current for 0% initial change
      landTolls: nextLandTolls,
      lands: nextLands,
    });
  }, []);

  const syncMarket = useCallback(async () => {
    const market = await apiGetMarket();
    if (!market) return;
    const nextPrices = {
      SAMSUNG: market.samsung,
      TESLA: market.tesla,
      LOCKHEED: market.lockheed,
      GOLD: market.gold,
      BITCOIN: market.bitcoin,
    };
    useGameStore.setState({
      assetPrices: nextPrices,
      prevAssetPrices: { ...nextPrices }, // Reset prev to current for 0% initial change
    });
  }, []);

  const hydratePlayersAssets = useCallback(async (userIds: number[]) => {
    const unique = Array.from(new Set(userIds.filter((id) => Number.isInteger(id) && id > 0)));
    if (unique.length === 0) return;

    const results = await Promise.all(unique.map((id) => apiGetPlayerAssets(id)));
    useGameStore.setState((s) => ({
      players: s.players.map((p) => {
        const idx = unique.indexOf(p.userId);
        const r = idx >= 0 ? results[idx] : null;
        if (!r) return p;
        return {
          ...p,
          cash: r.cash,
          totalAsset: r.totalAsset,
          stockHoldings: {
            SAMSUNG: r.assets.samsung,
            TESLA: r.assets.tesla,
            LOCKHEED: r.assets.lockheed,
            GOLD: r.assets.gold,
            BITCOIN: r.assets.bitcoin,
          },
        };
      }),
    }));
  }, []);

  useEffect(() => {
    if (!isAuthenticated()) return;
    if (state.myUserId && state.myUserId > 0) return;
    let alive = true;

    const fetchMe = async () => {
      const me = await apiGetMe();
      if (!alive || !me?.userId) return;
      myUserIdRef.current = me.userId;
      setState((s) => ({ ...s, myUserId: me.userId }));
    };

    void fetchMe();
    const retryId = window.setInterval(fetchMe, 3000);

    return () => {
      alive = false;
      window.clearInterval(retryId);
    };
  }, [state.myUserId]);

  useEffect(() => {
    const existingTurnUserId = toInt(state.currentTurnUserId, 0);
    if (existingTurnUserId > 0) return;
    const fallbackUserId = toInt(playersSnapshot[currentPlayerIndex]?.userId, 0);
    if (fallbackUserId <= 0) return;
    setState((s) => ({ ...s, currentTurnUserId: fallbackUserId }));
  }, [state.currentTurnUserId, currentPlayerIndex, playersSnapshot]);

  useEffect(() => {
    if (!isAuthenticated()) {
      storeRef.current.setCurrentPage('login');
      return;
    }

    let alive = true;

    const connect = async () => {
      try {
        const socket = await connectSocket();
        if (!alive) {
          socket.disconnect();
          return;
        }
        socketRef.current = socket;
        useGameStore.getState().setGoldenKeyEmitter((card) => {
          socket.emit('golden_key_apply', { card });
        });

        const clearHandlers = () => {
          const events = [
            'connect', 'connect_error', 'disconnect', 'join_error', 'join_success',
            'game_start', 'dice_rolling_started', 'dice_rolled', 'playerMove',
            'market_update', 'drawCard', 'draw_error', 'asset_update', 'turn_update',
            'war_state', 'war_start', 'war_end', 'war_fight_result', 'worldcup',
            'game_end', 'roll_error', 'turn_error', 'dice_roll_cancelled',
            'order_picking_start', 'order_card_picked', 'order_picking_complete',
            'minigame_start', 'pick_error', 'war_spoils_result',
          ];
          events.forEach((event) => socket.off(event));
        };
        clearHandlers();

        socket.on('connect', () => {
          console.log('[GameSocket] Connected');
          setState((s) => ({ ...s, connected: true, error: null }));
        });

        socket.on('disconnect', (reason: any) => {
          console.warn('[GameSocket] Disconnected:', reason);
          setState((s) => ({
            ...s,
            connected: false,
            error: s.error ?? '서버와의 연결이 끊어졌습니다. 다시 연결 중입니다.',
          }));
        });

        socket.on('connect_error', (err: any) => {
          console.error('[GameSocket] Connection error:', err);
          setState((s) => ({ ...s, connected: false, error: '서버 연결 실패' }));
        });

        if (socket.connected) {
          setState((s) => ({ ...s, connected: true, error: null }));
        } else if (typeof socket.connect === 'function') {
          socket.connect();
        }

        socket.on('join_error', (payload: any) => {
          console.error('[GameSocket] join_error:', payload);
          setState((s) => ({ ...s, error: String(payload?.message ?? '방 참가에 실패했어요.') }));
        });

        socket.on('join_success', (payload: any) => {
          console.log('[GameSocket] join_success:', payload);
          const roomStatus = String(payload?.roomStatus ?? '');
          const lobbyPlayers = Array.isArray(payload?.lobby?.players) ? payload.lobby.players : [];
          const myUserId = toInt(payload?.player?.userId);
          const currentTurnUserId = resolveTurnUserId(payload?.currentTurn, payload?.turnPlayerId, payload?.lobby?.players);
          const war = parseWar(payload?.war);

          if (myUserId) myUserIdRef.current = myUserId;
          currentTurnUserIdRef.current = currentTurnUserId;

          setState((s) => ({
            ...s,
            error: null,
            myUserId: myUserId || s.myUserId,
            currentTurnUserId: currentTurnUserId ?? s.currentTurnUserId,
            roomId: toInt(payload?.roomId ?? roomId),
          }));

          if (roomStatus === 'WAITING') {
            storeRef.current.setCurrentPage('lobby');
            return;
          }
          if (roomStatus !== 'PLAYING') return;
          if (lobbyPlayers.length === 0) return;

          const existing = useGameStore.getState().players;
          const byUserId = new Map(existing.map((p) => [p.userId, p]));

          const nextPlayers: Player[] = lobbyPlayers.map((lp: any, idx: number) => {
            const userId = toInt(lp?.userId);
            const playerId = toInt(lp?.playerId);
            const character = fromBackendCharacter(lp?.character) as CharacterType | null;
            const prev = byUserId.get(userId);
            const avatar = character ? CHARACTER_INFO[character].avatar : (prev?.avatar ?? '/assets/characters/default.png');
            const isMe = !!myUserId && userId === myUserId;
            const cash = isMe ? toNumber(payload?.player?.cash, prev?.cash ?? 3000000) : (prev?.cash ?? 3000000);
            const position = isMe ? toInt(payload?.player?.location, prev?.position ?? 0) : (prev?.position ?? 0);
            return {
              id: playerId || prev?.id || (idx + 1),
              userId: userId || prev?.userId || 0,
              name: String(lp?.nickname ?? prev?.name ?? `Player ${userId}`),
              avatar,
              character,
              position,
              cash,
              totalAsset: prev?.totalAsset,
              isReady: true,
              isBankrupt: Boolean(prev?.isBankrupt),
              stockHoldings: prev?.stockHoldings ?? {},
              tollRateMultiplier: character === 'TRUMP' ? 1.10 : 1.0,
              warWinChanceBonus: character === 'PUTIN' ? 0.1 : 0,
            };
          });

          const turnPlayerId = toInt(payload?.turnPlayerId, 0);
          const nextCurrentIdx = turnPlayerId > 0
            ? nextPlayers.findIndex((p) => p.id === turnPlayerId)
            : nextPlayers.findIndex((p) => p.userId === currentTurnUserId);

          useGameStore.setState(() => ({
            players: nextPlayers,
            currentPlayerIndex: nextCurrentIdx >= 0 ? nextCurrentIdx : 0,
            phase: 'IDLE',
            activeModal: null,
            queuedModal: null,
            war,
          }));

          void syncMap();
          void syncMarket();
          void hydratePlayersAssets(nextPlayers.map((p) => p.userId));
        });

        socket.on('order_picking_start', (data: any) => {
          console.log('[GameSocket] order_picking_start:', data);
          orderResultsRef.current = null;
          setState((s) => ({
            ...s,
            orderPicking: {
              isPickingOrder: true,
              availableCards: data.availableCards || [],
              pickedCards: [],
              myPickedCard: null,
              revealedCards: {},
              orderResults: null,
            },
          }));
        });

        socket.on('order_card_picked', (data: any) => {
          console.log('[GameSocket] order_card_picked:', data);
          const pickedUserId = toInt(data?.userId);
          const cardId = toInt(data?.cardId);
          const cardNumber = toInt(data?.cardNumber);
          const currentMyUserId = myUserIdRef.current;

          setState((s) => ({
            ...s,
            orderPicking: {
              ...s.orderPicking,
              pickedCards: data.pickedCards || [],
              revealedCards:
                Number.isFinite(cardId) && Number.isFinite(cardNumber)
                  ? { ...s.orderPicking.revealedCards, [cardId]: cardNumber }
                  : s.orderPicking.revealedCards,
              myPickedCard: pickedUserId === currentMyUserId ? cardId : s.orderPicking.myPickedCard,
            },
          }));
        });

        socket.on('order_picking_complete', (data: any) => {
          console.log('[GameSocket] order_picking_complete:', data);
          orderResultsRef.current = data.orderResults || [];
          setState((s) => ({
            ...s,
            orderPicking: { ...s.orderPicking, orderResults: data.orderResults || [] },
          }));
        });

        socket.on('minigame_start', () => {
          // 다른 플레이어가 미니게임 시작했을 때도 모달 열기
          const current = useGameStore.getState().activeModal;
          if (!current || current.type !== 'INITIAL_GAME') {
            useGameStore.setState({ activeModal: { type: 'INITIAL_GAME' }, phase: 'MODAL', modalData: null });
          }
        });

        socket.on('pick_error', (data: any) => {
          console.error('[GameSocket] pick_error:', data);
          setState((s) => ({ ...s, error: data.message || '오류가 발생했습니다.' }));
        });

        socket.on('game_start', (data: any) => {
          console.log('[GameSocket] game_start:', data);
          setState((s) => ({
            ...s,
            orderPicking: {
              isPickingOrder: false,
              availableCards: [],
              pickedCards: [],
              myPickedCard: null,
              revealedCards: {},
              orderResults: null,
            },
          }));

          const players: Player[] = (data.players || []).map((p: any, idx: number) => mapBackendPlayer(p, idx));
          const orderResults = data?.orderResults || orderResultsRef.current || socketStateRef.current.orderPicking.orderResults;
          const orderedPlayers = sortPlayersByCardOrder(players, orderResults);
          const fallbackTurnUserId = orderedPlayers.length > 0 ? orderedPlayers[0].userId : null;
          const currentTurnUserId = resolveTurnUserId(data?.currentTurn, data?.turnPlayerId, data?.players) ?? fallbackTurnUserId;
          const playerIndex = currentTurnUserId ? orderedPlayers.findIndex((p) => p.userId === currentTurnUserId) : -1;

          useGameStore.setState({
            players: orderedPlayers,
            currentPlayerIndex: playerIndex >= 0 ? playerIndex : 0,
            phase: 'IDLE',
            round: 1,
            hasRolledThisTurn: false,
            extraRolls: 0,
            dice: [1, 1],
            activeModal: null,
          });
          appendEventLog('SYSTEM', '게임 시작', '1턴이 시작되었습니다.', 1);

          setState((s) => ({ ...s, currentTurnUserId: currentTurnUserId ?? s.currentTurnUserId, roomId }));
          void syncMap();
          void syncMarket();
          void hydratePlayersAssets(orderedPlayers.map((p) => p.userId));
        });

        socket.on('dice_rolling_started', (data: any) => {
          console.log('[GameSocket] dice_rolling_started:', data);
          const rollingUserId = toInt(data?.userId);
          scheduleRollTimeout();
          useGameStore.setState((s) => ({
            isRolling: true,
            rollStage: 'HOLDING',
            rollingUserId,
            rollTrigger: s.rollTrigger + 1,
            rollStartedAt: Date.now(),
          }));
        });

        socket.on('dice_rolled', (data: any) => {
          console.log('[GameSocket] dice_rolled:', data);
          clearRollTimeout();

          const safeDice1 = clampDiceValue(data.dice1);
          const safeDice2 = clampDiceValue(data.dice2);
          useGameStore.setState((s) => ({
            dice: [safeDice1, safeDice2],
            isDouble: data.isDouble,
            rollStage: 'SETTLING',
            pendingDice: [safeDice1, safeDice2],
            rollReleaseTrigger: s.rollReleaseTrigger + 1,
          }));

          const userId = toInt(data?.userId);
          const name = useGameStore.getState().players.find((p) => p.userId === userId)?.name ?? '플레이어';
          const dice1 = safeDice1;
          const dice2 = safeDice2;
          appendEventLog('MOVE', '주사위 결과', `${name} ${dice1} + ${dice2} = ${dice1 + dice2}`);

          if (data.tollPaid) {
            const payerName = useGameStore.getState().players.find((p) => p.userId === toInt(data?.userId))?.name ?? '플레이어';
            const ownerName = useGameStore.getState().players.find((p) => p.id === toInt(data.tollPaid.ownerId))?.name ?? '소유자';
            const tollAmount = toNumber(data.tollPaid.amount);
            const afterCash = toNumber(data?.player?.cash, 0);
            const beforeCash = afterCash + tollAmount;
            appendEventLog('LAND', '통행료 지불', `${payerName} → ${ownerName}\n잔액: ${beforeCash.toLocaleString()}원 → 통행료: ${tollAmount.toLocaleString()}원 → 잔액: ${afterCash.toLocaleString()}원`);
          }

          setTimeout(() => {
            useGameStore.setState((st) => {
              let updatedPlayers = st.players.map((p) => {
                if (p.userId !== toInt(data?.userId)) return p;
                return {
                  ...p,
                  cash: toNumber(data?.player?.cash, p.cash),
                  totalAsset: data?.player?.totalAsset != null ? toNumber(data.player.totalAsset) : p.totalAsset,
                };
              });
              if (data.tollPaid && data.tollPaid.ownerId) {
                updatedPlayers = updatedPlayers.map((p) => {
                  if (p.id !== toInt(data.tollPaid.ownerId)) return p;
                  return { ...p, cash: toNumber(data.tollPaid.ownerCash, p.cash) };
                });
              }
              return {
                hasRolledThisTurn: true,
                extraRolls: data.hasExtraTurn ? 1 : 0,
                rollStage: 'IDLE',
                isRolling: false,
                rollingUserId: null,
                pendingDice: null,
                players: updatedPlayers,
              };
            });
          }, 500);

          if (data?.turnUserId != null) {
            setState((s) => ({ ...s, currentTurnUserId: toInt(data.turnUserId) }));
          }
        });

        socket.on('playerMove', (data: any) => {
          console.log('[GameSocket] playerMove:', data);
          const playerId = toInt(data?.playerId);
          const newLocation = toInt(data?.newLocation);

          const openLandingModal = () => {
            const myUserId = myUserIdRef.current;
            if (!myUserId) return;
            if (toInt(data?.userId) !== myUserId) return;

            const snap = useGameStore.getState();
            const me = snap.players.find((p) => p.userId === myUserId);
            if (!me) return;
            const currentSocket = socketRef.current;

            const space = BOARD_DATA[newLocation];
            if (!space) return;

            const isSpaceTravel = data?.type === 'SPACE';
            const isMinigame = space.type === 'MINIGAME';

            // 우주여행이나 미니게임은 모달 강제 초기화
            if (isSpaceTravel || isMinigame) {
              useGameStore.setState({ activeModal: null, modalData: null });
            } else if (snap.activeModal) {
              return;
            }

            if (space.type === 'START') {
              useGameStore.setState({
                activeModal: { type: 'ASSET_TRADE', allowedSymbols: START_TILE_TRADE_SYMBOLS, symbol: 'GOLD' },
                phase: 'MODAL',
                modalData: null,
              });
              return;
            }

            if (space.type === 'COUNTRY') {
              const land = snap.lands[newLocation] ?? null;
              if (!land) {
                useGameStore.setState({
                  activeModal: { type: 'LAND_BUY', tileId: newLocation },
                  phase: 'MODAL',
                  modalData: null,
                });
                return;
              }
              if (land.ownerId === me.id) {
                // 본인 땅에 도착하면 땅값만큼 현금 지급
                const landPrice = snap.landPrices[newLocation] ?? BOARD_DATA[newLocation]?.price ?? 0;
                const spaceName = BOARD_DATA[newLocation]?.name ?? '땅';
                useGameStore.setState((s) => ({
                  players: s.players.map((p) =>
                    p.id === me.id ? { ...p, cash: p.cash + landPrice } : p
                  ),
                  activeModal: {
                    type: 'INFO',
                    title: '임대 수익',
                    description: `${spaceName}에서 ${Math.round(landPrice / 10000)}만원의 임대 수익을 얻었습니다!`,
                  },
                  phase: 'MODAL',
                  modalData: null,
                }));
                appendEventLog('LAND', '임대 수익', `${me.name} ${spaceName}에서 ${Math.round(landPrice / 10000)}만원 수령`);
                return;
              }

              const tollPaid = data?.tollPaid;
              const ownerId = tollPaid ? toInt(tollPaid.ownerId, land.ownerId) : land.ownerId;
              const owner = snap.players.find((p) => p.id === ownerId) ?? null;
              const baseToll = snap.landTolls[newLocation] ?? 0;
              const trumpBonus = owner?.character === 'TRUMP' ? 1.1 : 1;
              const toll = tollPaid
                ? toNumber(tollPaid.amount, 0)
                : applyWarMultiplier(Math.round(baseToll * trumpBonus), newLocation, true, snap.war);

              const basePrice = snap.landPrices[newLocation] ?? 0;
              const ownedPrice = applyWarMultiplier(basePrice, newLocation, true, snap.war);
              const takeoverPrice = Math.round(ownedPrice * 1.5);

              const currentCash = me.cash;
              const beforeCash = tollPaid ? currentCash + toNumber(tollPaid.amount, 0) : currentCash;

              useGameStore.setState({
                activeModal: { type: 'LAND_VISIT', tileId: newLocation, ownerId, toll, takeoverPrice },
                phase: 'MODAL',
                modalData: tollPaid ? { tollAlreadyPaid: true, beforeCash, afterCash: currentCash } : null,
              });
              return;
            }

            if (space.type === 'STOCK') {
              const symbol = TILE_TO_STOCK[newLocation];
              if (!symbol) return;
              const allowed = [symbol];
              useGameStore.setState({
                activeModal: { type: 'ASSET_TRADE', allowedSymbols: allowed, symbol },
                phase: 'MODAL',
                modalData: null,
              });
              return;
            }

            if (space.type === 'MINIGAME') {
              // 미니게임 모달 직접 열기 (소켓 이벤트 대기 없이)
              useGameStore.setState({ activeModal: { type: 'INITIAL_GAME' }, phase: 'MODAL', modalData: null });
              if (currentSocket) {
                currentSocket.emit('minigame_start');
              }
              return;
            }

            if (space.type === 'KEY') {
              if (!currentSocket) return;
              void (async () => {
                try {
                  const gameState = useGameStore.getState();
                  const card = await apiDrawGoldenKey({
                    players: gameState.players,
                    lands: gameState.lands,
                    landPrices: gameState.landPrices,
                    assetPrices: gameState.assetPrices,
                  });
                  currentSocket.emit('draw_card', { card });
                } catch (e: any) {
                  setState((s) => ({ ...s, error: e?.message ?? '황금열쇠를 뽑는 데 실패했습니다.' }));
                }
              })();
              return;
            }

            if (space.type === 'TAX') {
              const eventResult = data?.eventResult;
              if (eventResult && eventResult.type === 'TAX') {
                const taxAmount = toNumber(eventResult.amount, 0);
                const paid = toNumber(eventResult.paid, 0);
                const beforeCash = me.cash + paid;
                const isBankrupt = Boolean(eventResult.isBankrupt);
                const autoSales = eventResult.autoSales || [];
                appendEventLog('TAX', '국세청', `세금 ${taxAmount.toLocaleString()}원 (자산의 20%)`);
                useGameStore.setState({
                  activeModal: { type: 'TAX', due: taxAmount, paid, beforeCash, afterCash: me.cash, autoSales, isBankrupt },
                  phase: 'MODAL',
                });
              } else {
                useGameStore.setState({ activeModal: { type: 'TAX', due: 0, paid: 0 }, phase: 'MODAL' });
              }
              return;
            }

            if (space.type === 'WAR' || space.name === '전쟁') {
              useGameStore.setState({ activeModal: { type: 'WAR_SELECT', byCard: false }, phase: 'MODAL', modalData: null });
              return;
            }

            if (space.type === 'EXPO' || newLocation === 16) {
              useGameStore.setState({ activeModal: { type: 'WORLD_CUP' }, phase: 'MODAL', modalData: null });
              return;
            }

            if (space.type === 'ISLAND' || space.name === '우주여행') {
              useGameStore.setState({ activeModal: { type: 'SPACE_TRAVEL' }, phase: 'MODAL', modalData: null });
            }
          };

          clearMoveTimers();
          moveRunIdRef.current += 1;
          const runId = moveRunIdRef.current;

          const totalTiles = BOARD_DATA.length || 0;
          const oldLocation = toInt(data?.oldLocation, NaN);
          const currentPos = useGameStore.getState().players.find((p) => p.id === playerId)?.position ?? newLocation;
          const startPos = Number.isFinite(oldLocation) ? oldLocation : currentPos;

          // 서버에서 보내는 dice1, dice2 직접 사용 (가장 정확)
          const serverDice1 = toInt(data?.dice1, 0);
          const serverDice2 = toInt(data?.dice2, 0);
          const diceSteps = serverDice1 + serverDice2;

          // 서버 주사위 값 우선, 없으면 위치 차이로 계산
          const deltaSteps = totalTiles > 0 ? (newLocation - startPos + totalTiles) % totalTiles : 0;
          const steps = diceSteps > 0 ? diceSteps : (deltaSteps > 0 ? deltaSteps : 0);

          if (!totalTiles || steps <= 0) {
            useGameStore.setState((st) => ({
              players: st.players.map((p) => (p.id === playerId ? { ...p, position: newLocation } : p)),
              phase: 'IDLE',
            }));
            const playerName = useGameStore.getState().players.find((p) => p.id === playerId)?.name ?? '플레이어';
            const spaceName = BOARD_DATA[newLocation]?.name ?? `${newLocation}번 지역`;
            appendEventLog('MOVE', '이동', `${playerName} ${spaceName} 도착`);
            openLandingModal();
            return;
          }

          useGameStore.setState({ phase: 'MOVING' });
          const startDelay = 1500;

          for (let i = 1; i <= steps; i += 1) {
            const timeoutId = setTimeout(() => {
              if (moveRunIdRef.current !== runId) return;
              const nextPos = totalTiles > 0 ? (startPos + i) % totalTiles : newLocation;
              const isFinal = i >= steps;

              useGameStore.setState((st) => ({
                players: st.players.map((p) => (p.id === playerId ? { ...p, position: isFinal ? newLocation : nextPos } : p)),
                phase: isFinal ? 'IDLE' : 'MOVING',
              }));

              // Play step sound
              playSound('step');

              if (isFinal) {
                const playerName = useGameStore.getState().players.find((p) => p.id === playerId)?.name ?? '플레이어';
                const spaceName = BOARD_DATA[newLocation]?.name ?? `${newLocation}번 지역`;
                appendEventLog('MOVE', '이동', `${playerName} ${spaceName} 도착`);
                openLandingModal();
              }
            }, startDelay + i * GAME_RULES.MOVE_STEP_MS);
            moveTimersRef.current.push(timeoutId);
          }
        });

        socket.on('market_update', (data: any) => {
          console.log('[GameSocket] market_update:', data);
          const newPrices: Partial<Record<StockSymbol, number>> = {};
          const newPrevPrices: Partial<Record<StockSymbol, number>> = {};
          if (data?.samsung != null) newPrices.SAMSUNG = toNumber(data.samsung);
          if (data?.tesla != null) newPrices.TESLA = toNumber(data.tesla);
          if (data?.lockheed != null) newPrices.LOCKHEED = toNumber(data.lockheed);
          if (data?.gold != null) newPrices.GOLD = toNumber(data.gold);
          if (data?.bitcoin != null) newPrices.BITCOIN = toNumber(data.bitcoin);
          // prev prices from backend
          if (data?.prevSamsung != null) newPrevPrices.SAMSUNG = toNumber(data.prevSamsung);
          if (data?.prevTesla != null) newPrevPrices.TESLA = toNumber(data.prevTesla);
          if (data?.prevLockheed != null) newPrevPrices.LOCKHEED = toNumber(data.prevLockheed);
          if (data?.prevGold != null) newPrevPrices.GOLD = toNumber(data.prevGold);
          if (data?.prevBtc != null) newPrevPrices.BITCOIN = toNumber(data.prevBtc);
          useGameStore.setState((st) => ({
            assetPrices: { ...st.assetPrices, ...newPrices },
            prevAssetPrices: { ...st.prevAssetPrices, ...newPrevPrices },
          }));
          appendEventLog('MARKET', '시장 변동', '주요 자산 가격이 업데이트되었습니다.');
        });

        socket.on('drawCard', (data: any) => {
          console.log('[GameSocket] drawCard:', data);
          const card = data?.card ?? data;
          if (!card) return;
          // NOTE: Do NOT call applyGoldenKeyCard here - backend applies effects via golden_key_apply
          // and broadcasts updates via asset_update/market_update to avoid double processing
          const title = String(card?.title ?? '이벤트');
          const description = String(card?.message ?? card?.description ?? '');
          useGameStore.setState({ activeModal: { type: 'GOLDEN_KEY', title, description }, phase: 'MODAL' });
          appendEventLog('KEY', title, description);
        });

        socket.on('draw_error', (data: any) => {
          console.warn('[GameSocket] draw_error:', data);
          const message = translateSocketError(data?.message) || data?.message || '황금열쇠 처리에 실패했습니다.';
          setState((s) => ({ ...s, error: message }));
        });

        socket.on('asset_update', (data: any) => {
          console.log('[GameSocket] asset_update:', data);
          useGameStore.setState((st) => ({
            players: st.players.map((p) => {
              if (p.userId !== toInt(data?.userId)) return p;
              const nextHoldings = data?.assets
                ? {
                  SAMSUNG: toInt(data.assets.samsung, p.stockHoldings.SAMSUNG ?? 0),
                  TESLA: toInt(data.assets.tesla, p.stockHoldings.TESLA ?? 0),
                  LOCKHEED: toInt(data.assets.lockheed, p.stockHoldings.LOCKHEED ?? 0),
                  GOLD: toInt(data.assets.gold, p.stockHoldings.GOLD ?? 0),
                  BITCOIN: toInt(data.assets.bitcoin, p.stockHoldings.BITCOIN ?? 0),
                }
                : p.stockHoldings;
              return {
                ...p,
                cash: toNumber(data?.cash, p.cash),
                totalAsset: data?.totalAsset != null ? toNumber(data.totalAsset) : p.totalAsset,
                stockHoldings: nextHoldings,
              };
            }),
          }));
          void syncMap();
        });

        socket.on('turn_update', (data: any) => {
          console.log('[GameSocket] turn_update:', data);
          clearRollTimeout();

          const rawTurnUserId = toInt(data?.currentTurn, 0);
          const rawTurnPlayerId = toInt(data?.turnPlayerId, 0);
          let resolvedTurnUserId = rawTurnUserId;
          if (resolvedTurnUserId <= 0 && rawTurnPlayerId > 0) {
            const byPlayer = useGameStore.getState().players.find((p) => p.id === rawTurnPlayerId);
            resolvedTurnUserId = byPlayer?.userId ?? 0;
          }
          setState((s) => ({
            ...s,
            currentTurnUserId: resolvedTurnUserId > 0 ? resolvedTurnUserId : s.currentTurnUserId,
          }));

          const nextRound = useGameStore.getState().round + 1;
          const currentPlayers = useGameStore.getState().players;
          const turnPlayer = currentPlayers.find((p) => p.id === rawTurnPlayerId) ?? currentPlayers.find((p) => p.userId === resolvedTurnUserId) ?? null;
          appendEventLog('TURN', '턴 변경', `${turnPlayer?.name ?? '플레이어'} 차례`, nextRound);

          useGameStore.setState((st) => {
            const turnPlayerId = toInt(data?.turnPlayerId, 0);
            const idx = st.players.findIndex((p) => p.id === turnPlayerId);
            return {
              currentPlayerIndex: idx >= 0 ? idx : st.currentPlayerIndex,
              round: st.round + 1,
              hasRolledThisTurn: false,
              extraRolls: 0,
              phase: 'IDLE',
              activeModal: null,
              isRolling: false,
              rollStage: 'IDLE',
              rollingUserId: null,
              pendingDice: null,
              war: parseWar(data?.war),
            };
          });
        });

        socket.on('war_state', (data: any) => {
          console.log('[GameSocket] war_state:', data);
          useGameStore.setState({ war: parseWar(data) });
        });

        socket.on('war_start', (data: any) => {
          console.log('[GameSocket] war_start:', data);
          useGameStore.setState({
            war: parseWar(data),
            activeModal: {
              type: 'INFO',
              title: 'War Started!',
              description: `War has begun. ${data.turnsLeft} turn(s) remaining.`,
            },
            phase: 'MODAL',
          });
          appendEventLog('WAR', 'War Started', 'A war has started.');
        });

        socket.on('war_end', (data: any) => {
          console.log('[GameSocket] war_end:', data);
          useGameStore.setState({ war: parseWar(data) });
          appendEventLog('WAR', '전쟁 종료', '전쟁이 종료되었습니다.');
        });

        // 전쟁 결과 처리 - 승자가 패자로부터 땅 또는 현금을 받음
        socket.on('war_fight_result', (data: any) => {
          console.log('[GameSocket] war_fight_result:', data);
          const winnerId = toInt(data?.winnerId);
          const loserId = toInt(data?.loserId);
          const winnerUserId = toInt(data?.winnerUserId);
          const loserUserId = toInt(data?.loserUserId);
          const loserLands = Array.isArray(data?.loserLands) ? data.loserLands.map((id: any) => toInt(id)) : [];
          const cashPenalty = toNumber(data?.cashPenalty, 1000000);
          const attackerWins = Boolean(data?.attackerWins);
          const winRate = toNumber(data?.winRate, 50);

          const snap = useGameStore.getState();
          const winner = snap.players.find((p) => p.id === winnerId || p.userId === winnerUserId);
          const loser = snap.players.find((p) => p.id === loserId || p.userId === loserUserId);

          if (!winner || !loser) {
            console.warn('[GameSocket] war_fight_result: winner or loser not found');
            return;
          }

          const winnerName = winner.name;
          const loserName = loser.name;
          const myUserId = myUserIdRef.current;
          const isMyWin = myUserId === winnerUserId;

          // WAR_FIGHT animation result
          if (loserLands.length === 0) {
            useGameStore.setState({
              queuedModal: {
                type: 'WAR_RESULT',
                title: isMyWin ? 'Victory!' : 'Defeat...',
                description: isMyWin
                  ? `${loserName} paid ${(cashPenalty / 10000).toFixed(0)} to ${winnerName}. (Win rate ${winRate.toFixed(1)}%)`
                  : `${winnerName} took ${(cashPenalty / 10000).toFixed(0)} from ${loserName}. (Win rate ${(100 - winRate).toFixed(1)}%)`,
              },
            });
            appendEventLog(
              'WAR',
              'War Result',
              `${winnerName} gained ${(cashPenalty / 10000).toFixed(0)} from ${loserName}.`,
            );
          } else {
            // If loser has lands, allow winner to pick spoils
            useGameStore.setState({
              queuedModal: {
                type: 'WAR_SPOILS',
                winnerId: winner.id,
                loserId: loser.id,
                winnerName,
                loserName,
                loserLands,
                cashPenalty,
              },
            });
            appendEventLog('WAR', 'War Victory', `${winnerName} defeated ${loserName}. Choose a spoils tile.`);
          }
        });

        // 전리품 선택 결과 처리
        socket.on('war_spoils_result', (data: any) => {
          console.log('[GameSocket] war_spoils_result:', data);
          const { winnerId, loserId, landId, landName } = data;
          const winnerIdNum = toInt(winnerId);
          const loserIdNum = toInt(loserId);
          const landIdNum = toInt(landId);

          const snap = useGameStore.getState();
          const winner = snap.players.find((p) => p.id === winnerIdNum || p.userId === winnerIdNum);
          const loser = snap.players.find((p) => p.id === loserIdNum || p.userId === loserIdNum);

          if (winner && loser) {
            // 땅 소유권 이전
            useGameStore.setState((s) => ({
              lands: {
                ...s.lands,
                [landIdNum]: { ...s.lands[landIdNum], ownerId: winner.id },
              },
              activeModal: {
                type: 'WAR_RESULT',
                title: '영토 획득!',
                description: `${winner.name}이(가) ${loser.name}에게서 ${landName || BOARD_DATA[landIdNum]?.name || '땅'}을(를) 획득했습니다!`,
              },
              phase: 'MODAL',
            }));
            appendEventLog('WAR', '영토 획득', `${winner.name}이(가) ${loser.name}에게서 ${landName || BOARD_DATA[landIdNum]?.name || '땅'} 획득`);
          }
          void syncMap();
        });

        socket.on('worldcup', (data: any) => {
          console.log('[GameSocket] worldcup:', data);
          const nodeIdx = toInt(data?.nodeIdx);
          if (!Number.isInteger(nodeIdx)) return;
          const name = BOARD_DATA[nodeIdx]?.name ?? `${nodeIdx}번 지역`;
          useGameStore.setState((s) => ({
            players: s.players.map((p) => ({ ...p, position: nodeIdx })),
            activeModal: { type: 'INFO', title: '월드컵 개최!', description: `모든 플레이어가 ${name}로 이동했습니다.` },
            phase: 'MODAL',
          }));
          appendEventLog('TURN', '월드컵 개최', `모든 플레이어가 ${name}로 이동했습니다.`);
          void syncMap();
        });

        socket.on('game_end', (data: any) => {
          console.log('[GameSocket] game_end:', data);
          const rankings = data.rankings || [];
          const winner = rankings[0];
          useGameStore.setState({
            phase: 'GAME_OVER',
            gameResult: {
              winnerId: winner?.playerId || null,
              ranking: rankings.map((r: any) => ({ playerId: r.playerId, netWorth: Number(r.totalAsset) })),
              reason: `${data.maxTurn}턴 종료`,
              endedAtRound: data.maxTurn,
            },
          });
          appendEventLog('SYSTEM', '게임 종료', `${data.maxTurn ?? ''}턴이 종료되었습니다.`);
          // Use getState() directly to ensure all clients navigate to result page
          useGameStore.getState().setCurrentPage('result');
        });

        socket.on('dice_roll_cancelled', (data: any) => {
          console.warn('[GameSocket] dice_roll_cancelled:', data);
          clearRollTimeout();
          useGameStore.setState({ isRolling: false, rollStage: 'IDLE', rollingUserId: null, pendingDice: null });
          const cancelledUserId = toInt(data?.userId, 0);
          if (cancelledUserId > 0 && cancelledUserId === myUserIdRef.current) {
            setState((s) => ({ ...s, error: '주사위 결과 전송에 실패했습니다. 다시 시도해 주세요.' }));
          }
        });

        socket.on('roll_error', (data: any) => {
          console.error('[GameSocket] roll_error:', data);
          clearRollTimeout();
          useGameStore.setState({ isRolling: false, rollStage: 'IDLE', rollingUserId: null, pendingDice: null });
          const message = translateSocketError(data?.message) || '주사위 굴리기 실패';
          setState((s) => ({ ...s, error: message }));
          if (data?.message === 'Login session expired') storeRef.current.setCurrentPage('login');
          else if (data?.message === 'Room not joined' || data?.message === 'Player not found') storeRef.current.setCurrentPage('lobby');
        });

        socket.on('turn_error', (data: any) => {
          console.error('[GameSocket] turn_error:', data);
          const message = translateSocketError(data?.message) || '턴 종료 실패';
          setState((s) => ({ ...s, error: message }));
          if (data?.message === 'Login session expired') storeRef.current.setCurrentPage('login');
          else if (data?.message === 'Room not joined' || data?.message === 'Player not found') storeRef.current.setCurrentPage('lobby');
        });

        socket.emit('join_room', roomId);
      } catch (err: any) {
        console.error('[GameSocket] Failed to connect:', err);
        setState((s) => ({ ...s, error: err?.message || '연결 실패' }));
      }
    };

    connect();

    return () => {
      alive = false;
      clearRollTimeout();
      clearMoveTimers();
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [roomId, clearRollTimeout, clearMoveTimers, scheduleRollTimeout, appendEventLog, hydratePlayersAssets, parseWar, resolveTurnUserId, syncMap, syncMarket]);

  const rollDice = useCallback(() => {
    const socket = socketRef.current;
    if (!socket) {
      setState((s) => ({ ...s, error: '소켓이 연결되지 않았습니다. 잠시 후 다시 시도해 주세요.' }));
      return;
    }
    if (!socket.connected) {
      if (typeof socket.connect === 'function') socket.connect();
      setState((s) => ({ ...s, error: '소켓 연결 중입니다. 잠시 후 다시 시도해 주세요.' }));
      return;
    }

    const socketState = socketStateRef.current;
    const myUserId = toInt(socketState?.myUserId ?? myUserIdRef.current, 0);
    const socketTurnUserId = toInt(socketState?.currentTurnUserId ?? currentTurnUserIdRef.current, 0);
    const storeState = useGameStore.getState();
    const fallbackTurnUserId = toInt(storeState.players[storeState.currentPlayerIndex]?.userId, 0);
    const currentTurnUserId = socketTurnUserId > 0 ? socketTurnUserId : fallbackTurnUserId;

    if (myUserId <= 0 || currentTurnUserId <= 0 || myUserId !== currentTurnUserId) {
      setState((s) => ({ ...s, error: '지금은 당신의 턴이 아닙니다.' }));
      return;
    }

    if (useGameStore.getState().isRolling) return;

    setState((s) => ({ ...s, error: null }));
    socket.emit('roll_dice');
  }, []);

  const endTurn = useCallback(() => {
    if (!socketRef.current) return;
    setState((s) => ({ ...s, error: null }));
    socketRef.current.emit('end_turn');
  }, []);

  const isMyTurn = useCallback(() => {
    const socketState = socketStateRef.current;
    const myUserId = toInt(socketState?.myUserId ?? myUserIdRef.current, 0);
    const socketTurnUserId = toInt(socketState?.currentTurnUserId ?? currentTurnUserIdRef.current, 0);
    const storeState = useGameStore.getState();
    const fallbackTurnUserId = toInt(storeState.players[storeState.currentPlayerIndex]?.userId, 0);
    const turnUserId = socketTurnUserId > 0 ? socketTurnUserId : fallbackTurnUserId;
    if (myUserId <= 0 || turnUserId <= 0) return false;
    return turnUserId === myUserId;
  }, []);

  const pickOrderCard = useCallback((cardNumber: number) => {
    if (!socketRef.current) return;
    setState((s) => ({ ...s, error: null }));
    socketRef.current.emit('pick_order_card', cardNumber);
  }, []);

  // 전쟁 전리품 선택 (땅 ID 또는 null이면 현금)
  const selectWarSpoils = useCallback((winnerId: number, loserId: number, landId: number | null) => {
    if (!socketRef.current) {
      console.warn('[GameSocket] selectWarSpoils: socket not connected');
      return;
    }
    console.log('[GameSocket] selectWarSpoils:', { winnerId, loserId, landId });
    socketRef.current.emit('select_war_spoils', { winnerId, loserId, landId });
  }, []);

  // 전쟁 시작 (상대방 userId 전달)
  const startWarFight = useCallback((opponentUserId: number) => {
    if (!socketRef.current) {
      console.warn('[GameSocket] startWarFight: socket not connected');
      return;
    }
    console.log('[GameSocket] startWarFight:', { opponentUserId });
    socketRef.current.emit('start_war_fight', { opponentUserId });
  }, []);

  return {
    socket: socketRef.current,
    ...state,
    rollDice,
    endTurn,
    isMyTurn,
    pickOrderCard,
    selectWarSpoils,
    startWarFight,
  };
};

export default useGameSocket;
