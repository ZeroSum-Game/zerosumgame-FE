import { useFrame } from '@react-three/fiber';
import { useBox } from '@react-three/cannon';
import { forwardRef, useImperativeHandle, useRef } from 'react';
import * as THREE from 'three';
import useGameStore from '../../store/useGameStore';

const DICE_SIZE = 1.3;

// Proper dice face detection based on which face is pointing up
const getDiceValue = (mesh: THREE.Mesh): number => {
  // Get the world up vector
  const worldUp = new THREE.Vector3(0, 1, 0);

  // Define face normals in local space and their corresponding values
  const faces = [
    { normal: new THREE.Vector3(0, 1, 0), value: 1 },   // Top = 1
    { normal: new THREE.Vector3(0, -1, 0), value: 6 },  // Bottom = 6
    { normal: new THREE.Vector3(1, 0, 0), value: 3 },   // Right = 3
    { normal: new THREE.Vector3(-1, 0, 0), value: 4 },  // Left = 4
    { normal: new THREE.Vector3(0, 0, 1), value: 2 },   // Front = 2
    { normal: new THREE.Vector3(0, 0, -1), value: 5 },  // Back = 5
  ];

  let maxDot = -Infinity;
  let result = 1;

  // Transform each face normal to world space and find which one points most upward
  faces.forEach(face => {
    const worldNormal = face.normal.clone().applyQuaternion(mesh.quaternion);
    const dot = worldNormal.dot(worldUp);
    if (dot > maxDot) {
      maxDot = dot;
      result = face.value;
    }
  });

  return result;
};

// Dot pattern for each face value
const DiceDots = ({ value, position, rotation }: { value: number; position: [number, number, number]; rotation: [number, number, number] }) => {
  const dotSize = 0.12;
  const offset = 0.32;

  const dotPositions: Record<number, [number, number][]> = {
    1: [[0, 0]],
    2: [[-offset, -offset], [offset, offset]],
    3: [[-offset, -offset], [0, 0], [offset, offset]],
    4: [[-offset, -offset], [offset, -offset], [-offset, offset], [offset, offset]],
    5: [[-offset, -offset], [offset, -offset], [0, 0], [-offset, offset], [offset, offset]],
    6: [[-offset, -offset], [offset, -offset], [-offset, 0], [offset, 0], [-offset, offset], [offset, offset]],
  };

  return (
    <group position={position} rotation={rotation}>
      {dotPositions[value]?.map((pos, i) => (
        <mesh key={i} position={[pos[0], pos[1], 0]}>
          <circleGeometry args={[dotSize, 16]} />
          <meshBasicMaterial color="#1a1a1a" />
        </mesh>
      ))}
    </group>
  );
};

const SingleDice = forwardRef<
  { throwDice: () => void },
  { position: [number, number, number]; onStop: (val: number) => void; color: string }
>(({ position, onStop, color }, ref) => {
  const [meshRef, api] = useBox<THREE.Mesh>(() => ({
    mass: 1,
    position,
    args: [DICE_SIZE, DICE_SIZE, DICE_SIZE],
    material: { friction: 0.4, restitution: 0.3 },
  }));

  const isRolling = useRef(false);
  const stableFrames = useRef(0);
  const startedAtMs = useRef(0);
  const lastPosition = useRef(new THREE.Vector3());
  const lastQuaternion = useRef(new THREE.Quaternion());
  const reportedStop = useRef(false);

  useImperativeHandle(ref, () => ({
    throwDice: () => {
      isRolling.current = true;
      stableFrames.current = 0;
      startedAtMs.current = Date.now();
      reportedStop.current = false;

      api.wakeUp();

      // Random starting rotation
      const randRotX = Math.random() * Math.PI * 2;
      const randRotY = Math.random() * Math.PI * 2;
      const randRotZ = Math.random() * Math.PI * 2;

      api.position.set(
        position[0] + (Math.random() - 0.5) * 2,
        4 + Math.random() * 2,
        position[2] + (Math.random() - 0.5) * 2
      );
      api.rotation.set(randRotX, randRotY, randRotZ);
      api.velocity.set(0, 0, 0);
      api.angularVelocity.set(0, 0, 0);

      if (meshRef.current) {
        lastPosition.current.copy(meshRef.current.position);
        lastQuaternion.current.copy(meshRef.current.quaternion);
      }

      // Apply random impulse
      setTimeout(() => {
        const impulseX = (Math.random() - 0.5) * 8;
        const impulseZ = (Math.random() - 0.5) * 8;
        api.applyImpulse([impulseX, -5, impulseZ], [0, 0, 0]);

        // Apply random torque for rotation
        const torque: [number, number, number] = [
          (Math.random() - 0.5) * 15,
          (Math.random() - 0.5) * 15,
          (Math.random() - 0.5) * 15,
        ];
        api.applyTorque(torque);
      }, 50);
    },
  }));

  useFrame(() => {
    if (!isRolling.current || !meshRef.current) return;

    const elapsedMs = Date.now() - startedAtMs.current;
    // Give physics a moment to kick in before considering "stopped"
    if (elapsedMs < 600) {
      lastPosition.current.copy(meshRef.current.position);
      lastQuaternion.current.copy(meshRef.current.quaternion);
      stableFrames.current = 0;
      return;
    }

    const positionDelta = lastPosition.current.distanceTo(meshRef.current.position);
    const quatDot = Math.abs(lastQuaternion.current.dot(meshRef.current.quaternion));
    const rotationDelta = 1 - quatDot;

    lastPosition.current.copy(meshRef.current.position);
    lastQuaternion.current.copy(meshRef.current.quaternion);

    // Consider "stable" when both movement and rotation changes are tiny.
    if (positionDelta < 0.002 && rotationDelta < 0.002) {
      stableFrames.current += 1;
    } else {
      stableFrames.current = 0;
    }

    // Wait for 45 stable frames (~0.75s at 60fps) to confirm stopped.
    if (!reportedStop.current && stableFrames.current > 45) {
      reportedStop.current = true;
      isRolling.current = false;
      const value = getDiceValue(meshRef.current);
      onStop(value);
    }
  });

  const halfSize = DICE_SIZE / 2 + 0.001;

  return (
    <mesh ref={meshRef} castShadow receiveShadow>
      <boxGeometry args={[DICE_SIZE, DICE_SIZE, DICE_SIZE]} />
      <meshStandardMaterial color={color} roughness={0.3} metalness={0.1} />

      {/* Dice dots on each face */}
      <DiceDots value={1} position={[0, halfSize, 0]} rotation={[-Math.PI / 2, 0, 0]} />
      <DiceDots value={6} position={[0, -halfSize, 0]} rotation={[Math.PI / 2, 0, 0]} />
      <DiceDots value={3} position={[halfSize, 0, 0]} rotation={[0, Math.PI / 2, 0]} />
      <DiceDots value={4} position={[-halfSize, 0, 0]} rotation={[0, -Math.PI / 2, 0]} />
      <DiceDots value={2} position={[0, 0, halfSize]} rotation={[0, 0, 0]} />
      <DiceDots value={5} position={[0, 0, -halfSize]} rotation={[0, Math.PI, 0]} />
    </mesh>
  );
});

SingleDice.displayName = 'SingleDice';

const Dice = () => {
  const setDiceValues = useGameStore((state) => state.setDiceValues);
  const rollTrigger = useGameStore((state) => state.rollTrigger);

  const dice1Ref = useRef<{ throwDice: () => void }>(null);
  const dice2Ref = useRef<{ throwDice: () => void }>(null);
  const results = useRef<[number | null, number | null]>([null, null]);

  useEffect(() => {
    if (rollTrigger > 0) {
      results.current = [null, null];
      dice1Ref.current?.throwDice();
      dice2Ref.current?.throwDice();
    }
  }, [rollTrigger]);

  const handleStop = (index: 0 | 1, val: number) => {
    results.current[index] = val;
    if (results.current[0] !== null && results.current[1] !== null) {
      setDiceValues([results.current[0], results.current[1]]);
    }
  };

  // Position dice at the center of the board
  return (
    <group position={[0, 0, 0]}>
      <SingleDice
        ref={dice1Ref}
        position={[-1.8, 4, 0]}
        color="#ffffff"
        onStop={(v) => handleStop(0, v)}
      />
      <SingleDice
        ref={dice2Ref}
        position={[1.8, 4, 0]}
        color="#fff5f5"
        onStop={(v) => handleStop(1, v)}
      />
    </group>
  );
};

export default Dice;
