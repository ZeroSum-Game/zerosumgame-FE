
import { formatKRW, formatKRWKoShort } from '../../utils/formatKRW';
import type { Region } from '../../utils/regionCues';

type Props = {
  name: string;
  price: number | null;
  changePct: number | null;
  active?: boolean;
  selected?: boolean;
  occupantColors?: string[];
  ownerColor?: string | null;
  region?: Region | null;
  showPrice?: boolean;
  onClick?: () => void;
  // [Merge Note] 2026-01-27: Added props for owner styling and special tile types
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
          case 'START':
            style.backgroundColor = 'rgba(34, 197, 94, 0.1)';
            style.borderColor = 'transparent'; // [User Request] Remove border
            break;
          case 'KEY':
            style.backgroundColor = 'rgba(234, 179, 8, 0.1)';
            style.borderColor = 'transparent';
            break;
          case 'WAR':
            style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
            style.borderColor = 'transparent';
            break;
          case 'TAX':
            style.backgroundColor = 'rgba(100, 116, 139, 0.1)';
            style.borderColor = 'transparent';
            break;
          case 'STOCK':
            style.backgroundColor = 'rgba(147, 51, 234, 0.15)';
            style.borderColor = 'transparent'; // [User Request] Remove border
            style.boxShadow = 'none';
            break;
          default: break;
        }

        // [User Request] Center align icon and text for special tiles
        // style.alignItems = 'center'; // Handled by CSS now
        // style.textAlign = 'center'; // Handled by CSS now
        style.justifyContent = 'center'; // Keep vertical centering for Special Types
      }
    }

    return style;
  })();

  const getTileIcon = (type: string | undefined, name: string, specialType?: string) => {
    if (specialType === 'STOCK') return (
      <svg className="h-8 w-8 text-fuchsia-400 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    );
    if (name === '황금열쇠') return (
      <svg className="h-8 w-8 text-yellow-400 mb-1 golden-key-anim" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
      </svg>
    );
    if (name === '국세청') return (
      <svg className="h-8 w-8 text-slate-400 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    );
    if (name === '오락실') return (
      <svg className="h-8 w-8 text-purple-400 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
    if (name === '우주여행') return (
      <svg className="h-8 w-8 text-sky-400 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    );
    if (name === '월드컵') return (
      <svg className="h-8 w-8 text-amber-400 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3l2 3h5l-1 4.5 2 2.5-4 1.5L14 19h-4l1.5-5.5-4-1.5 2-2.5L5 6h5l2-3z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 19c-1.5 0-3 1-3 2h16c0-1-1.5-2-3-2h-10z" />
      </svg>
    );
    if (name === '전쟁') return (
      <svg className="h-8 w-8 text-red-500 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    );
    if (name === '시작') return (
      <svg className="h-8 w-8 text-emerald-400 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-8a2 2 0 012-2h14a2 2 0 012 2v8M3 13l4-8h10l4 8" />
      </svg>
    );
    return null;
  }

  const body = (
    <>
      {/* Icon support */}
      {getTileIcon(undefined, name, specialType)}

      <div className="asset-card-name" title={name}>
        {name}
      </div>
      {/* Only show stats if NOT a special type (icon type) */}
      {!specialType && (showPrice || typeof changePct === 'number') && (
        <div className="asset-card-bottom">
          {showPrice && (
            <div className="asset-card-price" title={price === null ? '—' : formatKRW(price)}>
              {price === null ? '—' : formatKRWKoShort(price)}
            </div>
          )}
          {typeof changePct === 'number' && (
            <div className={`asset-card-change ${isUp ? 'dash-up' : isDown ? 'dash-down' : 'dash-flat'}`} title={changeLabel}>
              {changeLabel}
            </div>
          )}
        </div>
      )}
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
