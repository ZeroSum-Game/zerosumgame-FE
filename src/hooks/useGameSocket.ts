import { useEffect, useRef, useCallback, useState } from 'react';
import { connectSocket } from '../services/socketio';
import { isAuthenticated } from '../services/auth';
import { fromBackendCharacter } from '../utils/characterMapping';
import useGameStore, {
  CHARACTER_INFO,
  TILE_TO_STOCK,
  type CharacterType,
  type Player,
  type StockSymbol,
  type WarPayload,
} from '../store/useGameStore';
import { toInt, toNumber } from '../utils/parseNumber';
import { apiGetMap, apiGetPlayerAssets } from '../services/api';
import { BOARD_DATA } from '../utils/boardUtils';
import { applyWarMultiplier } from '../utils/warMultiplier';

type SocketLike = Awaited<ReturnType<typeof connectSocket>>;

// 백엔드 주식 심볼을 프론트엔드 심볼로 변환
const mapBackendStockSymbol = (symbol: string): StockSymbol | null => {
  const mapping: Record<string, StockSymbol> = {
    SAMSUNG: 'SAMSUNG',
    TESLA: 'SK_HYNIX',
    LOCKHEED: 'HYUNDAI',
    GOLD: 'GOLD',
    BITCOIN: 'BITCOIN',
  };
  return mapping[symbol.toUpperCase()] || null;
};

// 백엔드 플레이어 데이터를 프론트엔드 형식으로 변환
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
    tollRateMultiplier: character === 'TRUMP' ? 1.05 : 1.0,
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
  orderResults: OrderPickResult[] | null;
};

export type GameSocketState = {
  connected: boolean;
  error: string | null;
  currentTurnUserId: number | null;
  myUserId: number | null;
  roomId: number | null;
  orderPicking: OrderPickingState;
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
      orderResults: null,
    },
  });

  const store = useGameStore.getState();
  const storeRef = useRef(store);
  const myUserIdRef = useRef<number | null>(null);
  const currentTurnUserIdRef = useRef<number | null>(null);

  useEffect(() => {
    storeRef.current = useGameStore.getState();
  });

  useEffect(() => {
    myUserIdRef.current = state.myUserId;
    currentTurnUserIdRef.current = state.currentTurnUserId;
  }, [state.currentTurnUserId, state.myUserId]);

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
    const nextLands: Record<number, { ownerId: number; type: 'LAND' | 'LANDMARK' }> = {};

    map.forEach((n) => {
      if (n.type === 'LAND') {
        nextLandPrices[n.nodeIdx] = n.basePrice;
        nextLandTolls[n.nodeIdx] = n.baseToll;
      }
      if (n.ownerId != null) {
        nextLands[n.nodeIdx] = { ownerId: n.ownerId, type: n.isLandmark ? 'LANDMARK' : 'LAND' };
      }
    });

    useGameStore.setState({
      landPrices: nextLandPrices,
      landTolls: nextLandTolls,
      lands: nextLands,
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
            SK_HYNIX: r.assets.tesla,
            HYUNDAI: r.assets.lockheed,
            GOLD: r.assets.gold,
            BITCOIN: r.assets.bitcoin,
          },
        };
      }),
    }));
  }, []);

  // 소켓 연결
  useEffect(() => {
    if (!isAuthenticated()) {
      store.setCurrentPage('login');
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

        const clearHandlers = () => {
          const events = [
            'connect',
            'connect_error',
            'join_error',
            'join_success',
            'game_start',
            'dice_rolling_started',
            'dice_rolled',
            'playerMove',
            'market_update',
            'drawCard',
            'asset_update',
            'turn_update',
            'war_state',
            'war_start',
            'war_end',
            'worldcup',
            'landmark_destroyed',
            'game_end',
            'roll_error',
            'turn_error',
            'order_picking_start',
            'order_card_picked',
            'order_picking_complete',
            'pick_error',
          ];
          events.forEach((event) => socket.off(event));
        };
        clearHandlers();

        // 연결 성공
        socket.on('connect', () => {
          console.log('[GameSocket] Connected');
          setState(s => ({ ...s, connected: true, error: null }));
        });

        socket.on('connect_error', (err: any) => {
          console.error('[GameSocket] Connection error:', err);
          setState(s => ({ ...s, connected: false, error: '서버 연결 실패' }));
        });

        socket.on('join_error', (payload: any) => {
          console.error('[GameSocket] join_error:', payload);
          setState((s) => ({ ...s, error: String(payload?.message ?? '방 참가에 실패했어요.') }));
        });

        // 방 입장 성공 (게임 중 재접속/초기 상태 동기화)
        socket.on('join_success', (payload: any) => {
          console.log('[GameSocket] join_success:', payload);

          const roomStatus = String(payload?.roomStatus ?? '');
          const lobbyPlayers = Array.isArray(payload?.lobby?.players) ? payload.lobby.players : [];

          const myUserId = toInt(payload?.player?.userId);
          const currentTurnUserId = payload?.currentTurn != null ? toInt(payload.currentTurn) : null;
          const war = parseWar(payload?.war);

          if (myUserId) myUserIdRef.current = myUserId;
          currentTurnUserIdRef.current = currentTurnUserId;

          setState((s) => ({
            ...s,
            error: null,
            myUserId: myUserId || s.myUserId,
            currentTurnUserId,
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
              tollRateMultiplier: character === 'TRUMP' ? 1.05 : 1.0,
              warWinChanceBonus: character === 'PUTIN' ? 0.1 : 0,
            };
          });

          const turnPlayerId = toInt(payload?.turnPlayerId, 0);
          const nextCurrentIdx =
            turnPlayerId > 0 ? nextPlayers.findIndex((p) => p.id === turnPlayerId) : nextPlayers.findIndex((p) => p.userId === currentTurnUserId);

          useGameStore.setState((s) => ({
            players: nextPlayers,
            currentPlayerIndex: nextCurrentIdx >= 0 ? nextCurrentIdx : 0,
            phase: 'IDLE',
            activeModal: null,
            queuedModal: null,
            war,
          }));

          void syncMap();
          void hydratePlayersAssets(nextPlayers.map((p) => p.userId));
        });

        // 순서 뽑기 시작
        socket.on('order_picking_start', (data: any) => {
          console.log('[GameSocket] order_picking_start:', data);
          setState((s) => ({
            ...s,
            orderPicking: {
              isPickingOrder: true,
              availableCards: data.availableCards || [],
              pickedCards: [],
              myPickedCard: null,
              orderResults: null,
            },
          }));
        });

        // 카드 선택됨
        socket.on('order_card_picked', (data: any) => {
          console.log('[GameSocket] order_card_picked:', data);
          const pickedUserId = toInt(data?.userId);
          const cardNumber = toInt(data?.cardNumber);
          const currentMyUserId = myUserIdRef.current;

          setState((s) => ({
            ...s,
            orderPicking: {
              ...s.orderPicking,
              pickedCards: data.pickedCards || [],
              myPickedCard: pickedUserId === currentMyUserId ? cardNumber : s.orderPicking.myPickedCard,
            },
          }));
        });

        // 순서 뽑기 완료
        socket.on('order_picking_complete', (data: any) => {
          console.log('[GameSocket] order_picking_complete:', data);
          setState((s) => ({
            ...s,
            orderPicking: {
              ...s.orderPicking,
              orderResults: data.orderResults || [],
            },
          }));
        });

        // 카드 선택 에러
        socket.on('pick_error', (data: any) => {
          console.error('[GameSocket] pick_error:', data);
          setState((s) => ({ ...s, error: data.message || '카드 선택 실패' }));
        });

        // 게임 시작 이벤트
        socket.on('game_start', (data: any) => {
          console.log('[GameSocket] game_start:', data);
          // 순서 뽑기 상태 초기화
          setState((s) => ({
            ...s,
            orderPicking: {
              isPickingOrder: false,
              availableCards: [],
              pickedCards: [],
              myPickedCard: null,
              orderResults: null,
            },
          }));

          const players: Player[] = (data.players || []).map((p: any, idx: number) => mapBackendPlayer(p, idx));

          // 턴 순서에 따라 currentPlayerIndex 설정
          const turnOrder = data.turnOrder || [];
          const currentTurnUserId = data.currentTurn;
          const currentPlayerIndex = players.findIndex(p => {
            const playerData = data.players?.find((pd: any) => pd.playerId === p.id);
            return playerData?.userId === currentTurnUserId;
          });

          useGameStore.setState({
            players,
            currentPlayerIndex: currentPlayerIndex >= 0 ? currentPlayerIndex : 0,
            phase: 'IDLE',
            round: 1,
            hasRolledThisTurn: false,
            extraRolls: 0,
            dice: [1, 1],
            activeModal: null,
          });

          setState(s => ({ ...s, currentTurnUserId, roomId }));
          void syncMap();
          void hydratePlayersAssets(players.map((p) => p.userId));
        });

        // 주사위 굴리기 시작 (모든 플레이어에게 - 관전자도 애니메이션 볼 수 있게)
        socket.on('dice_rolling_started', (data: any) => {
          console.log('[GameSocket] dice_rolling_started:', data);
          const rollingUserId = toInt(data?.userId);

          useGameStore.setState({
            isRolling: true,
            rollStage: 'HOLDING',
            rollingUserId: rollingUserId, // 누가 주사위를 굴리는지 저장
          });
        });

        // 주사위 굴림 결과 (모든 플레이어에게)
        socket.on('dice_rolled', (data: any) => {
          console.log('[GameSocket] dice_rolled:', data);

          // 먼저 SETTLING 단계로 전환하여 결과 애니메이션 표시
          useGameStore.setState({
            dice: [data.dice1, data.dice2],
            isDouble: data.isDouble,
            rollStage: 'SETTLING',
            pendingDice: [data.dice1, data.dice2],
          });

          // 잠시 후 최종 상태로 전환
          setTimeout(() => {
            useGameStore.setState((state) => ({
              hasRolledThisTurn: true,
              extraRolls: data.hasExtraTurn ? 1 : 0,
              rollStage: 'IDLE',
              isRolling: false,
              rollingUserId: null,
              pendingDice: null,
              players: state.players.map((p) => {
                if (p.userId !== toInt(data?.userId)) return p;
                return {
                  ...p,
                  position: toInt(data?.player?.location, p.position),
                  cash: toNumber(data?.player?.cash, p.cash),
                  totalAsset: data?.player?.totalAsset != null ? toNumber(data.player.totalAsset) : p.totalAsset,
                };
              }),
            }));
          }, 500);

          if (data?.turnUserId != null) {
            setState((s) => ({ ...s, currentTurnUserId: toInt(data.turnUserId) }));
          }

          // 자동 매각 이벤트 처리
          if (data.autoSellEvents && data.autoSellEvents.length > 0) {
            data.autoSellEvents.forEach((evt: any) => {
              console.log('[GameSocket] Auto-sell event:', evt);
            });
          }
        });

        // 플레이어 이동 (모든 플레이어에게)
        socket.on('playerMove', (data: any) => {
          console.log('[GameSocket] playerMove:', data);

          const playerId = toInt(data?.playerId);
          const newLocation = toInt(data?.newLocation);

          useGameStore.setState((state) => ({
            players: state.players.map((p) => (p.id === playerId ? { ...p, position: newLocation } : p)),
            phase: 'IDLE',
          }));

          // 본인 이동일 때만 액션 모달 오픈
          const myUserId = myUserIdRef.current;
          if (!myUserId) return;
          if (toInt(data?.userId) !== myUserId) return;

          const snap = useGameStore.getState();
          if (snap.activeModal) return;

          const me = snap.players.find((p) => p.userId === myUserId) ?? null;
          if (!me) return;

          const space = BOARD_DATA[newLocation];
          if (!space) return;

          if (space.type === 'COUNTRY') {
            const land = snap.lands[newLocation] ?? null;
            if (!land) {
              useGameStore.setState({ activeModal: { type: 'LAND_BUY', tileId: newLocation }, phase: 'MODAL' });
              return;
            }
            if (land.ownerId === me.id) {
              useGameStore.setState({ activeModal: { type: 'LAND_UPGRADE', tileId: newLocation }, phase: 'MODAL' });
              return;
            }

            const owner = snap.players.find((p) => p.id === land.ownerId) ?? null;
            const baseToll = snap.landTolls[newLocation] ?? 0;
            const trumpBonus = owner?.character === 'TRUMP' ? 1.05 : 1;
            const toll = applyWarMultiplier(Math.round(baseToll * trumpBonus), newLocation, true, snap.war);

            const basePrice = snap.landPrices[newLocation] ?? 0;
            const ownedPrice = applyWarMultiplier(basePrice, newLocation, true, snap.war);
            const takeoverPrice = land.type === 'LAND' ? Math.round(ownedPrice * 1.5) : undefined;

            useGameStore.setState({
              activeModal: { type: 'LAND_VISIT', tileId: newLocation, ownerId: land.ownerId, toll, takeoverPrice },
              phase: 'MODAL',
            });
            return;
          }

          if (space.type === 'STOCK') {
            const symbol = TILE_TO_STOCK[newLocation];
            if (!symbol) return;
            useGameStore.setState({
              activeModal: { type: 'ASSET_TRADE', allowedSymbols: [symbol], symbol },
              phase: 'MODAL',
            });
            return;
          }

          if (newLocation === 16) {
            useGameStore.setState({ activeModal: { type: 'WORLD_CUP' }, phase: 'MODAL' });
            return;
          }

          if (newLocation === 8) {
            useGameStore.setState({ activeModal: { type: 'WAR_SELECT', byCard: false }, phase: 'MODAL' });
            return;
          }
        });

        // 마켓 업데이트
        socket.on('market_update', (data: any) => {
          console.log('[GameSocket] market_update:', data);

          const newPrices: Partial<Record<StockSymbol, number>> = {};

          if (data?.samsung != null) newPrices.SAMSUNG = toNumber(data.samsung);
          if (data?.tesla != null) newPrices.SK_HYNIX = toNumber(data.tesla);
          if (data?.lockheed != null) newPrices.HYUNDAI = toNumber(data.lockheed);
          if (data?.gold != null) newPrices.GOLD = toNumber(data.gold);
          if (data?.bitcoin != null) newPrices.BITCOIN = toNumber(data.bitcoin);

          useGameStore.setState((state) => ({
            assetPrices: { ...state.assetPrices, ...newPrices },
          }));
        });

        // 카드 이벤트
        socket.on('drawCard', (data: any) => {
          console.log('[GameSocket] drawCard:', data);

          useGameStore.setState({
            activeModal: {
              type: 'GOLDEN_KEY',
              title: data.title || '황금열쇠',
              description: data.description || '',
            },
            phase: 'MODAL',
          });

          // 카드로 인한 현금 변동 처리
          if (data?.playerId != null && data?.cash != null) {
            useGameStore.setState((state) => ({
              players: state.players.map((p) =>
                p.id === toInt(data.playerId) ? { ...p, cash: toNumber(data.cash, p.cash) } : p
              ),
            }));
          }
        });

        // 자산 업데이트
        socket.on('asset_update', (data: any) => {
          console.log('[GameSocket] asset_update:', data);

          useGameStore.setState((state) => ({
            players: state.players.map((p) => {
              if (p.userId !== toInt(data?.userId)) return p;
              return {
                ...p,
                cash: toNumber(data?.cash, p.cash),
                totalAsset: data?.totalAsset != null ? toNumber(data.totalAsset) : p.totalAsset,
              };
            }),
          }));
          void syncMap();
        });

        // 턴 업데이트
        socket.on('turn_update', (data: any) => {
          console.log('[GameSocket] turn_update:', data);

          const currentTurnUserId = data.currentTurn;
          setState(s => ({ ...s, currentTurnUserId }));

          useGameStore.setState((state) => {
            // 현재 턴 플레이어 찾기
            const currentPlayerIndex = state.players.findIndex(p => p.id === data.turnPlayerId);

            return {
              currentPlayerIndex: currentPlayerIndex >= 0 ? currentPlayerIndex : state.currentPlayerIndex,
              round: state.round + 1,
              hasRolledThisTurn: false,
              extraRolls: 0,
              phase: 'IDLE',
              activeModal: null,
              war: parseWar(data?.war),
            };
          });
        });

        // 전쟁 상태
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
              title: '전쟁 발발!',
              description: `전쟁이 시작되었습니다. ${data.turnsLeft}턴 동안 전쟁 지역의 땅 가격이 하락합니다.`,
            },
            phase: 'MODAL',
          });
        });

        socket.on('war_end', (data: any) => {
          console.log('[GameSocket] war_end:', data);
          useGameStore.setState({ war: parseWar(data) });
        });

        socket.on('worldcup', (data: any) => {
          console.log('[GameSocket] worldcup:', data);
          const nodeIdx = toInt(data?.nodeIdx);
          if (!Number.isInteger(nodeIdx)) return;
          const name = BOARD_DATA[nodeIdx]?.name ?? `${nodeIdx}번 지역`;
          useGameStore.setState((s) => ({
            players: s.players.map((p) => ({ ...p, position: nodeIdx })),
            activeModal: {
              type: 'INFO',
              title: '월드컵 개최!',
              description: `모든 플레이어가 ${name}로 이동했습니다.`,
            },
            phase: 'MODAL',
          }));
          void syncMap();
        });

        socket.on('landmark_destroyed', (data: any) => {
          console.log('[GameSocket] landmark_destroyed:', data);
          useGameStore.setState({
            activeModal: {
              type: 'INFO',
              title: '랜드마크 파괴',
              description: '전쟁 패배로 가장 비싼 랜드마크가 파괴되었습니다.',
            },
            phase: 'MODAL',
          });
          void syncMap();
        });

        // 게임 종료
        socket.on('game_end', (data: any) => {
          console.log('[GameSocket] game_end:', data);

          const rankings = data.rankings || [];
          const winner = rankings[0];

          useGameStore.setState({
            phase: 'GAME_OVER',
            gameResult: {
              winnerId: winner?.playerId || null,
              ranking: rankings.map((r: any) => ({
                playerId: r.playerId,
                netWorth: Number(r.totalAsset),
              })),
              reason: `${data.maxTurn}턴 종료`,
              endedAtRound: data.maxTurn,
            },
          });

          store.setCurrentPage('result');
        });

        // 롤 에러
        socket.on('roll_error', (data: any) => {
          console.error('[GameSocket] roll_error:', data);
          useGameStore.setState({
            isRolling: false,
            rollStage: 'IDLE',
          });
          setState(s => ({ ...s, error: data.message || '주사위 굴리기 실패' }));
        });

        // 턴 에러
        socket.on('turn_error', (data: any) => {
          console.error('[GameSocket] turn_error:', data);
          setState(s => ({ ...s, error: data.message || '턴 종료 실패' }));
        });

        // 방 입장 (이미 로비에서 처리됨, 게임 중 재연결용)
        socket.emit('join_room', roomId);

      } catch (err: any) {
        console.error('[GameSocket] Failed to connect:', err);
        setState(s => ({ ...s, error: err?.message || '연결 실패' }));
      }
    };

    connect();

    return () => {
      alive = false;
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [roomId]);

  // 주사위 굴리기
  const rollDice = useCallback(() => {
    if (!socketRef.current) return;

    setState((s) => ({ ...s, error: null }));
    useGameStore.setState({
      isRolling: true,
      rollStage: 'HOLDING',
    });

    socketRef.current.emit('roll_dice');
  }, []);

  // 턴 종료
  const endTurn = useCallback(() => {
    if (!socketRef.current) return;
    setState((s) => ({ ...s, error: null }));
    socketRef.current.emit('end_turn');
  }, []);

  // 내 턴인지 확인
  const isMyTurn = useCallback(() => {
    return state.currentTurnUserId === state.myUserId;
  }, [state.currentTurnUserId, state.myUserId]);

  // 순서 카드 선택
  const pickOrderCard = useCallback((cardNumber: number) => {
    if (!socketRef.current) return;
    setState((s) => ({ ...s, error: null }));
    socketRef.current.emit('pick_order_card', cardNumber);
  }, []);

  return {
    socket: socketRef.current,
    ...state,
    rollDice,
    endTurn,
    isMyTurn,
    pickOrderCard,
  };
};

export default useGameSocket;
