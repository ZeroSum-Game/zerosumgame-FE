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
  const isSelected = selectedTile === tile.id;

  const baseColor = useMemo(() => {
    switch (tile.space.type) {
      case 'START':
      case 'ISLAND':
        return '#2f2f2f';
      case 'STOCK':
        return '#ef4444';
      case 'KEY':
        return '#fbbf24';
      case 'COUNTRY': {
        switch (tile.space.continent) {
          case 'ASIA':
            return '#fde68a';
          case 'EUROPE':
            return '#bfdbfe';
          case 'AFRICA':
            return '#bbf7d0';
          case 'AMERICA':
            return '#fbcfe8';
          default:
            return '#e5e7eb';
        }
      }
      case 'MINIGAME':
        return '#c4b5fd';
      case 'TAX':
        return '#94a3b8';
      default:
        return '#e7e2d2';
    }
  }, [tile.space.continent, tile.space.type]);

  const tileColor = useMemo(() => {
    if (isSelected) return '#ffffff';
    if (hovered) return '#7dd3fc';
    return baseColor;
  }, [baseColor, hovered, isSelected]);

  return (
    <mesh
      position={tile.position}
      rotation={tile.rotation}
      onPointerOver={(event) => {
        event.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={(event) => {
        event.stopPropagation();
        setHovered(false);
      }}
      onClick={(event) => {
        event.stopPropagation();
        selectTile(tile.id);
      }}
      scale={isSelected || hovered ? 1.08 : 1}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[1.4, 0.25, 1.4]} />
      <meshStandardMaterial
        color={tileColor}
        metalness={tile.space.type === 'KEY' ? 0.8 : 0.15}
        roughness={tile.space.type === 'KEY' ? 0.2 : 0.7}
        emissive={isSelected ? '#2dd4bf' : '#000000'}
        emissiveIntensity={isSelected ? 0.35 : 0}
      />

      <Billboard position={[0, 0.36, 0]} follow>
        <Text
          fontSize={0.22}
          color="#0b0b0b"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.01}
          outlineColor="#ffffff"
        >
          {tile.space.name}
        </Text>
        {typeof tile.space.price === 'number' ? (
          <Text
            position={[0, -0.26, 0]}
            fontSize={0.14}
            color="#111827"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.01}
            outlineColor="#ffffff"
          >
            {tile.space.price.toLocaleString()}
          </Text>
        ) : null}
      </Billboard>
    </mesh>
  );
};

export default Tile;
