import type { ReactNode } from 'react';

const formatKRWCompact = (n: number) => {
  const v = Math.max(0, Math.round(n));
  if (v >= 1_000_000_000) return `₩${(v / 1_000_000_000).toFixed(2)}B`;
  if (v >= 1_000_000) return `₩${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `₩${(v / 1_000).toFixed(2)}K`;
  return `₩${v.toLocaleString()}`;
};

type Props = {
  name: string;
  meta?: string;
  price: number | null;
  changePct: number | null;
  active?: boolean;
  selected?: boolean;
  corner?: ReactNode;
  onClick?: () => void;
};

const AssetCard = ({ name, meta, price, changePct, active, selected, corner, onClick }: Props) => {
  const isUp = typeof changePct === 'number' && changePct > 0;
  const isDown = typeof changePct === 'number' && changePct < 0;

  const changeLabel =
    typeof changePct === 'number'
      ? `${changePct >= 0 ? '+' : '-'}${Math.abs(changePct).toFixed(2)}%`
      : '—';

  const classes = [
    'asset-card',
    active ? 'asset-card-active' : '',
    selected ? 'asset-card-selected' : '',
    onClick ? 'asset-card-clickable' : '',
  ].join(' ');

  const body = (
    <>
      <div className="asset-card-top">
        <div className="min-w-0">
          <div className="asset-card-name truncate">{name}</div>
          <div className="asset-card-meta truncate">{meta ?? '—'}</div>
        </div>
        {corner && <div className="asset-card-corner">{corner}</div>}
      </div>

      <div className="asset-card-bottom">
        <div className="asset-card-price">{price === null ? '—' : formatKRWCompact(price)}</div>
        <div className={`asset-card-change ${isUp ? 'dash-up' : isDown ? 'dash-down' : 'dash-flat'}`}>
          {changeLabel}
        </div>
      </div>
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={classes}>
        {body}
      </button>
    );
  }

  return <div className={classes}>{body}</div>;
};

export default AssetCard;
