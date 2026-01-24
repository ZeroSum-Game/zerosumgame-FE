import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import useGameStore, { CHARACTER_INFO } from '../../store/useGameStore';
import { getTileTransform } from '../../utils/boardUtils';

const TOKEN_OFFSETS: [number, number][] = [
  [-0.45, -0.45],
  [0.45, -0.45],
  [-0.45, 0.45],
  [0.45, 0.45],
];

const PlayerToken = ({ playerId, tokenIndex }: { playerId: number; tokenIndex: number }) => {
  const groupRef = useRef<THREE.Group>(null);
  const player = useGameStore((state) => state.players.find((p) => p.id === playerId) ?? null);
  const currentPlayerIndex = useGameStore((state) => state.currentPlayerIndex);
  const phase = useGameStore((state) => state.phase);
  const currentPlayerId = useGameStore((state) => state.players[state.currentPlayerIndex]?.id ?? null);

  const offset = TOKEN_OFFSETS[tokenIndex % TOKEN_OFFSETS.length] ?? [0, 0];

  const targetPos = useMemo(() => {
    const positionIndex = player?.position ?? 0;
    const { position } = getTileTransform(positionIndex);
    return new THREE.Vector3(position[0] + offset[0], position[1] + 0.5, position[2] + offset[1]);
  }, [player?.position, offset]);

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
        group.position.y = targetPos.y + Math.abs(Math.sin(distance * 3)) * 1.2;
        // Slight rotation while moving
        group.rotation.y += delta * 5;
      } else {
        group.position.y = THREE.MathUtils.lerp(group.position.y, targetPos.y, 8 * delta);
      }
    } else {
      // Arrived - gentle floating animation
      group.position.y = targetPos.y + Math.sin(Date.now() * 0.003) * 0.05;
      group.rotation.y = THREE.MathUtils.lerp(group.rotation.y, 0, 8 * delta);
    }

    const isActive = currentPlayerId === playerId;
    const isMoving = isActive && phase === 'MOVING';
    if (!isMoving) return;
    group.rotation.y += delta * 2.5;
  });

  if (!player || player.isBankrupt) return null;

  const color = player.character ? CHARACTER_INFO[player.character].color : '#60a5fa';
  const emoji = player.character ? CHARACTER_INFO[player.character].emoji : '🙂';
  const isActive = currentPlayerIndex >= 0 && currentPlayerId === playerId;

  return (
    <group ref={groupRef} position={[targetPos.x, targetPos.y, targetPos.z]}>
      {/* Base platform */}
      <mesh position={[0, 0, 0]} castShadow>
        <cylinderGeometry args={[0.4, 0.5, 0.15, 16]} />
        <meshStandardMaterial color={new THREE.Color(color).multiplyScalar(0.6)} roughness={0.3} metalness={0.5} />
      </mesh>

      {/* Body - main cylinder */}
      <mesh position={[0, 0.45, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.35, 0.7, 16]} />
        <meshStandardMaterial
          color={color}
          roughness={0.2}
          metalness={0.6}
        />
      </mesh>

      {/* Neck */}
      <mesh position={[0, 0.85, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.25, 0.15, 16]} />
        <meshStandardMaterial color={new THREE.Color(color).multiplyScalar(1.2)} roughness={0.3} metalness={0.5} />
      </mesh>

      {/* Head - sphere */}
      <mesh position={[0, 1.1, 0]} castShadow>
        <sphereGeometry args={[0.25, 16, 16]} />
        <meshStandardMaterial
          color={new THREE.Color(color).multiplyScalar(1.35)}
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
        <meshBasicMaterial color={color} transparent opacity={0.45} side={THREE.DoubleSide} />
      </mesh>

      {/* Emoji label */}
      <Html position={[0, 1.85, 0]} center distanceFactor={18} style={{ pointerEvents: 'none' }}>
        <div
          className={`flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-bold text-white shadow-lg shadow-black/50 backdrop-blur ${
            isActive ? 'border-amber-300/40 bg-black/60' : 'border-white/10 bg-black/40'
          }`}
        >
          <span className="text-sm">{emoji}</span>
          <span className="max-w-[88px] truncate">{player.name}</span>
        </div>
      </Html>
    </group>
  );
};

const Player = () => {
  const players = useGameStore((state) => state.players);
  const visiblePlayers = players.filter((p) => !p.isBankrupt);
  return (
    <group>
      {visiblePlayers.map((p, idx) => (
        <PlayerToken key={p.id} playerId={p.id} tokenIndex={idx} />
      ))}
    </group>
  );
};

export default Player;
