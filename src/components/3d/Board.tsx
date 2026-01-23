import { useMemo } from 'react';
import Tile from './Tile';
import Player from './Player';
import { generateBoardTiles } from '../../utils/boardUtils';
import StockBoard from './StockBoard';

const Board = () => {
  const tiles = useMemo(() => generateBoardTiles(), []);

  return (
    <group rotation={[0, 0, 0]} position={[0, 0, 0]}>
      <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#08080e" roughness={0.9} />
      </mesh>

      <group>
        {tiles.map((tile) => (
          <Tile key={tile.id} tile={tile} />
        ))}
        <Player />
        <StockBoard />
      </group>
    </group>
  );
};

export default Board;
