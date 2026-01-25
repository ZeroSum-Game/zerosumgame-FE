import type { ReactNode } from 'react';
import { useMemo } from 'react';
import useGameStore, { CHARACTER_INFO, STOCK_INFO, TILE_TO_STOCK, type StockSymbol } from '../../store/useGameStore';
import { BOARD_DATA } from '../../utils/boardUtils';
import { getPlayerSlotColor } from '../../utils/playerSlotColors';
import { getRegionForBoardSpace } from '../../utils/regionCues';
import AssetCard from './AssetCard';

const STOCK_LABEL: Record<StockSymbol, string> = {
  SAMSUNG: '삼성',
  TESLA: '테슬라',
  LOCKHEED: '록히드',
  BITCOIN: '비트코인',
  GOLD: '금',
};

const TILE_LABEL: Partial<Record<number, string>> = {
  7: '한국', // 대한민국
  27: '아르헨', // 아르헨티나
};

const getGridPosition = (tileId: number) => {
  // 9x9 ring
  if (tileId <= 7) return { row: 9, col: 9 - tileId };
  if (tileId <= 15) return { row: 9 - (tileId - 8), col: 1 };
  if (tileId <= 23) return { row: 1, col: 1 + (tileId - 16) };
  return { row: 1 + (tileId - 24), col: 9 };
};

type Props = {
  center?: ReactNode;
  selectedAssetId: number | null;
  onSelectAsset: (tileId: number) => void;
  assetChange: Partial<Record<StockSymbol, { pct: number }>>;
  landChange: Record<number, { pct: number }>;
};

const BoardRing = ({ center, selectedAssetId, onSelectAsset, assetChange, landChange }: Props) => {
  const assetPrices = useGameStore((s) => s.assetPrices);
  const landPrices = useGameStore((s) => s.landPrices);
  const players = useGameStore((s) => s.players);
  const currentPlayerIndex = useGameStore((s) => s.currentPlayerIndex);

  const currentPlayer = players[currentPlayerIndex] ?? null;
  const activeTileId = currentPlayer?.position ?? null;

  const occupantColorsByTile = useMemo(() => {
    const map = new Map<number, string[]>();
    players.forEach((p, index) => {
      const arr = map.get(p.position) ?? [];
      arr.push(getPlayerSlotColor(index));
      map.set(p.position, arr);
    });
    return map;
  }, [players]);

  const occupantAvatarsByTile = useMemo(() => {
    const map = new Map<number, { id: number; name: string; src: string }[]>();
    players.forEach((p) => {
      if (p.isBankrupt) return;
      const src = p.character ? CHARACTER_INFO[p.character].avatar : (p.avatar || '/assets/characters/default.png');
      const arr = map.get(p.position) ?? [];
      arr.push({ id: p.id, name: p.name, src });
      map.set(p.position, arr);
    });
    return map;
  }, [players]);

  return (
    <div className="board-ring">
      <div className="board-ring-grid">
        {BOARD_DATA.map((space) => {
          const { row, col } = getGridPosition(space.id);

          const isActive = activeTileId === space.id;
          const isSelected = selectedAssetId === space.id;
          const symbol = space.type === 'STOCK' ? TILE_TO_STOCK[space.id] : undefined;
          const occupantColors = occupantColorsByTile.get(space.id) ?? [];
          const occupantAvatars = occupantAvatarsByTile.get(space.id) ?? [];
          const region = getRegionForBoardSpace(space, { stockSymbol: symbol });

          const price =
            space.type === 'COUNTRY'
              ? (landPrices[space.id] ?? space.price ?? null)
              : symbol
              ? assetPrices[symbol]
              : null;

          const changePct =
            space.type === 'COUNTRY'
              ? landChange[space.id]?.pct ?? 0
              : symbol
              ? assetChange[symbol]?.pct ?? 0
              : null;

          return (
            <div
              key={space.id}
              className="board-ring-cell"
              style={{ gridRow: row, gridColumn: col }}
            >
              <div className="relative h-full w-full">
                <AssetCard
                  name={
                    space.type === 'STOCK' && symbol
                      ? STOCK_LABEL[symbol] ?? STOCK_INFO[symbol].nameKr
                      : TILE_LABEL[space.id] ?? space.name
                  }
                  price={typeof price === 'number' ? price : null}
                  changePct={typeof changePct === 'number' ? changePct : null}
                  active={isActive}
                  selected={isSelected}
                  occupantColors={occupantColors}
                  region={region}
                  showPrice={false}
                  onClick={() => onSelectAsset(space.id)}
                />

                {occupantAvatars.length > 0 && (
                  <div className="board-piece-stack" aria-hidden="true">
                    {occupantAvatars.slice(0, 4).map((o) => (
                      <img
                        key={o.id}
                        src={o.src}
                        alt={o.name}
                        className="board-piece-img"
                        draggable={false}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        <div className="board-ring-center">{center}</div>
      </div>
    </div>
  );
};

export default BoardRing;
