import { useEffect, useMemo, useRef, useState } from 'react';
import useGameStore, { STOCK_INFO, type StockSymbol } from '../../store/useGameStore';
import { formatKRWKoShort } from '../../utils/formatKRW';
import { getRegionForStockSymbol } from '../../utils/regionCues';

const MAJOR_SYMBOLS: StockSymbol[] = ['SAMSUNG', 'SK_HYNIX', 'HYUNDAI', 'BITCOIN', 'GOLD'];

const MarketPanel = () => {
  const assetPrices = useGameStore((s) => s.assetPrices);
  const eventLog = useGameStore((s) => s.eventLog);

  const prevPricesRef = useRef<Record<StockSymbol, number>>(assetPrices);
  const [changes, setChanges] = useState<Record<StockSymbol, number>>({} as Record<StockSymbol, number>);

  useEffect(() => {
    const next: Record<StockSymbol, number> = {} as Record<StockSymbol, number>;
    MAJOR_SYMBOLS.forEach((symbol) => {
      const prev = prevPricesRef.current[symbol];
      const current = assetPrices[symbol];
      next[symbol] = prev ? ((current - prev) / prev) * 100 : 0;
    });
    setChanges(next);
    prevPricesRef.current = { ...assetPrices };
  }, [assetPrices]);

  const recent = useMemo(() => eventLog.slice(0, 8), [eventLog]);

  return (
    <div className="dash-panel-body">
      <div className="dash-section">
        <div className="dash-section-header">
          <div className="dash-kicker">시장</div>
          <div className="dash-title">주요 자산</div>
        </div>

        <div className="dash-market-list">
          {MAJOR_SYMBOLS.map((symbol) => {
            const info = STOCK_INFO[symbol];
            const price = assetPrices[symbol];
            const change = changes[symbol] ?? 0;
            const isUp = change >= 0;
            const region = getRegionForStockSymbol(symbol);

            return (
              <div key={symbol} className="dash-market-row region-cue" data-region={region}>
                <div className="min-w-0">
                  <div className="dash-market-name">{info.nameKr}</div>
                  <div className="dash-market-sub">{info.name}</div>
                </div>
                <div className="dash-market-right">
                  <div className="dash-market-price">{formatKRWKoShort(price)}</div>
                  <div className={`dash-market-change ${isUp ? 'dash-up' : 'dash-down'}`}>
                    {isUp ? '+' : '-'}
                  {Math.abs(change).toFixed(2)}%
                </div>
              </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="dash-section">
        <div className="dash-section-header">
          <div className="dash-kicker">기록</div>
          <div className="dash-title">피드</div>
        </div>
        <div className="dash-activity">
          {recent.map((e) => (
            <div key={e.id} className="dash-activity-row">
              <div className="dash-activity-title">
                {e.title} <span className="dash-activity-meta">· {e.round}턴</span>
              </div>
              <div className="dash-activity-msg">{e.message}</div>
            </div>
          ))}
          {recent.length === 0 && <div className="dash-empty">아직 기록이 없습니다.</div>}
        </div>
      </div>
    </div>
  );
};

export default MarketPanel;
