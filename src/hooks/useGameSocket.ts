import { useEffect, useRef, useCallback } from 'react';
import { connectSocket } from '../services/socketio';
import { isAuthenticated } from '../services/auth';
import useGameStore, { type StockSymbol } from '../store/useGameStore';

type SocketLike = Awaited<ReturnType<typeof connectSocket>>;

// 백엔드 주식 심볼을 프론트엔드 심볼로 변환
const mapBackendStockSymbol = (symbol: string): StockSymbol | null => {
  const mapping: Record<string, StockSymbol> = {
    SAMSUNG: 'SAMSUNG',
    TESLA: 'SK_HYNIX', // 백엔드 TESLA -> 프론트 SK_HYNIX로 매핑 (필요시 수정)
    LOCKHEED: 'HYUNDAI', // 백엔드 LOCKHEED -> 프론트 HYUNDAI로 매핑 (필요시 수정)
    GOLD: 'GOLD',
    BITCOIN: 'BITCOIN',
  };
  return mapping[symbol] || null;
};

export const useGameSocket = (roomId: number = 1) => {
  const socketRef = useRef<SocketLike | null>(null);
  const setCurrentPage = useGameStore((s) => s.setCurrentPage);

  // 소켓 연결
  useEffect(() => {
    if (!isAuthenticated()) {
      setCurrentPage('login');
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

        // 연결 이벤트
        socket.on('connect', () => {
          console.log('[GameSocket] Connected');
          socket.emit('join_room', roomId);
        });

        socket.on('connect_error', (err: any) => {
          console.error('[GameSocket] Connection error:', err);
        });

        // 주사위 굴림 결과
        socket.on('dice_rolled', (data: any) => {
          console.log('[GameSocket] dice_rolled:', data);
          // TODO: 주사위 결과 처리
        });

        // 플레이어 이동
        socket.on('playerMove', (data: any) => {
          console.log('[GameSocket] playerMove:', data);
          // TODO: 플레이어 이동 애니메이션 처리
        });

        // 마켓 업데이트
        socket.on('market_update', (data: any) => {
          console.log('[GameSocket] market_update:', data);
          const store = useGameStore.getState();
          if (data.prices) {
            // 백엔드 가격을 프론트엔드 형식으로 변환
            const newPrices: Partial<Record<StockSymbol, number>> = {};
            Object.entries(data.prices).forEach(([key, value]) => {
              const frontendSymbol = mapBackendStockSymbol(key.toUpperCase());
              if (frontendSymbol) {
                newPrices[frontendSymbol] = Number(value);
              }
            });
            store.setAssetPrices(newPrices);
          }
        });

        // 카드 이벤트
        socket.on('drawCard', (data: any) => {
          console.log('[GameSocket] drawCard:', data);
          const store = useGameStore.getState();
          store.showModal({
            type: 'GOLDEN_KEY',
            title: data.title || '황금열쇠',
            description: data.description || data.message || '',
          });
        });

        // 전쟁 상태 변경
        socket.on('war_state', (data: any) => {
          console.log('[GameSocket] war_state:', data);
        });

        socket.on('war_start', (data: any) => {
          console.log('[GameSocket] war_start:', data);
        });

        socket.on('war_end', (data: any) => {
          console.log('[GameSocket] war_end:', data);
        });

        // 자산 업데이트
        socket.on('asset_update', (data: any) => {
          console.log('[GameSocket] asset_update:', data);
          // TODO: 플레이어 자산 업데이트
        });

        // 턴 업데이트
        socket.on('turn_update', (data: any) => {
          console.log('[GameSocket] turn_update:', data);
          // TODO: 턴 변경 처리
        });

        // 게임 종료
        socket.on('game_end', (data: any) => {
          console.log('[GameSocket] game_end:', data);
          setCurrentPage('result');
        });

      } catch (err) {
        console.error('[GameSocket] Failed to connect:', err);
      }
    };

    connect();

    return () => {
      alive = false;
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [roomId, setCurrentPage]);

  // 주사위 굴리기
  const rollDice = useCallback(() => {
    socketRef.current?.emit('roll_dice');
  }, []);

  // 턴 종료
  const endTurn = useCallback(() => {
    socketRef.current?.emit('end_turn');
  }, []);

  return {
    socket: socketRef.current,
    rollDice,
    endTurn,
  };
};

export default useGameSocket;
