import { Suspense, useMemo } from 'react';
import { RoundedBox } from '@react-three/drei';
import Tile from './Tile';
import Player from './Player';
import { generateBoardTiles, BOARD_DIMENSIONS } from '../../utils/boardUtils';
import StockBoard from './StockBoard';

const Board = () => {
  const tiles = useMemo(() => generateBoardTiles(), []);
  const { width: BOARD_WIDTH, height: BOARD_HEIGHT } = BOARD_DIMENSIONS;

  return (
    <group>
      {/* Outer table surface */}
      <mesh position={[0, -0.3, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial color="#1b4d2c" roughness={0.95} />
      </mesh>

      {/* Board base */}
      <RoundedBox
        args={[BOARD_WIDTH + 5, 0.4, BOARD_HEIGHT + 5]}
        radius={0.3}
        smoothness={4}
        position={[0, -0.15, 0]}
        receiveShadow
      >
        <meshStandardMaterial color="#b77942" roughness={0.65} metalness={0.12} />
      </RoundedBox>

      {/* Inner play area */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[BOARD_WIDTH - 2, BOARD_HEIGHT - 2]} />
        <meshStandardMaterial color="#1f6b68" roughness={0.55} metalness={0.08} />
      </mesh>

      {/* Board edge lines */}
      {/* Horizontal lines */}
      <mesh position={[0, 0.02, BOARD_HEIGHT / 2 - 0.5]}>
        <boxGeometry args={[BOARD_WIDTH - 1, 0.02, 0.1]} />
        <meshStandardMaterial color="#fff7ed" roughness={0.35} metalness={0.25} />
      </mesh>
      <mesh position={[0, 0.02, -BOARD_HEIGHT / 2 + 0.5]}>
        <boxGeometry args={[BOARD_WIDTH - 1, 0.02, 0.1]} />
        <meshStandardMaterial color="#fff7ed" roughness={0.35} metalness={0.25} />
      </mesh>
      {/* Vertical lines */}
      <mesh position={[BOARD_WIDTH / 2 - 0.5, 0.02, 0]}>
        <boxGeometry args={[0.1, 0.02, BOARD_HEIGHT - 1]} />
        <meshStandardMaterial color="#fff7ed" roughness={0.35} metalness={0.25} />
      </mesh>
      <mesh position={[-BOARD_WIDTH / 2 + 0.5, 0.02, 0]}>
        <boxGeometry args={[0.1, 0.02, BOARD_HEIGHT - 1]} />
        <meshStandardMaterial color="#fff7ed" roughness={0.35} metalness={0.25} />
      </mesh>

      {/* Center decoration */}
      <group position={[0, 0.03, 0]}>
        {/* Center circle */}
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[3.5, 64]} />
          <meshStandardMaterial color="#0f3d54" roughness={0.55} metalness={0.12} />
        </mesh>

        {/* Inner ring */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
          <ringGeometry args={[2, 3, 64]} />
          <meshStandardMaterial color="#0284c7" roughness={0.35} metalness={0.25} />
        </mesh>

        {/* Center crystal */}
        <mesh position={[0, 0.6, 0]} castShadow>
          <octahedronGeometry args={[0.5, 0]} />
          <meshStandardMaterial
            color="#7dd3fc"
            roughness={0.1}
            metalness={0.8}
            emissive="#0ea5e9"
            emissiveIntensity={0.35}
          />
        </mesh>
      </group>

      {/* Continent color indicators */}
      <group position={[0, 0.04, 0]}>
        <mesh position={[-1.5, 0, -1.5]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1, 0.25]} />
          <meshStandardMaterial color="#f59e0b" />
        </mesh>
        <mesh position={[1.5, 0, -1.5]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1, 0.25]} />
          <meshStandardMaterial color="#3b82f6" />
        </mesh>
        <mesh position={[-1.5, 0, 1.5]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1, 0.25]} />
          <meshStandardMaterial color="#22c55e" />
        </mesh>
        <mesh position={[1.5, 0, 1.5]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1, 0.25]} />
          <meshStandardMaterial color="#ec4899" />
        </mesh>
      </group>

      {/* Tiles */}
      <Suspense fallback={null}>
        {tiles.map((tile) => (
          <Tile key={tile.id} tile={tile} />
        ))}
      </Suspense>

      {/* Player */}
      <Player />

      {/* Stock Board (now renders null, moved to UI) */}
      <Suspense fallback={null}>
        <StockBoard />
      </Suspense>
    </group>
  );
};

export default Board;
