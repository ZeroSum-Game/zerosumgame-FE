import useGameStore, { STOCK_INFO, TILE_TO_STOCK, type StockSymbol } from '../../store/useGameStore';
import { BOARD_DATA } from '../../utils/boardUtils';
import { formatKRW, formatKRWKo } from '../../utils/formatKRW';

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

  const region = space?.type === 'COUNTRY' ? space.continent ?? null : null;

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

  return (
    <>
      <button type="button" className="ui-modal-backdrop" onClick={onClose} aria-label="상세 닫기" />

      <div role="dialog" aria-modal="true" className="ui-modal" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.22em] text-white/55">{category}</div>
            <h2 className="mt-1 truncate text-2xl font-black text-white">{fullName}</h2>
            <p className="mt-1 truncate text-sm text-white/60">{fullNameSub}</p>
          </div>
          <button type="button" className="ui-icon-btn" onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </div>

        <div className="mt-5 grid gap-3">
          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
            <div className="text-sm text-white/60">가격</div>
            <div className="mt-1 font-mono text-lg font-black text-white">
              {price === null ? '—' : formatKRWKo(price)}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm text-white/60">변동</div>
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

          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
            <div className="text-sm text-white/60">분류</div>
            <div className="mt-1 text-sm font-semibold text-white">{category}</div>
            {region && <div className="mt-1 text-xs text-white/60">지역: {region}</div>}
          </div>

          {space?.description && (
            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
              <div className="text-sm text-white/60">설명</div>
              <p className="mt-2 text-sm leading-relaxed text-white/75">{space.description}</p>
            </div>
          )}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <button type="button" className="dash-action dash-action-secondary" disabled title="보드에서는 실행할 수 없어요.">
            매수
          </button>
          <button type="button" className="dash-action dash-action-secondary" disabled title="보드에서는 실행할 수 없어요.">
            매도
          </button>
          <button type="button" className="dash-action dash-action-secondary" disabled title="거래는 게임 흐름에서 진행돼요.">
            거래
          </button>
          <button type="button" className="dash-action dash-action-primary" onClick={onClose}>
            닫기
          </button>
        </div>
      </div>
    </>
  );
};

export default AssetDetailModal;
