import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import useGameStore, { STOCK_INFO, TILE_TO_STOCK, type StockSymbol } from '../../store/useGameStore';
import { BOARD_DATA } from '../../utils/boardUtils';
import AssetCard from './AssetCard';

const STOCK_SYMBOLS: StockSymbol[] = ['SAMSUNG', 'SK_HYNIX', 'HYUNDAI', 'BITCOIN', 'GOLD'];

const pctChange = (prev: number, current: number) => {
  if (!prev) return 0;
  return ((current - prev) / prev) * 100;
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
};

const BoardRing = ({ center }: Props) => {
  const assetPrices = useGameStore((s) => s.assetPrices);
  const landPrices = useGameStore((s) => s.landPrices);
  const lands = useGameStore((s) => s.lands);
  const players = useGameStore((s) => s.players);
  const currentPlayerIndex = useGameStore((s) => s.currentPlayerIndex);
  const selectedTile = useGameStore((s) => s.selectedTile);
  const selectTile = useGameStore((s) => s.selectTile);

  const currentPlayer = players[currentPlayerIndex] ?? null;
  const activeTileId = currentPlayer?.position ?? null;

  const prevAssetPricesRef = useRef(assetPrices);
  const prevLandPricesRef = useRef(landPrices);
  const [assetChanges, setAssetChanges] = useState<Record<StockSymbol, number>>({} as Record<StockSymbol, number>);
  const [landChanges, setLandChanges] = useState<Record<number, number>>({});

  useEffect(() => {
    const nextAssetChanges: Record<StockSymbol, number> = {} as Record<StockSymbol, number>;
    STOCK_SYMBOLS.forEach((symbol) => {
      nextAssetChanges[symbol] = pctChange(prevAssetPricesRef.current[symbol], assetPrices[symbol]);
    });
    setAssetChanges(nextAssetChanges);
    prevAssetPricesRef.current = { ...assetPrices };
  }, [assetPrices]);

  useEffect(() => {
    const nextLandChanges: Record<number, number> = {};
    Object.entries(landPrices).forEach(([id, price]) => {
      const tileId = Number(id);
      const prev = prevLandPricesRef.current[tileId];
      nextLandChanges[tileId] = prev ? pctChange(prev, price) : 0;
    });
    setLandChanges(nextLandChanges);
    prevLandPricesRef.current = { ...landPrices };
  }, [landPrices]);

  const playersByTile = useMemo(() => {
    const map = new Map<number, number[]>();
    players.forEach((p) => {
      const arr = map.get(p.position) ?? [];
      arr.push(p.id);
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
          const isSelected = selectedTile === space.id;

          const land = lands[space.id];
          const owner = land ? players.find((p) => p.id === land.ownerId) ?? null : null;

          const playerIdsHere = playersByTile.get(space.id) ?? [];
          const symbol = space.type === 'STOCK' ? TILE_TO_STOCK[space.id] : undefined;

          const price =
            space.type === 'COUNTRY'
              ? (landPrices[space.id] ?? space.price ?? null)
              : symbol
              ? assetPrices[symbol]
              : null;

          const changePct =
            space.type === 'COUNTRY'
              ? landChanges[space.id] ?? 0
              : symbol
              ? assetChanges[symbol] ?? 0
              : null;

          const meta =
            space.type === 'STOCK' && symbol
              ? STOCK_INFO[symbol].nameKr
              : space.type === 'COUNTRY'
              ? space.continent ?? 'COUNTRY'
              : space.type;

          const corner = (
            <div className="asset-card-corner-stack">
              {owner?.character && (
                <span
                  className="asset-card-dot"
                  title={`Owner: ${owner.name}`}
                  style={{ backgroundColor: 'rgba(241, 245, 249, 0.78)' }}
                />
              )}
              {playerIdsHere.length > 0 && (
                <span className="asset-card-count" title={`${playerIdsHere.length} player(s) here`}>
                  {playerIdsHere.length}
                </span>
              )}
            </div>
          );

          return (
            <div
              key={space.id}
              className="board-ring-cell"
              style={{ gridRow: row, gridColumn: col }}
            >
              <AssetCard
                name={space.type === 'STOCK' && symbol ? STOCK_INFO[symbol].name : space.name}
                meta={meta}
                price={typeof price === 'number' ? price : null}
                changePct={typeof changePct === 'number' ? changePct : null}
                active={isActive}
                selected={isSelected}
                corner={corner}
                onClick={() => selectTile(space.id)}
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
