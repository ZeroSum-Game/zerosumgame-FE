import { Billboard, Text } from '@react-three/drei';
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

  // Pastel Colors
  const baseColor = useMemo(() => {
    switch (tile.space.type) {
      case 'START': return '#a7f3d0'; // Soft Green
      case 'ISLAND': return '#93c5fd'; // Soft Blue
      case 'STOCK': return '#fca5a5'; // Soft Red
      case 'KEY': return '#fde047'; // Soft Yellow
      case 'COUNTRY': {
        switch (tile.space.continent) {
          case 'ASIA': return '#fef08a'; // Pastel Yellow
          case 'EUROPE': return '#bae6fd'; // Pastel Blue
          case 'AFRICA': return '#bbf7d0'; // Pastel Green
          case 'AMERICA': return '#fbcfe8'; // Pastel Pink
          default: return '#f3f4f6';
        }
      }
      case 'MINIGAME': return '#ddd6fe'; // Pastel Purple
      case 'TAX': return '#cbd5e1'; // Pastel Grey
      default: return '#e2e8f0';
    }
  }, [tile.space.continent, tile.space.type]);

  const tileColor = isSelected ? '#ffffff' : (hovered ? '#e0f2fe' : baseColor);

  return (
    <mesh
      position={tile.position}
      rotation={tile.rotation}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
      onPointerOut={(e) => { e.stopPropagation(); setHovered(false); }}
      onClick={(e) => { e.stopPropagation(); selectTile(tile.id); }}
      scale={isSelected || hovered ? 1.05 : 1}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[1.4, 0.25, 1.4]} />
      <meshStandardMaterial
        color={tileColor}
        roughness={0.3}
        metalness={0.1}
        emissive={tileColor}
        emissiveIntensity={0.2}
      />

      {/* Tile Name Label */}
      <Billboard position={[0, 0.6, 0]} follow={false}>
        <Text
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={0.35}
          color="white"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.05}
          outlineColor="#000000"
          renderOrder={1}
        >
          {tile.space.name}
        </Text>
        {typeof tile.space.price === 'number' && (
          <Text
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, 0, 0.45]}
            fontSize={0.2}
            color="#fbbf24"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.02}
            outlineColor="#000000"
            renderOrder={1}
          >
            {tile.space.price.toLocaleString()}
          </Text>
        )}
      </Billboard>

      {/* Building Marker if Owned */}
      {landInfo && (
        <group position={[0, 0.5, 0]}>
          <mesh position={[0, 0, 0]} castShadow>
            <coneGeometry args={[0.3, 0.5, 4]} />
            <meshStandardMaterial color={landInfo.owner === 'Player 1' ? 'blue' : 'red'} />
          </mesh>
        </group>
      )}
    </mesh>
  );
};
export default Tile;
