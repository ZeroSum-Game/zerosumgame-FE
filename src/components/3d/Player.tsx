import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import useGameStore from '../../store/useGameStore';
import { getTileTransform, BOARD_DATA } from '../../utils/boardUtils';

const Player = () => {
  const groupRef = useRef<THREE.Group>(null);
  const playerIndex = useGameStore((state) => state.playerIndex);

  const targetPos = useMemo(() => {
    const { position } = getTileTransform(playerIndex);
    return new THREE.Vector3(position[0], position[1] + 0.5, position[2]);
  }, [playerIndex]);

  const setShowBuyModal = useGameStore((state) => state.setShowBuyModal);
  const lands = useGameStore((state) => state.lands);
  const processedTileRef = useRef<number | null>(null);

  useMemo(() => {
    processedTileRef.current = null;
  }, [playerIndex]);

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;

    const distance = group.position.distanceTo(targetPos);

    if (distance > 0.05) {
      const speed = 8 * delta;
      const moveDir = new THREE.Vector3().subVectors(targetPos, group.position).normalize();

      if (distance < speed) {
        group.position.copy(targetPos);
      } else {
        group.position.add(moveDir.multiplyScalar(speed));
      }

      // Hopping animation
      if (distance > 0.1) {
        group.position.y = targetPos.y + Math.abs(Math.sin(distance * 3)) * 1.5;
        // Slight rotation while moving
        group.rotation.y += delta * 5;
      } else {
        group.position.y = THREE.MathUtils.lerp(group.position.y, targetPos.y, 8 * delta);
      }
    } else {
      // Arrived - gentle floating animation
      group.position.y = targetPos.y + Math.sin(Date.now() * 0.003) * 0.05;

      // Arrival logic
      if (processedTileRef.current !== playerIndex) {
        processedTileRef.current = playerIndex;

        const currentSpace = BOARD_DATA[playerIndex];
        const isOwned = !!lands[playerIndex];

        if (currentSpace && currentSpace.type === 'COUNTRY' && !isOwned) {
          setShowBuyModal(true, {
            index: playerIndex,
            name: currentSpace.name,
            price: currentSpace.price
          });
        }
      }
    }
  });

  return (
    <group ref={groupRef} position={[targetPos.x, targetPos.y, targetPos.z]}>
      {/* Base platform */}
      <mesh position={[0, 0, 0]} castShadow>
        <cylinderGeometry args={[0.4, 0.5, 0.15, 16]} />
        <meshStandardMaterial color="#1e40af" roughness={0.3} metalness={0.5} />
      </mesh>

      {/* Body - main cylinder */}
      <mesh position={[0, 0.45, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.35, 0.7, 16]} />
        <meshStandardMaterial
          color="#3b82f6"
          roughness={0.2}
          metalness={0.6}
        />
      </mesh>

      {/* Neck */}
      <mesh position={[0, 0.85, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.25, 0.15, 16]} />
        <meshStandardMaterial color="#60a5fa" roughness={0.3} metalness={0.5} />
      </mesh>

      {/* Head - sphere */}
      <mesh position={[0, 1.1, 0]} castShadow>
        <sphereGeometry args={[0.25, 16, 16]} />
        <meshStandardMaterial
          color="#93c5fd"
          roughness={0.2}
          metalness={0.4}
        />
      </mesh>

      {/* Crown/hat */}
      <mesh position={[0, 1.35, 0]} castShadow>
        <coneGeometry args={[0.15, 0.25, 8]} />
        <meshStandardMaterial
          color="#fbbf24"
          roughness={0.2}
          metalness={0.7}
          emissive="#f59e0b"
          emissiveIntensity={0.2}
        />
      </mesh>

      {/* Glow ring at base */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.5, 0.7, 32]} />
        <meshBasicMaterial color="#60a5fa" transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};

export default Player;
