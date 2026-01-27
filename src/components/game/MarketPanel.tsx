import { useEffect, useMemo, useRef, useState } from 'react';
import useGameStore, { STOCK_INFO, type StockSymbol } from '../../store/useGameStore';
import { apiGenerateNews } from '../../services/api';
import { formatKRWKoShort } from '../../utils/formatKRW';
import { getRegionForStockSymbol } from '../../utils/regionCues';

const MAJOR_SYMBOLS: StockSymbol[] = ['SAMSUNG', 'LOCKHEED', 'TESLA', 'BITCOIN', 'GOLD'];

const MarketPanel = () => {
  const assetPrices = useGameStore((s) => s.assetPrices);
  const eventLog = useGameStore((s) => s.eventLog);
  const currentRound = useGameStore((s) => s.round);

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

  const rounds = useMemo(() => {
    const byRound = new Map<number, (typeof eventLog)[number][]>();
    for (const entry of eventLog) {
      const list = byRound.get(entry.round) ?? [];
      list.push(entry);
      byRound.set(entry.round, list);
    }
    return Array.from(byRound.entries())
      .map(([round, entries]) => ({ round, entries }))
      .sort((a, b) => b.round - a.round)
      .filter((entry) => entry.round < currentRound)
      .slice(0, 6);
  }, [currentRound, eventLog]);

  const [newsByRound, setNewsByRound] = useState<Record<number, { headline: string; summary: string }>>({});
  const inFlightRef = useRef<Set<number>>(new Set());

  const typeLabels: Record<string, string> = {
    TURN: '턴 속보',
    MOVE: '이동',
    MARKET: '시장',
    LAND: '부동산',
    WAR: '전쟁',
    TAX: '세금',
    MINIGAME: '이벤트',
    KEY: '황금열쇠',
    DIVIDEND: '배당',
    SYSTEM: '속보',
  };

  useEffect(() => {
    rounds.forEach(({ round, entries }) => {
      if (newsByRound[round]) return;
      if (entries.length === 0) return;
      if (inFlightRef.current.has(round)) return;

      inFlightRef.current.add(round);
      setNewsByRound((prev) => ({
        ...prev,
        [round]: {
          headline: '헤드라인 생성 중...',
          summary: '요약을 불러오는 중입니다.',
        },
      }));

      void apiGenerateNews({
        round,
        locale: 'ko-KR',
        events: entries.slice(0, 6).map((entry) => ({
          type: entry.type,
          title: entry.title,
          message: entry.message,
        })),
      })
        .then((result) => {
          const fallback = entries[0];
          setNewsByRound((prev) => ({
            ...prev,
            [round]: result?.headline && result?.summary
              ? { headline: result.headline, summary: result.summary }
              : {
                  headline: fallback?.title ?? `턴 ${round}`,
                  summary: fallback?.message ?? '',
                },
          }));
        })
        .finally(() => {
          inFlightRef.current.delete(round);
        });
    });
  }, [newsByRound, rounds]);

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
          <div className="dash-kicker">오늘의 뉴스</div>
          <div className="dash-title">턴별 헤드라인</div>
        </div>
        <div className="dash-news">
          {rounds.map(({ round, entries }) => {
            const top = entries[0];
            const news = newsByRound[round];
            const label = top ? typeLabels[top.type] ?? top.type : '속보';
            return (
              <article key={round} className="dash-news-card">
                <div className="dash-news-topline">
                  <span className="dash-news-round">{round}턴</span>
                  <span className="dash-news-tag">{label}</span>
                </div>
                <h3 className="dash-news-headline">{news?.headline ?? '헤드라인 생성 중...'}</h3>
                <p className="dash-news-body">{news?.summary ?? '요약을 불러오는 중입니다.'}</p>
              </article>
            );
          })}
          {rounds.length === 0 && <div className="dash-empty">아직 뉴스가 없습니다.</div>}
        </div>
      </div>
    </div>
  );
};

export default MarketPanel;
