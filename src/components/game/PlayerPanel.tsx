import { useMemo, useState } from 'react';
import useGameStore, { CHARACTER_INFO, STOCK_INFO, type StockSymbol } from '../../store/useGameStore';
import { BOARD_DATA } from '../../utils/boardUtils';

const formatKRW = (n: number) => `₩${Math.max(0, Math.round(n)).toLocaleString()}`;

const STOCK_SYMBOLS: StockSymbol[] = ['SAMSUNG', 'SK_HYNIX', 'HYUNDAI', 'BITCOIN', 'GOLD'];

const computeLandValue = (tileId: number, landType: 'LAND' | 'LANDMARK', price: number) => {
  const mult = landType === 'LANDMARK' ? 1.8 : 1.0;
  return Math.round(price * mult);
};

type PlayerTotals = {
  stockValue: number;
  cryptoValue: number;
  commodityValue: number;
  landValue: number;
  total: number;
};

const computePlayerTotals = (
  playerId: number,
  {
    assetPrices,
    landPrices,
    lands,
    getPlayerCash,
    getPlayerHoldings,
  }: {
    assetPrices: Record<StockSymbol, number>;
    landPrices: Record<number, number>;
    lands: Record<number, { ownerId: number; type: 'LAND' | 'LANDMARK' }>;
    getPlayerCash: () => number;
    getPlayerHoldings: () => Partial<Record<StockSymbol, number>>;
  }
): PlayerTotals => {
  const holdings = getPlayerHoldings();
  const cash = getPlayerCash();

  const stockValue = (holdings.SAMSUNG ?? 0) * assetPrices.SAMSUNG +
    (holdings.SK_HYNIX ?? 0) * assetPrices.SK_HYNIX +
    (holdings.HYUNDAI ?? 0) * assetPrices.HYUNDAI;
  const cryptoValue = (holdings.BITCOIN ?? 0) * assetPrices.BITCOIN;
  const commodityValue = (holdings.GOLD ?? 0) * assetPrices.GOLD;

  const landValue = Object.entries(lands).reduce((sum, [tileId, land]) => {
    if (land.ownerId !== playerId) return sum;
    const id = Number(tileId);
    const price = landPrices[id] ?? BOARD_DATA[id]?.price ?? 0;
    return sum + computeLandValue(id, land.type, price);
  }, 0);

  return {
    stockValue,
    cryptoValue,
    commodityValue,
    landValue,
    total: Math.round(cash + stockValue + cryptoValue + commodityValue + landValue),
  };
};

const PlayerSummary = () => {
  const round = useGameStore((s) => s.round);
  const maxRounds = useGameStore((s) => s.maxRounds);
  const players = useGameStore((s) => s.players);
  const currentPlayerIndex = useGameStore((s) => s.currentPlayerIndex);
  const assetPrices = useGameStore((s) => s.assetPrices);
  const landPrices = useGameStore((s) => s.landPrices);
  const lands = useGameStore((s) => s.lands);
  const dice = useGameStore((s) => s.dice);
  const hasRolledThisTurn = useGameStore((s) => s.hasRolledThisTurn);

  const currentPlayer = players[currentPlayerIndex] ?? null;

  const totals = useMemo(() => {
    if (!currentPlayer) return null;
    return computePlayerTotals(currentPlayer.id, {
      assetPrices,
      landPrices,
      lands,
      getPlayerCash: () => currentPlayer.cash,
      getPlayerHoldings: () => currentPlayer.stockHoldings,
    });
  }, [assetPrices, currentPlayer, landPrices, lands]);

  return (
    <div className="dash-section">
      <div className="dash-section-header">
        <div className="min-w-0">
          <div className="dash-kicker">THIS TURN</div>
          <div className="dash-title-row">
            <div
              className="dash-avatar"
              style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
            >
              {currentPlayer?.character ? CHARACTER_INFO[currentPlayer.character].emoji : '🙂'}
            </div>
            <div className="min-w-0">
              <div className="dash-title truncate">{currentPlayer?.name ?? '—'}</div>
              <div className="dash-subtitle">
                Turn {round} / {maxRounds}
              </div>
            </div>
          </div>
        </div>

        {hasRolledThisTurn && (
          <div className="dash-chip font-mono">
            {dice[0]} + {dice[1]} = {dice[0] + dice[1]}
          </div>
        )}
      </div>

      <div className="dash-metrics">
        <div className="dash-metric">
          <div className="dash-metric-label">Cash</div>
          <div className="dash-metric-value">{formatKRW(currentPlayer?.cash ?? 0)}</div>
        </div>
        <div className="dash-metric">
          <div className="dash-metric-label">Total Assets</div>
          <div className="dash-metric-value">{formatKRW(totals?.total ?? currentPlayer?.cash ?? 0)}</div>
        </div>
      </div>
    </div>
  );
};

const PlayerAssets = () => {
  const players = useGameStore((s) => s.players);
  const currentPlayerIndex = useGameStore((s) => s.currentPlayerIndex);
  const assetPrices = useGameStore((s) => s.assetPrices);
  const landPrices = useGameStore((s) => s.landPrices);
  const lands = useGameStore((s) => s.lands);

  const currentPlayer = players[currentPlayerIndex] ?? null;
  const [open, setOpen] = useState(false);

  const holdings = currentPlayer?.stockHoldings ?? {};
  const ownedLandEntries = useMemo(() => {
    if (!currentPlayer) return [];
    return Object.entries(lands)
      .map(([tileId, land]) => ({ tileId: Number(tileId), land }))
      .filter(({ land }) => land.ownerId === currentPlayer.id)
      .sort((a, b) => (landPrices[b.tileId] ?? 0) - (landPrices[a.tileId] ?? 0));
  }, [currentPlayer, lands, landPrices]);

  return (
    <div className="dash-section">
      <button
        type="button"
        className="dash-collapsible"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="dash-collapsible-title">Holdings</span>
        <span className="dash-collapsible-meta">{open ? 'Hide' : 'Show'}</span>
      </button>

      {open && (
        <div className="dash-collapsible-body">
          <div className="dash-mini-list">
            {STOCK_SYMBOLS.map((symbol) => {
              const qty = holdings[symbol] ?? 0;
              if (qty <= 0) return null;
              const price = assetPrices[symbol];
              const value = qty * price;
              return (
                <div key={symbol} className="dash-mini-row">
                  <div className="min-w-0">
                    <div className="dash-mini-title">{STOCK_INFO[symbol].name}</div>
                    <div className="dash-mini-sub">{qty} units</div>
                  </div>
                  <div className="dash-mini-right">
                    <div className="dash-mini-value">{formatKRW(value)}</div>
                    <div className="dash-mini-sub">{formatKRW(price)} / unit</div>
                  </div>
                </div>
              );
            })}
            {STOCK_SYMBOLS.every((s) => (holdings[s] ?? 0) <= 0) && (
              <div className="dash-empty">No financial assets yet.</div>
            )}
          </div>

          <div className="dash-divider" />

          <div className="dash-mini-list">
            <div className="dash-mini-header">Owned Land</div>
            {ownedLandEntries.map(({ tileId, land }) => {
              const space = BOARD_DATA[tileId];
              const base = landPrices[tileId] ?? space?.price ?? 0;
              const est = computeLandValue(tileId, land.type, base);
              return (
                <div key={tileId} className="dash-mini-row">
                  <div className="min-w-0">
                    <div className="dash-mini-title truncate">{space?.name ?? `Tile ${tileId}`}</div>
                    <div className="dash-mini-sub">{land.type === 'LANDMARK' ? 'Landmark' : 'Land'}</div>
                  </div>
                  <div className="dash-mini-right">
                    <div className="dash-mini-value">{formatKRW(est)}</div>
                    <div className="dash-mini-sub">{formatKRW(base)} base</div>
                  </div>
                </div>
              );
            })}
            {ownedLandEntries.length === 0 && <div className="dash-empty">No land holdings yet.</div>}
          </div>
        </div>
      )}
    </div>
  );
};

const PlayerPanel = () => {
  return (
    <div className="dash-panel-body">
      <PlayerSummary />
      <PlayerAssets />
    </div>
  );
};

export default PlayerPanel;
export { PlayerAssets, PlayerSummary };
