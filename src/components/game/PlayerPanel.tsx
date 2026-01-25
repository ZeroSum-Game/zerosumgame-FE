import { useMemo, useState } from 'react';
import useGameStore, { CHARACTER_INFO, STOCK_INFO, type StockSymbol } from '../../store/useGameStore';
import { BOARD_DATA } from '../../utils/boardUtils';
import { CHARACTER_THEME } from '../../utils/characterTheme';
import { formatKRW, formatKRWKoShort } from '../../utils/formatKRW';
import { getPlayerSlotColor } from '../../utils/playerSlotColors';

const STOCK_SYMBOLS: StockSymbol[] = ['SAMSUNG', 'SK_HYNIX', 'HYUNDAI', 'BITCOIN', 'GOLD'];

const computeLandValue = (tileId: number, landType: 'LAND' | 'LANDMARK', price: number) => {
  const mult = landType === 'LANDMARK' ? 1.8 : 1.0;
  return Math.round(price * mult);
};

const hexToRgba = (hex: string, alpha: number) => {
  const h = hex.trim().replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  if (full.length !== 6) return `rgba(255,255,255,${alpha})`;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
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
  const rollStage = useGameStore((s) => s.rollStage);

  const currentPlayer = players[currentPlayerIndex] ?? null;
  const currentPlayerTheme = currentPlayer?.character ? CHARACTER_THEME[currentPlayer.character] : null;

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
            <div className="dash-kicker">이번 턴</div>
            <div className="dash-title-row">
              <div
                className={[
                  'h-9 w-9 rounded-full border border-white/10 p-[2px] shadow-lg shadow-black/40',
                  currentPlayerTheme?.bgClass ?? 'bg-white/[0.06]',
                ].join(' ')}
              >
                <img
                  src={currentPlayer?.avatar || '/assets/characters/default.png'}
                  alt={currentPlayer?.name ?? '플레이어'}
                  className={[
                    'h-full w-full rounded-full object-cover ring-2',
                    currentPlayerTheme?.ringClass ?? 'ring-white/20',
                  ].join(' ')}
                />
              </div>
              <div className="min-w-0">
                <div className="dash-title truncate">{currentPlayer?.name ?? '—'}</div>
              <div className="dash-subtitle">
                {round} / {maxRounds}턴
              </div>
            </div>
          </div>
        </div>

        {hasRolledThisTurn && (
          <div className="dash-chip font-mono">
            {rollStage !== 'IDLE' ? '— + — = —' : `${dice[0]} + ${dice[1]} = ${dice[0] + dice[1]}`}
          </div>
        )}
      </div>

      <div className="dash-metrics">
        <div className="dash-metric">
          <div className="dash-metric-label">현금</div>
          <div className="dash-metric-value" title={formatKRW(currentPlayer?.cash ?? 0)}>
            {formatKRWKoShort(currentPlayer?.cash ?? 0)}
          </div>
        </div>
        <div className="dash-metric">
          <div className="dash-metric-label">총자산</div>
          <div className="dash-metric-value" title={formatKRW(totals?.total ?? currentPlayer?.cash ?? 0)}>
            {formatKRWKoShort(totals?.total ?? currentPlayer?.cash ?? 0)}
          </div>
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
        <span className="dash-collapsible-title">보유 자산</span>
        <span className="dash-collapsible-meta">{open ? '접기' : '펼치기'}</span>
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
                    <div className="dash-mini-title">{STOCK_INFO[symbol].nameKr}</div>
                    <div className="dash-mini-sub">{qty}개</div>
                  </div>
                  <div className="dash-mini-right">
                    <div className="dash-mini-value">{formatKRW(value)}</div>
                    <div className="dash-mini-sub">{formatKRW(price)} / 1개</div>
                  </div>
                </div>
              );
            })}
            {STOCK_SYMBOLS.every((s) => (holdings[s] ?? 0) <= 0) && (
              <div className="dash-empty">보유한 금융 자산이 없습니다.</div>
            )}
          </div>

          <div className="dash-divider" />

          <div className="dash-mini-list">
            <div className="dash-mini-header">보유한 땅</div>
            {ownedLandEntries.map(({ tileId, land }) => {
              const space = BOARD_DATA[tileId];
              const base = landPrices[tileId] ?? space?.price ?? 0;
              const est = computeLandValue(tileId, land.type, base);
              return (
                <div key={tileId} className="dash-mini-row">
                  <div className="min-w-0">
                    <div className="dash-mini-title truncate">{space?.name ?? `Tile ${tileId}`}</div>
                    <div className="dash-mini-sub">{land.type === 'LANDMARK' ? '랜드마크' : '토지'}</div>
                  </div>
                  <div className="dash-mini-right">
                    <div className="dash-mini-value">{formatKRW(est)}</div>
                    <div className="dash-mini-sub">기준가 {formatKRW(base)}</div>
                  </div>
                </div>
              );
            })}
            {ownedLandEntries.length === 0 && <div className="dash-empty">보유한 땅이 없습니다.</div>}
          </div>
        </div>
      )}
    </div>
  );
};

const PlayerRoster = () => {
  const players = useGameStore((s) => s.players);
  const currentPlayerIndex = useGameStore((s) => s.currentPlayerIndex);
  const assetPrices = useGameStore((s) => s.assetPrices);
  const landPrices = useGameStore((s) => s.landPrices);
  const lands = useGameStore((s) => s.lands);

  const currentPlayer = players[currentPlayerIndex] ?? null;

  const rows = useMemo(() => {
    return players.map((p, index) => {
      const totals = computePlayerTotals(p.id, {
        assetPrices,
        landPrices,
        lands,
        getPlayerCash: () => p.cash,
        getPlayerHoldings: () => p.stockHoldings,
      });

      const posName = BOARD_DATA[p.position]?.name ?? `타일 ${p.position}`;
      const color = p.character ? CHARACTER_INFO[p.character].color : getPlayerSlotColor(index);
      const theme = p.character ? CHARACTER_THEME[p.character] : null;
      return {
        id: p.id,
        name: p.name,
        avatar: p.avatar || '/assets/characters/default.png',
        color,
        theme,
        isBankrupt: p.isBankrupt,
        isActive: p.id === currentPlayer?.id,
        cash: p.cash,
        total: totals.total,
        positionName: posName,
      };
    });
  }, [assetPrices, currentPlayer?.id, landPrices, lands, players]);

  return (
    <div className="dash-section">
      <div className="dash-section-header">
        <div>
          <div className="dash-kicker">참가자</div>
          <div className="dash-title">전체 플레이어</div>
        </div>
        <div className="dash-chip">{rows.length}명</div>
      </div>

      <div className="dash-player-list">
        {rows.map((r) => (
          <div
            key={r.id}
            className={`dash-player-row ${r.isActive ? 'dash-player-active' : ''} ${
              r.isBankrupt ? 'dash-player-bankrupt' : ''
            }`}
          >
            <span
              className="dash-player-accent"
              aria-hidden="true"
              style={{
                background: `linear-gradient(180deg, ${hexToRgba(r.color, 0.75)}, ${hexToRgba(r.color, 0.20)})`,
              }}
            />
            <div className="dash-player-left">
              <div
                className={[
                  'h-[34px] w-[34px] shrink-0 rounded-full border border-white/10 p-[2px] shadow-lg shadow-black/30',
                  r.theme?.bgClass ?? 'bg-black/20',
                ].join(' ')}
              >
                <img
                  src={r.avatar || '/assets/characters/default.png'}
                  alt={r.name}
                  className={[
                    'h-full w-full rounded-full object-cover ring-2',
                    r.theme?.ringClass ?? 'ring-white/20',
                  ].join(' ')}
                />
              </div>
              <div className="min-w-0">
                <div className="dash-player-name-row">
                  <div className="dash-player-name truncate">{r.name}</div>
                  {r.isActive && <span className="dash-player-badge">이번 턴</span>}
                  {r.isBankrupt && <span className="dash-player-badge dash-player-badge-dim">파산</span>}
                </div>
                <div className="dash-player-sub truncate">{r.positionName}</div>
              </div>
            </div>

            <div className="dash-player-right">
              <div className="dash-player-stat" title={`현금 ${formatKRW(r.cash)}`}>
                <span className="dash-player-stat-label">현금</span>
                <span className="dash-player-stat-value">{formatKRWKoShort(r.cash)}</span>
              </div>
              <div className="dash-player-stat" title={`총자산 ${formatKRW(r.total)}`}>
                <span className="dash-player-stat-label">총자산</span>
                <span className="dash-player-stat-value">{formatKRWKoShort(r.total)}</span>
              </div>
            </div>
          </div>
        ))}
        {rows.length === 0 && <div className="dash-empty">플레이어가 없습니다.</div>}
      </div>
    </div>
  );
};

const PlayerPanel = () => {
  return (
    <div className="dash-panel-body">
      <PlayerSummary />
      <PlayerRoster />
      <PlayerAssets />
    </div>
  );
};

export default PlayerPanel;
export { PlayerAssets, PlayerRoster, PlayerSummary };
