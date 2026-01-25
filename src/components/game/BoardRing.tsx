import type { ReactNode } from 'react';
import { useMemo } from 'react';
import useGameStore, { STOCK_INFO, TILE_TO_STOCK, type StockSymbol } from '../../store/useGameStore';
import { BOARD_DATA } from '../../utils/boardUtils';
import { getPlayerSlotColor } from '../../utils/playerSlotColors';
import { getRegionForBoardSpace } from '../../utils/regionCues';
import AssetCard from './AssetCard';

const STOCK_LABEL: Record<StockSymbol, string> = {
  SAMSUNG: '삼성',
  SK_HYNIX: '하이닉스',
  HYUNDAI: '현대차',
  BITCOIN: '비트코인',
  GOLD: '금',
};

const TILE_LABEL: Partial<Record<number, string>> = {
  7: '한국', // 대한민국
  27: '아르헨', // 아르헨티나
};

const getGridPosition = (tileId: number) => {
  // 9x9 ring
  if (tileId <= 8) return { row: 9, col: tileId + 1 };
  if (tileId <= 15) return { row: 8 - (tileId - 9), col: 9 };
  if (tileId <= 24) return { row: 1, col: 9 - (tileId - 16) };
  return { row: 2 + (tileId - 25), col: 1 };
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

  return (
    <div className="board-ring">
      <div className="board-ring-grid">
        {BOARD_DATA.map((space) => {
          const { row, col } = getGridPosition(space.id);

          const isActive = activeTileId === space.id;
          const isSelected = selectedAssetId === space.id;
          const symbol = space.type === 'STOCK' ? TILE_TO_STOCK[space.id] : undefined;
          const occupantColors = occupantColorsByTile.get(space.id) ?? [];
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
            </div>
          );
        })}

        <div className="board-ring-center">{center}</div>
      </div>
    </div>
  );
};

export default BoardRing;
