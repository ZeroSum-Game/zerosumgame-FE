import { useFrame } from '@react-three/fiber';
import { useBox } from '@react-three/cannon';
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import * as THREE from 'three';
import useGameStore from '../../store/useGameStore';

const DICE_SIZE = 1.3;

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

// Calculate dice value from quaternion
const getDiceValueFromQuaternion = (quat: THREE.Quaternion): number => {
  const worldUp = new THREE.Vector3(0, 1, 0);

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

  faces.forEach(face => {
    const worldNormal = face.normal.clone().applyQuaternion(quat);
    const dot = worldNormal.dot(worldUp);
    if (dot > maxDot) {
      maxDot = dot;
      result = face.value;
    }
  });

  return result;
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

  const velocity = useRef<[number, number, number]>([0, 0, 0]);
  const angularVelocity = useRef<[number, number, number]>([0, 0, 0]);
  const rotation = useRef<[number, number, number]>([0, 0, 0]);
  const isRolling = useRef(false);
  const stoppedFrames = useRef(0);
  const startedAtMs = useRef(0);
  const reportedStop = useRef(false);
  const hasMoved = useRef(false);

  useEffect(() => {
    const unsubV = api.velocity.subscribe((v) => (velocity.current = v as [number, number, number]));
    const unsubAV = api.angularVelocity.subscribe(
      (av) => (angularVelocity.current = av as [number, number, number])
    );
    const unsubRot = api.rotation.subscribe(
      (r) => (rotation.current = r as [number, number, number])
    );
    return () => {
      unsubV();
      unsubAV();
      unsubRot();
    };
  }, [api]);

  useImperativeHandle(ref, () => ({
    throwDice: () => {
      isRolling.current = true;
      stoppedFrames.current = 0;
      startedAtMs.current = Date.now();
      reportedStop.current = false;
      hasMoved.current = false;

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
    const v = velocity.current;
    const av = angularVelocity.current;

    const speed = Math.sqrt(v[0] ** 2 + v[1] ** 2 + v[2] ** 2);
    const angSpeed = Math.sqrt(av[0] ** 2 + av[1] ** 2 + av[2] ** 2);

    if (speed > 0.2 || angSpeed > 0.2) hasMoved.current = true;

    // Give physics a moment to kick in (prevents instantly "stopped" at 1,1)
    if (elapsedMs < 600 || !hasMoved.current) return;

    // Check if dice has settled
    if (speed < 0.05 && angSpeed < 0.1) {
      stoppedFrames.current += 1;
    } else {
      stoppedFrames.current = 0;
    }

    // Wait for 45 frames (~0.75s at 60fps) to confirm stopped.
    if (!reportedStop.current && stoppedFrames.current > 45) {
      reportedStop.current = true;
      isRolling.current = false;
      // Use rotation from physics engine directly
      const euler = new THREE.Euler(rotation.current[0], rotation.current[1], rotation.current[2], 'XYZ');
      const quat = new THREE.Quaternion().setFromEuler(euler);
      const value = getDiceValueFromQuaternion(quat);
      onStop(value);
    }

    // Safety net: if something prevents sleeping, still report after a while.
    if (!reportedStop.current && elapsedMs > 12000) {
      reportedStop.current = true;
      isRolling.current = false;
      const euler = new THREE.Euler(rotation.current[0], rotation.current[1], rotation.current[2], 'XYZ');
      const quat = new THREE.Quaternion().setFromEuler(euler);
      const value = getDiceValueFromQuaternion(quat);
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
