import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import useGameStore, { STOCK_INFO, TILE_TO_STOCK, type StockSymbol } from '../../store/useGameStore';
import { BOARD_DATA } from '../../utils/boardUtils';
import { formatKRW, formatKRWKo } from '../../utils/formatKRW';
import { getRegionForBoardSpace } from '../../utils/regionCues';

type PriceChange = { prev: number; current: number; delta: number; pct: number };

type Props = {
  tileId: number;
  onClose: () => void;
  assetChange: Partial<Record<StockSymbol, PriceChange>>;
  landChange: Record<number, PriceChange>;
};

const formatSignedKRW = (delta: number) => `${delta >= 0 ? '+' : '-'}${formatKRW(Math.abs(delta))}`;

const AssetDetailModal = ({ tileId, onClose, assetChange, landChange }: Props) => {
  const assetPrices = useGameStore((s) => s.assetPrices);
  const landPrices = useGameStore((s) => s.landPrices);
  const round = useGameStore((s) => s.round);

  const space = BOARD_DATA[tileId];
  const symbol = space?.type === 'STOCK' ? TILE_TO_STOCK[tileId] : undefined;

  const category = (() => {
    if (!space) return '알 수 없음';
    if (space.type === 'COUNTRY') return '국가';
    if (space.type === 'STOCK' && symbol) {
      if (symbol === 'BITCOIN') return '암호화폐';
      if (symbol === 'GOLD') return '원자재';
      return '주식';
    }
    if (space.type === 'KEY') return '이벤트';
    if (space.type === 'ISLAND') return '이벤트';
    if (space.type === 'MINIGAME') return '미니게임';
    if (space.type === 'TAX') return '세금';
    if (space.type === 'START') return '시작';
    return space.type;
  })();

  const region = space ? getRegionForBoardSpace(space, { stockSymbol: symbol }) : null;

  const fullName = symbol ? STOCK_INFO[symbol].nameKr : space?.name ?? `타일 ${tileId}`;
  const fullNameSub = symbol ? STOCK_INFO[symbol].name : region ?? category;

  const price =
    space?.type === 'COUNTRY'
      ? (landPrices[tileId] ?? space.price ?? null)
      : symbol
        ? assetPrices[symbol]
        : null;

  const changeInfo = symbol ? assetChange[symbol] : space?.type === 'COUNTRY' ? landChange[tileId] : undefined;
  const delta = changeInfo?.delta ?? 0;
  const pct = changeInfo?.pct ?? 0;
  const isUp = delta > 0;
  const isDown = delta < 0;

  const changeClass = isUp ? 'dash-up' : isDown ? 'dash-down' : 'dash-flat';

  // [Merge Note] 2026-01-27: Added Recharts graph data generation
  // Generates mock history data based on current price and fluctuation delta
  const historyData = useMemo(() => {
    if (price === null) return [];

    const points = Math.min(20, Math.max(1, round));
    const volatility = price * 0.05; // 5% volatility

    // Pseudo-random generator using Park-Miller algorithm
    // Seed it with tileId + price to ensure graph looks identical for same state
    let seed = (tileId * 10000 + price) % 2147483647;
    const nextRandom = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    const values = new Array<number>(points);
    values[points - 1] = Math.round(price);
    if (changeInfo && points > 1 && round > 1) {
      values[points - 2] = Math.round(changeInfo.prev);
    }
    const trend = delta / Math.max(1, points - 1);

    // [Simulated] Land Growth: Country tiles +3% compounded per turn "inverted" for history
    // Current price is the result of growth. So history should be lower. 
    // reverse: prev = current / 1.03
    const isCountry = space?.type === 'COUNTRY';
    const growthRate = 1.03;

    for (let i = points - 3; i >= 0; i -= 1) {
      let nextVal = values[i + 1] ?? price;

      if (isCountry) {
        // Reverse the simulated growth
        nextVal = nextVal / growthRate;
      }

      const randomChange = (nextRandom() - 0.5) * volatility;
      // If it's a country, main trend is the growth, delta is small fluctuation on top?
      // Actually usually 'delta' is the real change from last turn.
      // If we want the graph to show a steady rise, the history must be lower.

      values[i] = Math.max(10, Math.round(nextVal - trend + randomChange));
    }

    return values.map((value, index) => {
      const turnsAgo = points - 1 - index;
      return {
        time: turnsAgo === 0 ? '\uD604\uC7AC' : `${turnsAgo}\uD134 \uC804`,
        value,
      };
    });
  }, [price, changeInfo, delta, tileId, round, space]);


  return (
    <>
      <button type="button" className="ui-modal-backdrop" onClick={onClose} aria-label="상세 닫기" />

      <div
        role="dialog"
        aria-modal="true"
        className="ui-modal region-cue asset-detail-modal"
        data-region={region ?? undefined}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.22em] text-white/55">{category}</div>
            <h2 className="asset-detail-title mt-1 truncate text-2xl font-black text-white">{fullName}</h2>
            <p className="asset-detail-sub mt-1 truncate text-sm text-white/60">{fullNameSub}</p>
          </div>
          <button type="button" className="ui-icon-btn" onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </div>

        <div className="mt-5 grid gap-3">

          {(space?.type === 'COUNTRY' || (space?.type === 'STOCK' && symbol !== undefined)) && (
            <>
              <div className="asset-detail-section rounded-xl border border-white/10 bg-white/[0.04] p-4">
                <div className="asset-detail-section-title text-sm text-white/60">
                  <span className="asset-detail-section-dot" aria-hidden="true" />
                  가격
                </div>
                <div className="mt-1 font-mono text-lg font-black text-white">
                  {price === null ? '—' : formatKRWKo(price)}
                </div>
              </div>

              <div className="asset-detail-section rounded-xl border border-white/10 bg-white/[0.04] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="asset-detail-section-title text-sm text-white/60">
                    <span className="asset-detail-section-dot" aria-hidden="true" />
                    변동
                  </div>
                  <div className={`font-mono text-sm font-black ${changeClass}`}>
                    {changeInfo ? `${formatSignedKRW(delta)} (${pct >= 0 ? '+' : '-'}${Math.abs(pct).toFixed(2)}%)` : '—'}
                  </div>
                </div>
                {changeInfo && (
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-white/60">
                    <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                      이전 <span className="ml-1 font-mono text-white/80">{formatKRW(changeInfo.prev)}</span>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-right">
                      현재 <span className="ml-1 font-mono text-white/80">{formatKRW(changeInfo.current)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* 그래프 추가 영역 */}
              {price !== null && (
                <div className="asset-detail-section rounded-xl border border-white/10 bg-white/[0.04] p-4">
                  <div className="asset-detail-section-title text-sm text-white/60 mb-2">
                    <span className="asset-detail-section-dot" aria-hidden="true" />
                    가격 변동 추이
                  </div>
                  <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={historyData}>
                        <defs>
                          <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={isUp ? "#10b981" : isDown ? "#ef4444" : "#cbd5e1"} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={isUp ? "#10b981" : isDown ? "#ef4444" : "#cbd5e1"} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                        <XAxis
                          dataKey="time"
                          hide
                        />
                        <YAxis
                          domain={['auto', 'auto']}
                          tickFormatter={(value) => formatKRW(value)}
                          stroke="rgba(255,255,255,0.3)"
                          tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.5)' }}
                          width={40}
                        />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                          itemStyle={{ color: '#fff' }}
                          formatter={(value: number | undefined) => [formatKRW(value ?? 0), '가격']}
                          labelStyle={{ color: '#94a3b8' }}
                        />
                        <Area
                          type="monotone"
                          dataKey="value"
                          stroke={isUp ? "#10b981" : isDown ? "#ef4444" : "#cbd5e1"}
                          fillOpacity={1}
                          fill="url(#colorValue)"
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </>
          )}

          <div className="asset-detail-section rounded-xl border border-white/10 bg-white/[0.04] p-4">
            <div className="asset-detail-section-title text-sm text-white/60">
              <span className="asset-detail-section-dot" aria-hidden="true" />
              분류
            </div>
            <div className="mt-1 text-sm font-semibold text-white">{category}</div>
            {region && <div className="mt-1 text-xs text-white/60">지역: {region}</div>}
          </div>

          {space?.description && (
            <div className="asset-detail-section rounded-xl border border-white/10 bg-white/[0.04] p-4">
              <div className="asset-detail-section-title text-sm text-white/60">
                <span className="asset-detail-section-dot" aria-hidden="true" />
                설명
              </div>
              <p className="mt-2 text-sm leading-relaxed text-white/75">{space.description}</p>
            </div>
          )}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {space?.type === 'COUNTRY' && (
            <>
              <button type="button" className="dash-action dash-action-secondary" disabled title="보드에서는 실행할 수 없어요.">
                매수
              </button>
              <button type="button" className="dash-action dash-action-secondary" disabled title="보드에서는 실행할 수 없어요.">
                매도
              </button>
              <button type="button" className="dash-action dash-action-secondary" disabled title="거래는 게임 흐름에서 진행돼요.">
                거래
              </button>
            </>
          )}
          <button
            type="button"
            className={`dash-action dash-action-primary asset-detail-primary ${space?.type !== 'COUNTRY' ? 'col-span-full' : ''}`}
            onClick={onClose}
          >
            닫기
          </button>
        </div>
      </div>
    </>
  );
};

export default AssetDetailModal;
