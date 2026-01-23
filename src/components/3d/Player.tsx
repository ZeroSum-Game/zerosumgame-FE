import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import useGameStore from '../../store/useGameStore';
import { getTileTransform } from '../../utils/boardUtils';

const lerpFactorFromDelta = (delta: number, speed: number) => {
  return 1 - Math.exp(-speed * delta);
};

const Player = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  const playerIndex = useGameStore((state) => state.playerIndex);

  const target = useMemo(() => {
    const { position } = getTileTransform(playerIndex);
    return new THREE.Vector3(position[0], position[1] + 0.75, position[2]);
  }, [playerIndex]);

  useFrame((_, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    // Smoothly approach the current target tile.
    mesh.position.lerp(target, lerpFactorFromDelta(delta, 8));
  });

  return (
    <mesh ref={meshRef} castShadow receiveShadow>
      <cylinderGeometry args={[0.35, 0.35, 1.1, 16]} />
      <meshStandardMaterial color="#ef4444" roughness={0.35} metalness={0.2} />
    </mesh>
  );
};

export default Player;

