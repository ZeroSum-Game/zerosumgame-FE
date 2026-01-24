import { formatKRW, formatKRWKoShort } from '../../utils/formatKRW';

type Props = {
  name: string;
  price: number | null;
  changePct: number | null;
  active?: boolean;
  selected?: boolean;
  occupantColors?: string[];
  showPrice?: boolean;
  onClick?: () => void;
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

const AssetCard = ({ name, price, changePct, active, selected, occupantColors, showPrice = true, onClick }: Props) => {
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

  const cardStyle: React.CSSProperties | undefined = (() => {
    if (!occupantColors || occupantColors.length === 0) return undefined;

    if (occupantColors.length === 1) {
      const c = occupantColors[0]!;
      return {
        outline: `1px solid ${hexToRgba(c, 0.75)}`,
        outlineOffset: 0,
      };
    }

    const colors = occupantColors.join(', ');
    return {
      border: '1px solid transparent',
      background: `linear-gradient(var(--asset-card-bg), var(--asset-card-bg)) padding-box, conic-gradient(from 180deg, ${colors}) border-box`,
      backgroundOrigin: 'border-box',
      backgroundClip: 'padding-box, border-box',
    };
  })();

  const body = (
    <>
      <div className="asset-card-name" title={name}>
        {name}
      </div>
      <div className="asset-card-bottom">
        {showPrice && (
          <div className="asset-card-price" title={price === null ? '—' : formatKRW(price)}>
            {price === null ? '—' : formatKRWKoShort(price)}
          </div>
        )}
        <div className={`asset-card-change ${isUp ? 'dash-up' : isDown ? 'dash-down' : 'dash-flat'}`} title={changeLabel}>
          {changeLabel}
        </div>
      </div>
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={classes} style={cardStyle}>
        {body}
      </button>
    );
  }

  return (
    <div className={classes} style={cardStyle}>
      {body}
    </div>
  );
};

export default AssetCard;
