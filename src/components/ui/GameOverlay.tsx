import { useEffect, useMemo, useRef, useState } from 'react';
import useGameStore, {
  CHARACTER_BATTLE_AVATAR,
  CHARACTER_INFO,
  CHARACTER_WORLDCUP_AVATAR,
  STOCK_INFO,
  type StockSymbol,
} from '../../store/useGameStore';
import { BOARD_DATA } from '../../utils/boardUtils';
import AssetDetailModal from '../game/AssetDetailModal';
import InitialSurvival from '../minigames/InitialSurvival'; // [Initial Survival] 미니게임 컴포넌트 추가
import BoardRing from '../game/BoardRing';
import DiceRoller from '../game/DiceRoller';
import GameLayout from '../game/GameLayout';
import MarketPanel from '../game/MarketPanel';
import PlayerPanel from '../game/PlayerPanel';
import TurnControls from '../game/TurnControls';
import { formatKRWKo } from '../../utils/formatKRW';
import { apiGetMap, apiGetWarRate, apiPurchaseLand, apiSpaceMove, apiTradeStock, apiWarLose, apiWorldCup } from '../../services/api';
import { toBackendStockSymbol } from '../../utils/stockMapping';
import { applyWarMultiplier } from '../../utils/warMultiplier';

const STOCK_SYMBOLS: StockSymbol[] = ['SAMSUNG', 'LOCKHEED', 'TESLA', 'BITCOIN', 'GOLD'];
const WAR_FIGHT_DURATION_MS = 2600;
const getBattleAvatar = (character: string | null | undefined, fallback: string) => {
  if (character && character in CHARACTER_BATTLE_AVATAR) {
    return CHARACTER_BATTLE_AVATAR[character as keyof typeof CHARACTER_BATTLE_AVATAR];
  }
  return fallback || '/assets/characters/default.png';
};

const computeLandValue = (tileId: number, landType: 'LAND' | 'LANDMARK', price: number) => {
  const mult = landType === 'LANDMARK' ? 1.8 : 1.0;
  return Math.round(price * mult);
};

type PriceChange = { prev: number; current: number; delta: number; pct: number };

const GameOverlay = () => {
  const players = useGameStore((state) => state.players);
  const currentPlayerIndex = useGameStore((state) => state.currentPlayerIndex);

  const lands = useGameStore((state) => state.lands);
  const landPrices = useGameStore((state) => state.landPrices);
  const war = useGameStore((state) => state.war);
  const assetPrices = useGameStore((state) => state.assetPrices);

  const activeModal = useGameStore((state) => state.activeModal);
  const closeModal = useGameStore((state) => state.closeModal);
  const queuedModal = useGameStore((state) => state.queuedModal);
  const modalData = useGameStore((state) => state.modalData);
  const rollStage = useGameStore((state) => state.rollStage);
  const isRolling = useGameStore((state) => state.isRolling);

  const setTradeSymbol = useGameStore((state) => state.setTradeSymbol);

  const [apiLoading, setApiLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const fightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshMap = async () => {
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

    useGameStore.setState({ landPrices: nextLandPrices, landTolls: nextLandTolls, lands: nextLands });
  };

  // 백엔드 API를 호출하는 래퍼 함수들
  const buyLand = async () => {
    if (!activeModal || activeModal.type !== 'LAND_BUY') return;
    setApiLoading(true);
    setApiError(null);
    try {
      const result = await apiPurchaseLand('BUY', activeModal.tileId);
      useGameStore.setState((state) => ({
        players: state.players.map((p) => (p.id === result.playerId ? { ...p, cash: Number(result.cash) } : p)),
      }));
      await refreshMap();
      closeModal();
    } catch (e: any) {
      setApiError(e.message || '구매 실패');
    } finally {
      setApiLoading(false);
    }
  };

  const buildLandmark = async () => {
    if (!activeModal || activeModal.type !== 'LAND_UPGRADE') return;
    setApiLoading(true);
    setApiError(null);
    try {
      const tileId = currentPlayer?.position ?? activeModal.tileId;
      const result = await apiPurchaseLand('LANDMARK', tileId);
      useGameStore.setState((state) => ({
        players: state.players.map((p) => (p.id === result.playerId ? { ...p, cash: Number(result.cash) } : p)),
      }));
      await refreshMap();
      closeModal();
    } catch (e: any) {
      setApiError(e.message || '랜드마크 건설 실패');
    } finally {
      setApiLoading(false);
    }
  };

  const sellLand = async () => {
    if (!activeModal || activeModal.type !== 'LAND_UPGRADE') return;
    setApiLoading(true);
    setApiError(null);
    try {
      const tileId = currentPlayer?.position ?? activeModal.tileId;
      const result = await apiPurchaseLand('SELL', tileId);
      useGameStore.setState((state) => ({
        players: state.players.map((p) => (p.id === result.playerId ? { ...p, cash: Number(result.cash) } : p)),
      }));
      await refreshMap();
      closeModal();
    } catch (e: any) {
      setApiError(e.message || '매각 실패');
    } finally {
      setApiLoading(false);
    }
  };

  const takeoverLand = async () => {
    if (!activeModal || activeModal.type !== 'LAND_VISIT') return;
    setApiLoading(true);
    setApiError(null);
    try {
      const result = await apiPurchaseLand('TAKEOVER', activeModal.tileId);
      useGameStore.setState((state) => ({
        players: state.players.map((p) => (p.id === result.playerId ? { ...p, cash: Number(result.cash) } : p)),
      }));
      await refreshMap();
      closeModal();
    } catch (e: any) {
      setApiError(e.message || '인수 실패');
    } finally {
      setApiLoading(false);
    }
  };

  const hostWorldCup = async (nodeIdx: number) => {
    if (!activeModal || activeModal.type !== 'WORLD_CUP') return;
    setApiLoading(true);
    setApiError(null);
    try {
      await apiWorldCup(nodeIdx);
      closeModal();
    } catch (e: any) {
      setApiError(e.message || '월드컵 개최 실패');
    } finally {
      setApiLoading(false);
    }
  };

  const spaceMove = async (nodeIdx: number) => {
    if (!activeModal || activeModal.type !== 'SPACE_TRAVEL') return;
    setApiLoading(true);
    setApiError(null);
    try {
      await apiSpaceMove(nodeIdx);
      // 모달은 playerMove 소켓 이벤트에서 처리됨 (새 위치의 모달로 전환)
    } catch (e: any) {
      setApiError(e.message || '이동 실패');
    } finally {
      setApiLoading(false);
    }
  };

  const buyAsset = async (quantity: number) => {
    if (!activeModal || activeModal.type !== 'ASSET_TRADE') return;
    setApiLoading(true);
    setApiError(null);
    try {
      const backendSymbol = toBackendStockSymbol(activeModal.symbol);
      const result = await apiTradeStock(backendSymbol, quantity, 'BUY');
      useGameStore.setState((state) => ({
        players: state.players.map((p) =>
          p.id === result.playerId
            ? {
                ...p,
                cash: Number(result.cash),
                stockHoldings: {
                  SAMSUNG: result.assets.samsung,
                  LOCKHEED: result.assets.lockheed,
                  TESLA: result.assets.tesla,
                  GOLD: result.assets.gold,
                  BITCOIN: result.assets.bitcoin,
                },
              }
            : p
        ),
      }));
      closeModal();
    } catch (e: any) {
      setApiError(e.message || '매수 실패');
    } finally {
      setApiLoading(false);
    }
  };

  const sellAsset = async (quantity: number) => {
    if (!activeModal || activeModal.type !== 'ASSET_TRADE') return;
    setApiLoading(true);
    setApiError(null);
    try {
      const backendSymbol = toBackendStockSymbol(activeModal.symbol);
      const result = await apiTradeStock(backendSymbol, quantity, 'SELL');
      useGameStore.setState((state) => ({
        players: state.players.map((p) =>
          p.id === result.playerId
            ? {
                ...p,
                cash: Number(result.cash),
                stockHoldings: {
                  SAMSUNG: result.assets.samsung,
                  LOCKHEED: result.assets.lockheed,
                  TESLA: result.assets.tesla,
                  GOLD: result.assets.gold,
                  BITCOIN: result.assets.bitcoin,
                },
              }
            : p
        ),
      }));
      closeModal();
    } catch (e: any) {
      setApiError(e.message || '매도 실패');
    } finally {
      setApiLoading(false);
    }
  };

  const completeMinigame = useGameStore((state) => state.completeMinigame);
  const confirmTax = useGameStore((state) => state.confirmTax);

  const currentPlayer = players[currentPlayerIndex] ?? null;

  const startWar = async (opponentUserId: number, opponentName: string) => {
    if (!currentPlayer) return;
    setApiLoading(true);
    setApiError(null);
    try {
      const rate = await apiGetWarRate(opponentUserId);
      if (!rate) throw new Error('승률 정보를 불러올 수 없어요.');

      const roll = Math.random() * 100;
      const iWin = roll < rate.winRate;
      const myUserId = currentPlayer.userId;
      const loserUserId = iWin ? opponentUserId : myUserId;

      if (loserUserId) {
        await apiWarLose(loserUserId);
        await refreshMap();
      }

      const opponent = players.find((p) => p.userId === opponentUserId) ?? null;
      const attackerAvatar = getBattleAvatar(currentPlayer.character, currentPlayer.avatar);
      const defenderAvatar = getBattleAvatar(opponent?.character ?? null, opponent?.avatar || '/assets/characters/default.png');

      useGameStore.setState({
        activeModal: {
          type: 'WAR_FIGHT',
          attackerName: currentPlayer.name,
          attackerAvatar,
          defenderName: opponentName,
          defenderAvatar,
          durationMs: WAR_FIGHT_DURATION_MS,
        },
        queuedModal: {
          type: 'WAR_RESULT',
          title: iWin ? '승리!' : '패배...',
          description: `${currentPlayer.name} vs ${opponentName} · 승률 ${rate.winRate.toFixed(1)}%`,
        },
        phase: 'MODAL',
      });
    } catch (e: any) {
      setApiError(e?.message || '전쟁 처리에 실패했어요.');
    } finally {
      setApiLoading(false);
    }
  };

  const [selectedAsset, setSelectedAsset] = useState<number | null>(null);

  const prevAssetPricesRef = useRef(assetPrices);
  const prevLandPricesRef = useRef(landPrices);
  const [assetChange, setAssetChange] = useState<Partial<Record<StockSymbol, PriceChange>>>({});
  const [landChange, setLandChange] = useState<Record<number, PriceChange>>({});

  const [tradeQty, setTradeQty] = useState(1);
  const [minigameSecret, setMinigameSecret] = useState<number | null>(null);
  const [minigameGuess, setMinigameGuess] = useState<number | null>(null);

  useEffect(() => {
    if (activeModal) setSelectedAsset(null);
  }, [activeModal]);

  useEffect(() => {
    if (selectedAsset === null) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedAsset(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedAsset]);

  useEffect(() => {
    const prev = prevAssetPricesRef.current;
    const next: Partial<Record<StockSymbol, PriceChange>> = {};
    STOCK_SYMBOLS.forEach((symbol) => {
      const current = assetPrices[symbol];
      const previous = prev[symbol] ?? current;
      const delta = current - previous;
      const pct = previous ? (delta / previous) * 100 : 0;
      next[symbol] = { prev: previous, current, delta, pct };
    });
    setAssetChange(next);
    prevAssetPricesRef.current = { ...assetPrices };
  }, [assetPrices]);

  useEffect(() => {
    const prev = prevLandPricesRef.current;
    const next: Record<number, PriceChange> = {};
    Object.entries(landPrices).forEach(([id, price]) => {
      const tileId = Number(id);
      const previous = prev[tileId] ?? price;
      const delta = price - previous;
      const pct = previous ? (delta / previous) * 100 : 0;
      next[tileId] = { prev: previous, current: price, delta, pct };
    });
    setLandChange(next);
    prevLandPricesRef.current = { ...landPrices };
  }, [landPrices]);

  useEffect(() => {
    if (!activeModal) return;
    if (activeModal.type === 'ASSET_TRADE') setTradeQty(1);
    if (activeModal.type === 'MINIGAME') {
      setMinigameSecret(Math.floor(Math.random() * 6) + 1);
      setMinigameGuess(null);
    }
  }, [activeModal]);

  useEffect(() => {
    if (!activeModal || activeModal.type !== 'WAR_FIGHT') return;
    if (fightTimeoutRef.current) {
      clearTimeout(fightTimeoutRef.current);
    }
    const delay = activeModal.durationMs ?? WAR_FIGHT_DURATION_MS;
    fightTimeoutRef.current = setTimeout(() => {
      closeModal();
    }, delay);
    return () => {
      if (fightTimeoutRef.current) {
        clearTimeout(fightTimeoutRef.current);
        fightTimeoutRef.current = null;
      }
    };
  }, [activeModal, closeModal]);

  const canDismiss = useMemo(() => {
    if (!activeModal) return false;
    return [
      'INFO',
      'GOLDEN_KEY',
      'WAR_RESULT',
      'ASSET_TRADE',
      'LAND_BUY',
      'LAND_UPGRADE',
      'LAND_VISIT',
      'WORLD_CUP',
      'MINIGAME',
    ].includes(activeModal.type);
  }, [activeModal]);

  useEffect(() => {
    if (!activeModal || !canDismiss) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeModal, canDismiss, closeModal]);

  return (
    <div className="dash-page">
      <GameLayout
        left={<PlayerPanel />}
        center={
          <div className={isRolling ? 'board-shake-y' : ''}>
            <BoardRing
              selectedAssetId={selectedAsset}
              onSelectAsset={(tileId) => setSelectedAsset(tileId)}
              assetChange={assetChange}
              landChange={landChange}
              center={
                <div className={`board-center ${rollStage !== 'IDLE' ? 'board-center-rolling' : ''}`}>
                  <DiceRoller />
                  <TurnControls />
                </div>
              }
            />
          </div>
        }
        right={<MarketPanel />}
      />

      {selectedAsset !== null && !activeModal && (
        <AssetDetailModal
          tileId={selectedAsset}
          onClose={() => setSelectedAsset(null)}
          assetChange={assetChange}
          landChange={landChange}
        />
      )}

      {/* Modals */}
      {activeModal && (
        <>
          <button
            type="button"
            className="ui-modal-backdrop"
            onClick={() => {
              if (!canDismiss) return;
              closeModal();
            }}
            aria-label="모달 닫기"
          />

          <div
            role="dialog"
            aria-modal="true"
            className={`ui-modal${activeModal.type === 'SPACE_TRAVEL' ? ' ui-modal-wide' : ''}${activeModal.type === 'WAR_FIGHT' ? ' ui-modal-war' : ''}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* LAND BUY */}
            {activeModal.type === 'LAND_BUY' && (() => {
              const tileId = activeModal.tileId;
              const space = BOARD_DATA[tileId];
              const price = landPrices[tileId] ?? space?.price ?? 0;
              return (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-black text-white">🏠 토지 구매</h2>
                      <p className="mt-1 text-2xl font-black text-white">{space?.name ?? '—'}</p>
                    </div>
                    <button type="button" className="ui-icon-btn" onClick={closeModal} aria-label="닫기">
                      ✕
                    </button>
                  </div>

                  <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.04] p-4">
                    <p className="text-sm text-white/60">가격</p>
                    <p className="mt-1 text-lg font-black text-white">{formatKRWKo(price)}</p>
                  </div>

                  {space?.description && (
                    <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.04] p-4">
                      <p className="text-sm text-white/60">설명</p>
                      <p className="mt-1 text-sm font-medium leading-relaxed text-white/80">{space.description}</p>
                    </div>
                  )}

                  {apiError && (
                    <div className="mt-3 rounded-xl border border-red-400/20 bg-red-500/[0.10] p-3 text-sm text-red-100">
                      {apiError}
                    </div>
                  )}

                  <div className="mt-6 flex gap-3">
                    <button onClick={() => void buyLand()} disabled={apiLoading} className="dash-action dash-action-success flex-1 disabled:opacity-50">
                      {apiLoading ? '처리 중...' : '구매하기'}
                    </button>
                    <button onClick={closeModal} disabled={apiLoading} className="dash-action dash-action-secondary flex-1 disabled:opacity-50">
                      취소
                    </button>
                  </div>
                </>
              );
            })()}

            {/* LAND UPGRADE */}
            {activeModal.type === 'LAND_UPGRADE' && (() => {
              const tileId = activeModal.tileId;
              const space = BOARD_DATA[tileId];
              const basePrice = landPrices[tileId] ?? space?.price ?? 0;
              const ownedPrice = applyWarMultiplier(basePrice, tileId, true, war);
              const cost = Math.round((ownedPrice * 2) / 5);
              return (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-black text-white">🏙️ 랜드마크 건설</h2>
                      <p className="mt-1 text-2xl font-black text-white">{space?.name ?? '—'}</p>
                    </div>
                    <button type="button" className="ui-icon-btn" onClick={closeModal} aria-label="닫기">
                      ✕
                    </button>
                  </div>
                  <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.04] p-4">
                    <p className="text-sm text-white/60">건설 비용</p>
                    <p className="mt-1 text-lg font-black text-white">{formatKRWKo(cost)}</p>
                  </div>
                  {apiError && (
                    <div className="mt-3 rounded-xl border border-red-400/20 bg-red-500/[0.10] p-3 text-sm text-red-100">
                      {apiError}
                    </div>
                  )}

                  <div className="mt-6 flex gap-3">
                    <button
                      onClick={() => void buildLandmark()}
                      disabled={apiLoading}
                      className="dash-action dash-action-primary flex-1 disabled:opacity-50"
                    >
                      {apiLoading ? '처리 중...' : '건설하기'}
                    </button>
                    <button
                      onClick={() => void sellLand()}
                      disabled={apiLoading}
                      className="dash-action dash-action-danger flex-1 disabled:opacity-50"
                    >
                      매각
                    </button>
                    <button onClick={closeModal} disabled={apiLoading} className="dash-action dash-action-secondary flex-1 disabled:opacity-50">
                      닫기
                    </button>
                  </div>
                </>
              );
            })()}

            {/* WORLD CUP */}
            {activeModal.type === 'WORLD_CUP' && (() => {
              const WORLD_CUP_COST = 800000;
              const ownedTiles = currentPlayer
                ? Object.entries(lands)
                  .filter(([, land]) => land.ownerId === currentPlayer.id)
                  .map(([tileId]) => Number(tileId))
                  .sort((a, b) => (landPrices[b] ?? 0) - (landPrices[a] ?? 0))
                : [];

              return (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-black text-white">⚽ 월드컵 개최</h2>
                      <p className="mt-1 text-sm text-white/70">내가 소유한 땅 1곳을 선택하면 모든 플레이어가 이동합니다.</p>
                    </div>
                    <button type="button" className="ui-icon-btn" onClick={closeModal} aria-label="닫기">
                      ✕
                    </button>
                  </div>

                  {currentPlayer?.character && (
                    <div className="mt-4">
                      <img
                        src={CHARACTER_WORLDCUP_AVATAR[currentPlayer.character]}
                        alt={`${CHARACTER_INFO[currentPlayer.character].name} 월드컵`}
                        className="mx-auto w-full max-w-md rounded-2xl border border-white/10 shadow-lg"
                      />
                    </div>
                  )}

                  <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.04] p-4">
                    <p className="text-sm text-white/60">개최 비용</p>
                    <p className="mt-1 text-lg font-black text-white">{formatKRWKo(WORLD_CUP_COST)}</p>
                  </div>

                  {ownedTiles.length === 0 ? (
                    <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.04] p-4 text-sm text-white/70">
                      소유한 땅이 없습니다.
                    </div>
                  ) : (
                    <div className="mt-4 max-h-56 space-y-2 overflow-auto">
                      {ownedTiles.map((tileId) => {
                        const space = BOARD_DATA[tileId];
                        const land = lands[tileId];
                        const label = space?.name ?? `타일 ${tileId}`;
                        return (
                          <button
                            key={tileId}
                            type="button"
                            disabled={apiLoading}
                            onClick={() => void hostWorldCup(tileId)}
                            className="dash-action dash-action-secondary w-full justify-between px-4 py-3 text-left font-black disabled:opacity-50"
                          >
                            <span className="truncate">{label}</span>
                            <span className="text-xs text-white/60">{land?.type === 'LANDMARK' ? '랜드마크' : '토지'}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {apiError && (
                    <div className="mt-3 rounded-xl border border-red-400/20 bg-red-500/[0.10] p-3 text-sm text-red-100">
                      {apiError}
                    </div>
                  )}

                  <div className="mt-6 flex gap-3">
                    <button onClick={closeModal} disabled={apiLoading} className="dash-action dash-action-secondary flex-1 disabled:opacity-50">
                      닫기
                    </button>
                  </div>
                </>
              );
            })()}

            {/* SPACE TRAVEL */}
            {activeModal.type === 'SPACE_TRAVEL' && (() => {
              const destinations = BOARD_DATA.filter((space) => space.name !== '우주여행');
              return (
                <>
                  <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 shadow-2xl lg:flex-row">
                    <div className="flex items-center justify-center">
                      <img
                        src="/assets/characters/dogecoin.png"
                        alt="도지코인 우주여행"
                        className="h-48 w-48 rounded-3xl border border-white/20 object-cover shadow-[0_25px_60px_rgba(249,115,22,0.45)]"
                      />
                    </div>

                    <div className="flex-1 space-y-4">
                      <div>
                        <h2 className="text-xl font-black text-white">🚀 우주여행</h2>
                        <p className="mt-1 text-sm text-white/70">다음 턴에 이동할 위치를 선택하세요.</p>
                      </div>

                      <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 text-sm text-white/70">
                        선택한 위치로 다음 턴 시작 시 이동합니다.
                      </div>

                      <div className="grid grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
                        {destinations.map((space) => (
                          <button
                            key={space.id}
                            type="button"
                            disabled={apiLoading}
                            onClick={() => void spaceMove(space.id)}
                            className="dash-action dash-action-secondary w-full justify-between px-3 py-2 text-left text-sm font-black disabled:opacity-50"
                          >
                            <span className="truncate">{space.name}</span>
                            <span className="text-[10px] text-white/60">{space.type}</span>
                          </button>
                        ))}
                      </div>

                      {apiError && (
                        <div className="rounded-xl border border-red-400/20 bg-red-500/[0.10] p-3 text-sm text-red-100">
                          {apiError}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              );
            })()}

            {/* LAND VISIT */}
            {activeModal.type === 'LAND_VISIT' && (() => {
              const tileId = activeModal.tileId;
              const space = BOARD_DATA[tileId];
              const owner = players.find((p) => p.id === activeModal.ownerId) ?? null;
              const takeoverPrice = activeModal.takeoverPrice;
              const tollAlreadyPaid = modalData?.tollAlreadyPaid === true;
              const beforeCash = modalData?.beforeCash as number | undefined;
              const afterCash = modalData?.afterCash as number | undefined;
              return (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-black text-white">🧾 통행료 {tollAlreadyPaid ? '지불 완료' : ''}</h2>
                      <p className="mt-1 text-2xl font-black text-white">{space?.name ?? '—'}</p>
                      <p className="mt-1 flex items-center gap-2 text-sm text-white/70">
                        <span>소유자:</span>
                        <img
                          src={owner?.avatar || '/assets/characters/default.png'}
                          alt={owner?.name ?? '소유자'}
                          className="h-5 w-5 rounded-full object-cover ring-2 ring-white/20"
                        />
                        <span>{owner?.name ?? '—'}</span>
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3">
                    <div className={`rounded-xl border p-4 ${tollAlreadyPaid ? 'border-emerald-400/30 bg-emerald-500/10' : 'border-white/10 bg-white/[0.04]'}`}>
                      <p className="text-sm text-white/60">{tollAlreadyPaid ? '지불한 통행료' : '통행료'}</p>
                      <p className="mt-1 text-lg font-black text-white">{formatKRWKo(activeModal.toll)}</p>
                      {tollAlreadyPaid && (
                        <p className="mt-1 text-xs text-emerald-300">✓ 자동으로 지불되었습니다</p>
                      )}
                    </div>

                    {/* 잔액 변동 내역 */}
                    {tollAlreadyPaid && beforeCash != null && afterCash != null && (
                      <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                        <p className="text-sm text-white/60">잔액 변동</p>
                        <div className="mt-2 flex items-center gap-2 text-sm">
                          <span className="text-white/70">지불 전:</span>
                          <span className="font-bold text-white">{formatKRWKo(beforeCash)}</span>
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-sm">
                          <span className="text-white/70">통행료:</span>
                          <span className="font-bold text-red-400">-{formatKRWKo(activeModal.toll)}</span>
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-sm border-t border-white/10 pt-2">
                          <span className="text-white/70">지불 후:</span>
                          <span className="font-bold text-emerald-300">{formatKRWKo(afterCash)}</span>
                        </div>
                      </div>
                    )}

                    {takeoverPrice && (
                      <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-4">
                        <p className="text-sm text-white/60">인수 비용 (150%)</p>
                        <p className="mt-1 text-lg font-black text-white">{formatKRWKo(takeoverPrice)}</p>
                        <p className="mt-1 text-xs text-amber-200">이 땅을 인수할 수 있습니다</p>
                      </div>
                    )}
                  </div>

                  {apiError && (
                    <div className="mt-3 rounded-xl border border-red-400/20 bg-red-500/[0.10] p-3 text-sm text-red-100">
                      {apiError}
                    </div>
                  )}

                  <div className="mt-6 flex gap-3">
                    {takeoverPrice && (
                      <button
                        onClick={() => void takeoverLand()}
                        disabled={apiLoading}
                        className="dash-action dash-action-primary flex-1 disabled:opacity-50"
                      >
                        {apiLoading ? '처리 중...' : '인수하기'}
                      </button>
                    )}
                    <button onClick={closeModal} disabled={apiLoading} className="dash-action dash-action-secondary flex-1 disabled:opacity-50">
                      확인
                    </button>
                  </div>
                </>
              );
            })()}

            {/* ASSET TRADE */}
            {activeModal.type === 'ASSET_TRADE' && (() => {
              const symbol = activeModal.symbol;
              const info = STOCK_INFO[symbol];
              const currentPrice = assetPrices[symbol];
              const holding = currentPlayer?.stockHoldings[symbol] ?? 0;
              const totalCost = currentPrice * tradeQty;
              const canBuyNow = (currentPlayer?.cash ?? 0) >= totalCost;
              const canSellNow = holding >= tradeQty;
              return (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-black text-white">📈 자산 거래</h2>
                      <p className="mt-1 text-2xl font-black text-white">{info.nameKr}</p>
                      <p className="text-sm text-white/60">{info.name}</p>
                    </div>
                    <button type="button" className="ui-icon-btn" onClick={closeModal} aria-label="닫기">
                      ✕
                    </button>
                  </div>

                  {activeModal.allowedSymbols.length > 1 && (
                    <div className="mt-4 flex gap-2">
                      {activeModal.allowedSymbols.map((sym) => (
                        <button
                          key={sym}
                          type="button"
                          onClick={() => setTradeSymbol(sym)}
                          className={`dash-action ${sym === symbol ? 'dash-action-primary' : 'dash-action-secondary'
                            }`}
                        >
                          {STOCK_INFO[sym].nameKr}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="mt-5 space-y-3">
                    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                      <p className="text-sm text-white/60">현재 시세</p>
                      <p className="mt-1 text-lg font-black text-white">{formatKRWKo(currentPrice)}</p>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                      <p className="text-sm text-white/60">보유 수량</p>
                      <p className="mt-1 text-lg font-black text-white">{holding}개</p>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                      <p className="mb-2 text-sm text-white/60">거래 수량</p>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          className="dash-action dash-action-secondary h-10 w-10 p-0 text-lg font-black"
                          onClick={() => setTradeQty(Math.max(1, tradeQty - 1))}
                        >
                          -
                        </button>
                        <span className="min-w-[60px] text-center text-xl font-black text-white">{tradeQty}개</span>
                        <button
                          type="button"
                          className="dash-action dash-action-secondary h-10 w-10 p-0 text-lg font-black"
                          onClick={() => setTradeQty(tradeQty + 1)}
                        >
                          +
                        </button>
                      </div>
                      <p className="mt-2 text-sm text-white/60">
                        총액: <span className="font-black text-white">{formatKRWKo(totalCost)}</span>
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 flex gap-3">
                    <button
                      onClick={() => buyAsset(tradeQty)}
                      className={`dash-action flex-1 ${canBuyNow ? 'dash-action-success' : 'dash-action-secondary'}`}
                      disabled={!canBuyNow}
                    >
                      매수
                    </button>
                    <button
                      onClick={() => sellAsset(tradeQty)}
                      className={`dash-action flex-1 ${canSellNow ? 'dash-action-danger' : 'dash-action-secondary'}`}
                      disabled={!canSellNow}
                    >
                      매도
                    </button>
                    <button onClick={closeModal} className="dash-action dash-action-secondary flex-1">
                      닫기
                    </button>
                  </div>
                </>
              );
            })()}

            {/* MINIGAME (Legacy) */}
            {activeModal.type === 'MINIGAME' && (() => {
              const salary = activeModal.salary;
              const secret = minigameSecret ?? 1;
              const guessed = minigameGuess;
              return (
                <>
                  {/* ... Legacy Number Guessing Game if needed, or remove. 
                      Task says "Initial Survival" triggers when landing.
                      Let's replace or add new type.
                      Plan said: { type: 'INITIAL_GAME' } mod.
                   */}
                  {/* ... keeping legacy just in case, but handling INITIAL_GAME below */}
                </>
              );
            })()}

            {/* [Initial Survival] 미니게임 렌더링 블록 시작 */}
            {activeModal.type === 'INITIAL_GAME' && (
              <>
                <div className="flex items-start justify-end w-full mb-4">
                  <button type="button" className="ui-icon-btn bg-black/20 hover:bg-black/40" onClick={closeModal} aria-label="닫기">
                    ✕
                  </button>
                </div>
                <div className="w-full relative min-h-[400px]">
                  <InitialSurvival />
                </div>
              </>
            )}
            {/* [Initial Survival] 미니게임 렌더링 블록 끝 */}


            {/* GOLDEN KEY */}
            {activeModal.type === 'GOLDEN_KEY' && (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-black text-white">🔑 황금열쇠</h2>
                    <p className="mt-1 text-2xl font-black text-white">{activeModal.title}</p>
                  </div>
                  <button type="button" className="ui-icon-btn" onClick={closeModal} aria-label="닫기">
                    ✕
                  </button>
                </div>
                <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-sm text-white/70">{activeModal.description}</p>
                  {queuedModal?.type === 'WAR_SELECT' && (
                    <p className="mt-2 text-xs text-white/70">확인 후 전쟁 선포를 진행할 수 있어요.</p>
                  )}
                </div>
                <div className="mt-6 flex gap-3">
                  <button onClick={closeModal} className="dash-action dash-action-primary flex-1">
                    확인
                  </button>
                </div>
              </>
            )}

            {/* TAX */}
            {activeModal.type === 'TAX' && (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-black text-white">🏛️ 국세청</h2>
                    <p className="mt-1 text-sm text-white/70">총 자산의 20%를 세금으로 납부합니다.</p>
                    {activeModal.isBankrupt && (
                      <p className="mt-1 text-sm text-red-400">현금이 부족하여 자산이 강제 매각되었습니다.</p>
                    )}
                  </div>
                </div>
                <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-sm text-white/60">세금 (자산의 20%)</p>
                  <p className="mt-1 text-lg font-black text-white">{formatKRWKo(activeModal.due)}</p>
                </div>
                {activeModal.paid != null && activeModal.beforeCash != null && activeModal.afterCash != null && (
                  <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.04] p-4">
                    <p className="text-sm text-white/60">잔액 변동</p>
                    <div className="mt-1 space-y-1 text-sm text-white/80">
                      <div className="flex justify-between">
                        <span>납부 전:</span>
                        <span>{formatKRWKo(activeModal.beforeCash)}</span>
                      </div>
                      <div className="flex justify-between text-red-400">
                        <span>세금:</span>
                        <span>-{formatKRWKo(activeModal.paid)}</span>
                      </div>
                      <div className="flex justify-between font-bold">
                        <span>납부 후:</span>
                        <span>{formatKRWKo(activeModal.afterCash)}</span>
                      </div>
                    </div>
                  </div>
                )}
                {activeModal.autoSales && activeModal.autoSales.length > 0 && (
                  <div className="mt-3 rounded-xl border border-yellow-400/20 bg-yellow-500/[0.08] p-4">
                    <p className="text-sm text-yellow-300">강제 매각 내역</p>
                    <div className="mt-1 space-y-1 text-sm text-white/80">
                      {activeModal.autoSales.map((sale: { asset: string; qty: number; price: number }, i: number) => (
                        <div key={i} className="flex justify-between">
                          <span>{sale.asset} {sale.qty}주</span>
                          <span>+{formatKRWKo(sale.price * sale.qty)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="mt-6 flex gap-3">
                  <button onClick={confirmTax} className="dash-action dash-action-primary flex-1">
                    확인
                  </button>
                </div>
              </>
            )}

            {/* WAR SELECT */}
            {activeModal.type === 'WAR_SELECT' && (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-black text-white">⚔️ 전쟁 선포</h2>
                    <p className="mt-1 text-sm text-white/70">공격 대상을 선택하세요.</p>
                    {activeModal.byCard && <p className="mt-1 text-xs text-white/70">황금열쇠 전쟁: 승률 +5%</p>}
                  </div>
                </div>
                {apiError && (
                  <div className="mt-4 rounded-xl border border-red-400/20 bg-red-500/[0.10] p-3 text-sm text-red-100">
                    {apiError}
                  </div>
                )}
                <div className="mt-5 space-y-3">
                  {players
                    .filter((p) => !p.isBankrupt && p.id !== currentPlayer?.id)
                    .map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        disabled={apiLoading}
                        onClick={() => void startWar(p.userId, p.name)}
                        className="group flex w-full items-center justify-between gap-3 rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-3 text-left transition hover:border-white/20 hover:bg-white/[0.06] disabled:opacity-50"
                      >
                        <span className="flex min-w-0 items-center gap-3">
                          <img
                            src={p.avatar || '/assets/characters/default.png'}
                            alt={p.name}
                            className="h-9 w-9 rounded-full object-cover ring-2 ring-white/20"
                          />
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-black text-white">{p.name}</span>
                            <span className="mt-0.5 block text-xs text-white/60">공격 대상</span>
                          </span>
                        </span>
                        <span className="shrink-0 rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-200 transition group-hover:-translate-y-0.5 group-hover:bg-amber-500/20">
                          선택
                        </span>
                      </button>
                    ))}
                </div>
              </>
            )}

            {/* WAR RESULT */}
            {activeModal.type === 'WAR_RESULT' && (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-black text-white">📣 {activeModal.title}</h2>
                    <p className="mt-2 text-sm text-white/70">{activeModal.description}</p>
                  </div>
                  <button type="button" className="ui-icon-btn" onClick={closeModal} aria-label="닫기">
                    ✕
                  </button>
                </div>
                <div className="mt-6 flex gap-3">
                  <button onClick={closeModal} className="dash-action dash-action-primary flex-1">
                    확인
                  </button>
                </div>
              </>
            )}

            {/* WAR FIGHT */}
            {activeModal.type === 'WAR_FIGHT' && (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-black text-white">⚔️ 전쟁 진행 중...</h2>
                    <p className="mt-1 text-sm text-white/70">잠시만 기다려 주세요.</p>
                  </div>
                </div>
                <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex min-w-0 flex-1 flex-col items-center gap-3 text-center">
                      <div className="war-fight-avatar war-fight-left">
                        <img
                          src={activeModal.attackerAvatar}
                          alt={activeModal.attackerName}
                          className="h-48 w-48 rounded-full object-cover"
                        />
                      </div>
                      <div className="w-full truncate text-sm font-bold text-white">
                        {activeModal.attackerName}
                      </div>
                    </div>
                    <div className="war-fight-vs">
                      <span className="text-lg font-black text-amber-200">VS</span>
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col items-center gap-3 text-center">
                      <div className="war-fight-avatar war-fight-right">
                        <img
                          src={activeModal.defenderAvatar}
                          alt={activeModal.defenderName}
                          className="h-48 w-48 rounded-full object-cover"
                        />
                      </div>
                      <div className="w-full truncate text-sm font-bold text-white">
                        {activeModal.defenderName}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* INFO */}
            {activeModal.type === 'INFO' && (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-black text-white">{activeModal.title}</h2>
                    <p className="mt-2 text-sm text-white/70">{activeModal.description}</p>
                  </div>
                  <button type="button" className="ui-icon-btn" onClick={closeModal} aria-label="닫기">
                    ✕
                  </button>
                </div>
                {activeModal.imageSrc && (
                  <div className="mt-4">
                    <img
                      src={activeModal.imageSrc}
                      alt={activeModal.imageAlt ?? activeModal.title}
                      className="mx-auto w-full max-w-md rounded-2xl border border-white/10 shadow-lg"
                    />
                  </div>
                )}
                <div className="mt-6 flex gap-3">
                  <button onClick={closeModal} className="dash-action dash-action-primary flex-1">
                    확인
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default GameOverlay;
