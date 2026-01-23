import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import useGameStore from '../../store/useGameStore';
import { getTileTransform, BOARD_DATA } from '../../utils/boardUtils';

const Player = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  const playerIndex = useGameStore((state) => state.playerIndex);

  const [currentPos] = useState(() => {
    const { position } = getTileTransform(0);
    return new THREE.Vector3(position[0], position[1] + 0.75, position[2]);
  });

  const targetPos = useMemo(() => {
    const { position } = getTileTransform(playerIndex);
    return new THREE.Vector3(position[0], position[1] + 0.75, position[2]);
  }, [playerIndex]);

  const setShowBuyModal = useGameStore((state) => state.setShowBuyModal);
  const lands = useGameStore((state) => state.lands);
  // Track processed tile to avoid repeated triggers
  const processedTileRef = useRef<number | null>(null);

  // Reset processed tile when player starts moving to a new index
  // We rely on playerIndex changing to reset our "processed" flag for the NEW tile?
  // Actually, simply resetting when playerIndex changes is enough if we only trigger ONCE per index.
  useMemo(() => {
    processedTileRef.current = null;
  }, [playerIndex]);


  useFrame((state, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    // Move player towards target
    const distance = mesh.position.distanceTo(targetPos);

    if (distance > 0.05) {
      // Move speed
      const speed = 10 * delta;

      // Linear movement on XZ plane
      const moveDir = new THREE.Vector3().subVectors(targetPos, mesh.position).normalize();

      // If very close, just snap (to prevent jitter)
      if (distance < speed) {
        mesh.position.copy(targetPos);
      } else {
        mesh.position.add(moveDir.multiplyScalar(speed));
      }

      // Hopping effect
      if (distance > 0.1) {
        mesh.position.y = targetPos.y + Math.sin(distance * 2) * 2;
      } else {
        mesh.position.y = THREE.MathUtils.lerp(mesh.position.y, targetPos.y, 10 * delta);
      }

    } else {
      // Arrived logic

      // Trigger Arrival Logic only once per tile visit
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

    // Camera Follow
    const camOffset = new THREE.Vector3(20, 18, 20);
    const targetCamPos = mesh.position.clone().add(camOffset);
    state.camera.position.lerp(targetCamPos, 2 * delta);
    state.camera.lookAt(mesh.position);
  });

  return (
    <mesh ref={meshRef} castShadow receiveShadow position={[currentPos.x, currentPos.y, currentPos.z]}>
      <cylinderGeometry args={[0.35, 0.35, 1.1, 16]} />
      <meshStandardMaterial color="#ef4444" roughness={0.35} metalness={0.2} />
    </mesh>
  );
};

export default Player;
