import { useEffect, useMemo, useRef, useState } from 'react';
import useGameStore, { CHARACTER_INFO, STOCK_INFO, type StockSymbol } from '../../store/useGameStore';
import { BOARD_DATA } from '../../utils/boardUtils';
import AssetDetailModal from '../game/AssetDetailModal';
import BoardRing from '../game/BoardRing';
import DiceRoller from '../game/DiceRoller';
import GameLayout from '../game/GameLayout';
import MarketPanel from '../game/MarketPanel';
import PlayerPanel from '../game/PlayerPanel';
import TurnControls from '../game/TurnControls';
import { formatKRWKo } from '../../utils/formatKRW';

const STOCK_SYMBOLS: StockSymbol[] = ['SAMSUNG', 'SK_HYNIX', 'HYUNDAI', 'BITCOIN', 'GOLD'];

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
  const assetPrices = useGameStore((state) => state.assetPrices);

  const activeModal = useGameStore((state) => state.activeModal);
  const closeModal = useGameStore((state) => state.closeModal);
  const queuedModal = useGameStore((state) => state.queuedModal);
  const rollStage = useGameStore((state) => state.rollStage);

  const buyLand = useGameStore((state) => state.buyLand);
  const buildLandmark = useGameStore((state) => state.buildLandmark);
  const payTollOrPropose = useGameStore((state) => state.payTollOrPropose);
  const respondTakeover = useGameStore((state) => state.respondTakeover);

  const setTradeSymbol = useGameStore((state) => state.setTradeSymbol);
  const buyAsset = useGameStore((state) => state.buyAsset);
  const sellAsset = useGameStore((state) => state.sellAsset);

  const completeMinigame = useGameStore((state) => state.completeMinigame);
  const confirmTax = useGameStore((state) => state.confirmTax);
  const chooseWarTarget = useGameStore((state) => state.chooseWarTarget);

  const currentPlayer = players[currentPlayerIndex] ?? null;

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

  const canDismiss = useMemo(() => {
    if (!activeModal) return false;
    return ['INFO', 'GOLDEN_KEY', 'WAR_RESULT', 'ASSET_TRADE', 'LAND_BUY', 'LAND_UPGRADE', 'MINIGAME'].includes(
      activeModal.type
    );
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

          <div role="dialog" aria-modal="true" className="ui-modal" onClick={(e) => e.stopPropagation()}>
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

                  <div className="mt-6 flex gap-3">
                    <button onClick={buyLand} className="dash-action dash-action-success flex-1">
                      구매하기
                    </button>
                    <button onClick={closeModal} className="dash-action dash-action-secondary flex-1">
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
              const cost = landPrices[tileId] ?? space?.price ?? 0;
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
                  <div className="mt-6 flex gap-3">
                    <button onClick={buildLandmark} className="dash-action dash-action-primary flex-1">
                      건설하기
                    </button>
                    <button onClick={closeModal} className="dash-action dash-action-secondary flex-1">
                      나중에
                    </button>
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
              return (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-black text-white">🧾 통행료</h2>
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
                    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                      <p className="text-sm text-white/60">통행료</p>
                      <p className="mt-1 text-lg font-black text-white">{formatKRWKo(activeModal.toll)}</p>
                    </div>
                    {takeoverPrice && (
                      <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                        <p className="text-sm text-white/60">인수 제안가 (150%)</p>
                        <p className="mt-1 text-lg font-black text-white">{formatKRWKo(takeoverPrice)}</p>
                        <p className="mt-1 text-xs text-white/50">랜드마크가 없을 때만 인수 가능합니다.</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 flex gap-3">
                    {takeoverPrice && (
                      <button
                        onClick={() => payTollOrPropose('PROPOSE')}
                        className="dash-action dash-action-primary flex-1"
                      >
                        인수 제안
                      </button>
                    )}
                    <button onClick={() => payTollOrPropose('PAY')} className="dash-action dash-action-danger flex-1">
                      통행료 지불
                    </button>
                  </div>
                </>
              );
            })()}

            {/* TAKEOVER RESPONSE */}
            {activeModal.type === 'LAND_TAKEOVER_RESPONSE' && (() => {
              const tileId = activeModal.tileId;
              const space = BOARD_DATA[tileId];
              const owner = players.find((p) => p.id === activeModal.ownerId) ?? null;
              const buyer = players.find((p) => p.id === activeModal.buyerId) ?? null;
              return (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-black text-white">🤝 인수 제안</h2>
                      <p className="mt-1 text-2xl font-black text-white">{space?.name ?? '—'}</p>
                      <p className="mt-2 text-sm text-white/70">
                        {buyer?.name ?? '—'} → {owner?.name ?? '—'} {formatKRWKo(activeModal.price)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-6 flex gap-3">
                    <button onClick={() => respondTakeover(true)} className="dash-action dash-action-success flex-1">
                      수락
                    </button>
                    <button onClick={() => respondTakeover(false)} className="dash-action dash-action-secondary flex-1">
                      거절 (통행료)
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
                          className={`dash-action ${
                            sym === symbol ? 'dash-action-primary' : 'dash-action-secondary'
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

            {/* MINIGAME */}
            {activeModal.type === 'MINIGAME' && (() => {
              const salary = activeModal.salary;
              const secret = minigameSecret ?? 1;
              const guessed = minigameGuess;
              return (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-black text-white">🎮 미니게임</h2>
                      <p className="mt-1 text-sm text-white/70">숫자 맞추기! 1~6 중 하나를 선택하세요.</p>
                    </div>
                    <button type="button" className="ui-icon-btn" onClick={closeModal} aria-label="닫기">
                      ✕
                    </button>
                  </div>

                  <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.04] p-4">
                    <p className="text-sm text-white/60">성공 보상</p>
                    <p className="mt-1 text-lg font-black text-white">{formatKRWKo(salary)}</p>
                  </div>

                  <div className="mt-5 grid grid-cols-6 gap-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        className={`dash-action w-full p-0 text-lg font-black ${
                          guessed === i + 1 ? 'dash-action-primary' : 'dash-action-secondary'
                        }`}
                        onClick={() => setMinigameGuess(i + 1)}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>

                  <div className="mt-6 flex gap-3">
                    <button
                      type="button"
                      className="dash-action dash-action-success flex-1"
                      disabled={!minigameGuess}
                      onClick={() => {
                        const guess = minigameGuess ?? 1;
                        completeMinigame(guess === secret);
                      }}
                    >
                      선택 완료
                    </button>
                  </div>
                </>
              );
            })()}

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
                    <p className="mt-1 text-sm text-white/70">총 자산의 15%를 납부합니다. 현금이 부족하면 강제 매각됩니다.</p>
                  </div>
                </div>
                <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-sm text-white/60">납부 금액</p>
                  <p className="mt-1 text-lg font-black text-white">{formatKRWKo(activeModal.due)}</p>
                </div>
                <div className="mt-6 flex gap-3">
                  <button onClick={confirmTax} className="dash-action dash-action-danger flex-1">
                    납부
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
                <div className="mt-5 space-y-2">
                  {players
                    .filter((p) => !p.isBankrupt && p.id !== currentPlayer?.id)
                    .map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        className="dash-action dash-action-secondary w-full justify-between px-4 py-3 text-left font-black"
                        onClick={() => chooseWarTarget(p.id)}
                      >
                        <span className="flex items-center gap-2">
                          <img
                            src={p.avatar || '/assets/characters/default.png'}
                            alt={p.name}
                            className="h-6 w-6 rounded-full object-cover ring-2 ring-white/20"
                          />
                          {p.name}
                        </span>
                        <span className="text-xs text-white/50">선택</span>
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
