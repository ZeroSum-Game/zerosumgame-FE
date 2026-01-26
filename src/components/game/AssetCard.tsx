
import { formatKRW, formatKRWKoShort } from '../../utils/formatKRW';
import type { Region } from '../../utils/regionCues';

type Props = {
  name: string;
  price: number | null;
  changePct: number | null;
  active?: boolean;
  selected?: boolean;
  occupantColors?: string[];
  region?: Region | null;
  showPrice?: boolean;
  onClick?: () => void;
  // [Merge Note] 2026-01-27: Added props for owner styling and special tile types
  ownerColor?: string; // New prop for owner color
  specialType?: string; // New prop for special tile types
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

const AssetCard = ({
  name,
  price,
  changePct,
  active,
  selected,
  occupantColors,
  region,
  showPrice = true,
  onClick,
  ownerColor,
  specialType
}: Props) => {
  const isUp = typeof changePct === 'number' && changePct > 0;
  const isDown = typeof changePct === 'number' && changePct < 0;

  const changeLabel =
    typeof changePct === 'number'
      ? `${changePct >= 0 ? '+' : '-'}${Math.abs(changePct).toFixed(2)}%`
      : '—';

  const classes = [
    'asset-card',
    'region-cue',
    active ? 'asset-card-active' : '',
    selected ? 'asset-card-selected' : '',
    onClick ? 'asset-card-clickable' : '',
    specialType ? `asset-card-special asset-card-${specialType.toLowerCase()}` : '', // Add special class
  ].join(' ');

  const cardStyle: React.CSSProperties | undefined = (() => {
    // Priority 1: Current Occupants (already handled, but let's check conflict)
    // If multiple people are on it, show gradient.
    // If owner exists, maybe show border or background? 
    // User said: "Show owner's character color when land is bought".
    // Let's use border for owner, or background tint.

    let style: React.CSSProperties = {};

    if (ownerColor) {
      style.backgroundColor = hexToRgba(ownerColor, 0.2);
      style.boxShadow = `inset 0 0 0 2px ${ownerColor}`;
    }

    // Occupants override/overlay border? Or use gradient border?
    if (occupantColors && occupantColors.length > 0) {
      if (occupantColors.length === 1) {
        const c = occupantColors[0]!;
        style.outline = `3px solid ${hexToRgba(c, 1)}`; // Make it pop
        style.outlineOffset = -2;
      } else {
        const colors = occupantColors.join(', ');
        style.border = '3px solid transparent';
        style.background = `linear-gradient(${ownerColor ? hexToRgba(ownerColor, 0.2) : 'var(--asset-card-bg)'}, ${ownerColor ? hexToRgba(ownerColor, 0.2) : 'var(--asset-card-bg)'}) padding-box, conic-gradient(from 180deg, ${colors}) border-box`;
        style.backgroundOrigin = 'border-box';
        style.backgroundClip = 'padding-box, border-box';
        style.boxShadow = 'none'; // Clear owner box shadow if multiple people
      }
    }

    // Special Types Custom Colors
    if (specialType) {
      if (!ownerColor) {
        // Default special styles if not owned (though special tiles usually aren't owned except stocks?)
        // Stocks are effectively "owned" but here we mean Land ownership.
        // Special tiles like Start, Key, etc.
        switch (specialType) {
          case 'START': style.backgroundColor = 'rgba(34, 197, 94, 0.1)'; style.borderColor = '#22c55e'; break;
          case 'KEY': style.backgroundColor = 'rgba(234, 179, 8, 0.1)'; style.borderColor = '#eab308'; break;
          case 'WAR': style.backgroundColor = 'rgba(239, 68, 68, 0.1)'; style.borderColor = '#ef4444'; break;
          case 'TAX': style.backgroundColor = 'rgba(100, 116, 139, 0.1)'; style.borderColor = '#64748b'; break;
          case 'STOCK': style.backgroundColor = 'rgba(59, 130, 246, 0.1)'; style.borderColor = '#3b82f6'; break;
          default: break;
        }
      }
    }

    return style;
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
      <button type="button" onClick={onClick} className={classes} style={cardStyle} data-region={region ?? undefined}>
        {body}
      </button>
    );
  }

  return (
    <div className={classes} style={cardStyle} data-region={region ?? undefined}>
      {body}
    </div>
  );
};

export default AssetCard;

