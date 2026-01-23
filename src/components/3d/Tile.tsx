import { Html, RoundedBox } from '@react-three/drei';
import { useMemo, useState } from 'react';
import useGameStore from '../../store/useGameStore';
import { BoardTile } from '../../utils/boardUtils';

type TileProps = {
  tile: BoardTile;
};

const Tile = ({ tile }: TileProps) => {
  const [hovered, setHovered] = useState(false);
  const selectedTile = useGameStore((state) => state.selectedTile);
  const selectTile = useGameStore((state) => state.selectTile);
  const lands = useGameStore((state) => state.lands);
  const isSelected = selectedTile === tile.id;
  const landInfo = lands[tile.id];

  // Continent color bands
  const continentColor = useMemo(() => {
    if (tile.space.type !== 'COUNTRY') return null;
    switch (tile.space.continent) {
      case 'ASIA': return '#f59e0b';
      case 'EUROPE': return '#3b82f6';
      case 'AFRICA': return '#22c55e';
      case 'AMERICA': return '#ec4899';
      default: return '#6b7280';
    }
  }, [tile.space.continent, tile.space.type]);

  // Base tile color
  const baseColor = useMemo(() => {
    switch (tile.space.type) {
      case 'START': return '#10b981';
      case 'ISLAND': return '#0ea5e9';
      case 'STOCK': return '#f43f5e';
      case 'KEY': return '#eab308';
      case 'COUNTRY': return '#f1f5f9';
      case 'MINIGAME': return '#a855f7';
      case 'TAX': return '#64748b';
      default: return '#e2e8f0';
    }
  }, [tile.space.type]);

  // Icon based on type
  const tileIcon = useMemo(() => {
    switch (tile.space.type) {
      case 'START': return '🚀';
      case 'ISLAND': return '🏝️';
      case 'STOCK': return '📈';
      case 'KEY': return '🔑';
      case 'MINIGAME': return '🎮';
      case 'TAX': return '🏛️';
      default: return null;
    }
  }, [tile.space.type]);

  const tileWidth = 2.5;
  const tileHeight = 0.3;
  const tileDepth = 2.5;

  return (
    <group position={tile.position} rotation={tile.rotation}>
      {/* Main Tile */}
      <RoundedBox
        args={[tileWidth, tileHeight, tileDepth]}
        radius={0.06}
        smoothness={4}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
        onPointerOut={(e) => { e.stopPropagation(); setHovered(false); }}
        onClick={(e) => { e.stopPropagation(); selectTile(tile.id); }}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial
          color={isSelected ? '#fef3c7' : (hovered ? '#fefce8' : baseColor)}
          roughness={0.25}
          metalness={0.05}
        />
      </RoundedBox>

      {/* Continent color stripe */}
      {continentColor && (
        <mesh position={[0, tileHeight / 2 + 0.01, -tileDepth / 2 + 0.2]}>
          <boxGeometry args={[tileWidth - 0.1, 0.04, 0.35]} />
          <meshStandardMaterial color={continentColor} roughness={0.3} metalness={0.3} />
        </mesh>
      )}

      {/* Selection glow */}
      {isSelected && (
        <mesh position={[0, -0.05, 0]}>
          <boxGeometry args={[tileWidth + 0.15, 0.08, tileDepth + 0.15]} />
          <meshBasicMaterial color="#fbbf24" transparent opacity={0.7} />
        </mesh>
      )}

      {/* Hover highlight */}
      {hovered && !isSelected && (
        <mesh position={[0, tileHeight / 2 + 0.02, 0]}>
          <boxGeometry args={[tileWidth - 0.05, 0.02, tileDepth - 0.05]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.3} />
        </mesh>
      )}

      {/* Building if owned - 2 stages: LAND (small) or LANDMARK (large) */}
      {landInfo && (
        <group position={[0.5, tileHeight / 2, 0.5]}>
          {landInfo.type === 'LAND' ? (
            // Stage 1: Land - Small house
            <>
              <mesh position={[0, 0.15, 0]} castShadow>
                <boxGeometry args={[0.35, 0.25, 0.35]} />
                <meshStandardMaterial color={landInfo.owner === 'Player 1' ? '#3b82f6' : '#ef4444'} />
              </mesh>
              <mesh position={[0, 0.35, 0]} castShadow>
                <coneGeometry args={[0.28, 0.2, 4]} />
                <meshStandardMaterial color={landInfo.owner === 'Player 1' ? '#1d4ed8' : '#dc2626'} />
              </mesh>
            </>
          ) : (
            // Stage 2: Landmark - Tall tower
            <>
              <mesh position={[0, 0.25, 0]} castShadow>
                <boxGeometry args={[0.4, 0.45, 0.4]} />
                <meshStandardMaterial color={landInfo.owner === 'Player 1' ? '#1d4ed8' : '#dc2626'} />
              </mesh>
              <mesh position={[0, 0.6, 0]} castShadow>
                <boxGeometry args={[0.3, 0.35, 0.3]} />
                <meshStandardMaterial color={landInfo.owner === 'Player 1' ? '#3b82f6' : '#ef4444'} />
              </mesh>
              <mesh position={[0, 0.9, 0]} castShadow>
                <coneGeometry args={[0.22, 0.35, 4]} />
                <meshStandardMaterial
                  color={landInfo.owner === 'Player 1' ? '#60a5fa' : '#f87171'}
                  emissive={landInfo.owner === 'Player 1' ? '#3b82f6' : '#ef4444'}
                  emissiveIntensity={0.3}
                />
              </mesh>
            </>
          )}
        </group>
      )}

      {/* Label */}
      <Html
        position={[0, 0.8, 0]}
        center
        distanceFactor={20}
        style={{ pointerEvents: 'none' }}
        occlude={false}
      >
        <div className="flex flex-col items-center whitespace-nowrap text-center">
          {tileIcon && <span className="text-base">{tileIcon}</span>}
          <span
            className="rounded bg-black/60 px-1.5 py-0.5 text-[11px] font-bold text-white"
            style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
          >
            {tile.space.name}
          </span>
          {tile.space.price && (
            <span className="mt-0.5 text-[10px] font-semibold text-yellow-400 drop-shadow">
              ₩{(tile.space.price / 10000).toFixed(0)}만
            </span>
          )}
        </div>
      </Html>
    </group>
  );
};

export default Tile;
