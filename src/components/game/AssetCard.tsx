import { formatKRW, formatKRWKoShort } from '../../utils/formatKRW';

type Props = {
  name: string;
  price: number | null;
  changePct: number | null;
  active?: boolean;
  selected?: boolean;
  onClick?: () => void;
};

const AssetCard = ({ name, price, changePct, active, selected, onClick }: Props) => {
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
      <div className="asset-card-name" title={name}>
        {name}
      </div>
      <div className="asset-card-bottom">
        <div className="asset-card-price" title={price === null ? '—' : formatKRW(price)}>
          {price === null ? '—' : formatKRWKoShort(price)}
        </div>
        <div className={`asset-card-change ${isUp ? 'dash-up' : isDown ? 'dash-down' : 'dash-flat'}`} title={changeLabel}>
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
