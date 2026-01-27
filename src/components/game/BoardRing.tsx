import type { ReactNode } from 'react';
import { useMemo } from 'react';
import useGameStore, { CHARACTER_INFO, STOCK_INFO, TILE_TO_STOCK, type Player, type StockSymbol } from '../../store/useGameStore';
import { BOARD_DATA } from '../../utils/boardUtils';
import { getPlayerSlotColor } from '../../utils/playerSlotColors';
import { getRegionForBoardSpace } from '../../utils/regionCues';
import AssetCard from './AssetCard';

const STOCK_LABEL: Record<StockSymbol, string> = {
  SAMSUNG: '삼성',
  LOCKHEED: '록히드마틴',
  TESLA: '테슬라',
  BITCOIN: '비트코인',
  GOLD: '금',
};

const TILE_LABEL: Partial<Record<number, string>> = {
  7: '한국', // 대한민국
  27: '아르헨', // 아르헨티나
};

const getPlayerColor = (player: Player, index: number) =>
  player.character ? CHARACTER_INFO[player.character].color : getPlayerSlotColor(index);

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



import CharacterPiece from './CharacterPiece';

const BoardRing = ({ center, selectedAssetId, onSelectAsset, assetChange, landChange }: Props) => {
  const assetPrices = useGameStore((s) => s.assetPrices);
  const landPrices = useGameStore((s) => s.landPrices);
  const lands = useGameStore((s) => s.lands);
  const players = useGameStore((s) => s.players);
  const currentPlayerIndex = useGameStore((s) => s.currentPlayerIndex);

  const currentPlayer = players[currentPlayerIndex] ?? null;
  const activeTileId = currentPlayer?.position ?? null;

  const occupantColorsByTile = useMemo(() => {
    const map = new Map<number, string[]>();
    players.forEach((p, index) => {
      const arr = map.get(p.position) ?? [];
      arr.push(getPlayerColor(p, index));
      map.set(p.position, arr);
    });
    return map;
  }, [players]);
  

  return (
    <div className="board-ring relative">
      {/* [Merge Note] 2026-01-27: Added Overlay Layer for independent character movement */}
      {/* Overlay Layer for Characters */}
      <div className="board-ring-overlay">
        {players.map((p, index) => {
          if (p.isBankrupt) return null;
          const { row, col } = getGridPosition(p.position);

          const playersOnThisTile = players.filter(pl => pl.position === p.position && !pl.isBankrupt);
          const indexOnTile = playersOnThisTile.findIndex(pl => pl.id === p.id);
          const offset = indexOnTile * 5;

          return (
            <div
              key={p.id}
              className="character-token-wrapper"
              style={{
                gridRow: row,
                gridColumn: col,
                transform: `translate(${offset}px, ${offset}px)`,
                zIndex: 20 + indexOnTile
              }}
            >
              <CharacterPiece
                name={p.name}
                avatar={p.character ? CHARACTER_INFO[p.character].avatar : (p.avatar || '/assets/characters/default.png')}
                color={getPlayerColor(p, index)}
                isMe={false}
              />
            </div>
          );
        })}
      </div>

      <div className="board-ring-grid">
        {BOARD_DATA.map((space) => {
          const { row, col } = getGridPosition(space.id);

          const isActive = activeTileId === space.id;
          const isSelected = selectedAssetId === space.id;
          const symbol = space.type === 'STOCK' ? TILE_TO_STOCK[space.id] : undefined;
          const occupantColors = occupantColorsByTile.get(space.id) ?? [];
          const region = getRegionForBoardSpace(space, { stockSymbol: symbol });
          const landInfo = space.type === 'COUNTRY' ? lands[space.id] : undefined;
          const landOwner = landInfo ? players.find((p) => p.id === landInfo.ownerId) ?? null : null;
          const landOwnerIndex = landOwner ? players.findIndex((p) => p.id === landOwner.id) : -1;
          // [Merge Note] 2026-01-27: Added logic to determine land owner color
          const land = lands[space.id];
          let ownerColor: string | undefined;
          if (landOwner) {
            ownerColor = getPlayerColor(landOwner, landOwnerIndex >= 0 ? landOwnerIndex : 0);
          }

          let specialType: string | undefined = undefined;
          if (space.type !== 'COUNTRY') {
            specialType = space.type;
            if (space.type === 'ISLAND') {
              if (space.name === '전쟁') specialType = 'WAR';
            }
          }

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
                  ownerColor={ownerColor}
                  region={region}
                  showPrice={false}
                  onClick={() => onSelectAsset(space.id)}
                  specialType={specialType}
                />

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
