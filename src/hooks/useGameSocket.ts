import { useEffect, useRef, useCallback, useState } from 'react';
import { connectSocket } from '../services/socketio';
import { isAuthenticated } from '../services/auth';
import { fromBackendCharacter } from '../utils/characterMapping';
import useGameStore, { type StockSymbol, type CharacterType, type Player, type LandState } from '../store/useGameStore';

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
  const charInfo = character ? useGameStore.getState().players.find(pl => pl.character === character) : null;

  return {
    id: p.playerId || p.id,
    name: p.nickname || `Player ${p.userId}`,
    avatar: character ? `/assets/characters/${character.toLowerCase()}.png` : '/assets/characters/default.png',
    character,
    position: typeof p.location === 'number' ? p.location : 0,
    cash: Number(p.cash) || 3000000,
    isReady: true,
    isBankrupt: p.isBankrupt || false,
    stockHoldings: {},
    tollRateMultiplier: character === 'TRUMP' ? 1.05 : 1.0,
    warWinChanceBonus: character === 'PUTIN' ? 0.1 : 0,
  };
};

export type GameSocketState = {
  connected: boolean;
  error: string | null;
  currentTurnUserId: number | null;
  myUserId: number | null;
  roomId: number | null;
};

export const useGameSocket = (roomId: number = 1) => {
  const socketRef = useRef<SocketLike | null>(null);
  const [state, setState] = useState<GameSocketState>({
    connected: false,
    error: null,
    currentTurnUserId: null,
    myUserId: null,
    roomId: null,
  });

  const store = useGameStore.getState();

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

        // 연결 성공
        socket.on('connect', () => {
          console.log('[GameSocket] Connected');
          setState(s => ({ ...s, connected: true, error: null }));
        });

        socket.on('connect_error', (err: any) => {
          console.error('[GameSocket] Connection error:', err);
          setState(s => ({ ...s, connected: false, error: '서버 연결 실패' }));
        });

        // 게임 시작 이벤트
        socket.on('game_start', (data: any) => {
          console.log('[GameSocket] game_start:', data);

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
        });

        // 주사위 굴림 결과 (본인에게만)
        socket.on('dice_rolled', (data: any) => {
          console.log('[GameSocket] dice_rolled:', data);

          useGameStore.setState({
            dice: [data.dice1, data.dice2],
            isDouble: data.isDouble,
            hasRolledThisTurn: true,
            extraRolls: data.hasExtraTurn ? 1 : 0,
            rollStage: 'IDLE',
            isRolling: false,
          });

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

          const { userId, playerId, oldLocation, newLocation, passedStart } = data;

          useGameStore.setState((state) => {
            const players = state.players.map(p => {
              if (p.id === playerId) {
                let newCash = p.cash;
                if (passedStart) {
                  newCash += 200000; // 시작점 통과 보너스
                }
                return { ...p, position: newLocation, cash: newCash };
              }
              return p;
            });
            return { players, phase: 'IDLE' };
          });
        });

        // 마켓 업데이트
        socket.on('market_update', (data: any) => {
          console.log('[GameSocket] market_update:', data);

          const newPrices: Partial<Record<StockSymbol, number>> = {};

          if (data.samsung) newPrices.SAMSUNG = Number(data.samsung);
          if (data.tesla) newPrices.SK_HYNIX = Number(data.tesla);
          if (data.lockheed) newPrices.HYUNDAI = Number(data.lockheed);
          if (data.gold) newPrices.GOLD = Number(data.gold);
          if (data.bitcoin) newPrices.BITCOIN = Number(data.bitcoin);

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
          if (data.amount && data.playerId) {
            useGameStore.setState((state) => ({
              players: state.players.map(p =>
                p.id === data.playerId
                  ? { ...p, cash: Number(data.cash) || p.cash }
                  : p
              ),
            }));
          }
        });

        // 자산 업데이트
        socket.on('asset_update', (data: any) => {
          console.log('[GameSocket] asset_update:', data);

          useGameStore.setState((state) => ({
            players: state.players.map(p => {
              // playerId나 oderId로 매칭
              const playerData = state.players.find(pl => pl.id === data.playerId);
              if (playerData) {
                return {
                  ...playerData,
                  cash: Number(data.cash) || playerData.cash,
                };
              }
              return p;
            }),
          }));
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
            };
          });
        });

        // 전쟁 상태
        socket.on('war_state', (data: any) => {
          console.log('[GameSocket] war_state:', data);
          // TODO: 전쟁 상태 UI 업데이트
        });

        socket.on('war_start', (data: any) => {
          console.log('[GameSocket] war_start:', data);
          useGameStore.setState({
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

    useGameStore.setState({
      isRolling: true,
      rollStage: 'HOLDING',
    });

    socketRef.current.emit('roll_dice');
  }, []);

  // 턴 종료
  const endTurn = useCallback(() => {
    if (!socketRef.current) return;
    socketRef.current.emit('end_turn');
  }, []);

  // 내 턴인지 확인
  const isMyTurn = useCallback(() => {
    return state.currentTurnUserId === state.myUserId;
  }, [state.currentTurnUserId, state.myUserId]);

  return {
    socket: socketRef.current,
    ...state,
    rollDice,
    endTurn,
    isMyTurn,
  };
};

export default useGameSocket;
