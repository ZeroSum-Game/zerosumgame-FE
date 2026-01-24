import { useEffect, useMemo, useRef, useState } from 'react';
import useGameStore, { STOCK_INFO, type StockSymbol } from '../../store/useGameStore';

const formatKRWCompact = (n: number) => {
  const v = Math.max(0, Math.round(n));
  if (v >= 1_000_000_000) return `₩${(v / 1_000_000_000).toFixed(2)}B`;
  if (v >= 1_000_000) return `₩${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `₩${(v / 1_000).toFixed(2)}K`;
  return `₩${v.toLocaleString()}`;
};

const MAJOR_SYMBOLS: StockSymbol[] = ['SAMSUNG', 'SK_HYNIX', 'BITCOIN', 'GOLD'];

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
          <div className="dash-kicker">MARKET</div>
          <div className="dash-title">Major Assets</div>
        </div>

        <div className="dash-market-list">
          {MAJOR_SYMBOLS.map((symbol) => {
            const info = STOCK_INFO[symbol];
            const price = assetPrices[symbol];
            const change = changes[symbol] ?? 0;
            const isUp = change >= 0;

            return (
              <div key={symbol} className="dash-market-row">
                <div className="min-w-0">
                  <div className="dash-market-name">{info.name}</div>
                  <div className="dash-market-sub">{info.nameKr}</div>
                </div>
                <div className="dash-market-right">
                  <div className="dash-market-price">{formatKRWCompact(price)}</div>
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
          <div className="dash-kicker">ACTIVITY</div>
          <div className="dash-title">Feed</div>
        </div>
        <div className="dash-activity">
          {recent.map((e) => (
            <div key={e.id} className="dash-activity-row">
              <div className="dash-activity-title">
                {e.title} <span className="dash-activity-meta">· Turn {e.round}</span>
              </div>
              <div className="dash-activity-msg">{e.message}</div>
            </div>
          ))}
          {recent.length === 0 && <div className="dash-empty">No activity yet.</div>}
        </div>
      </div>
    </div>
  );
};

export default MarketPanel;

