import { useBox } from '@react-three/cannon';
import { useFrame } from '@react-three/fiber';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import * as THREE from 'three';
import useGameStore from '../../store/useGameStore';

const DICE_SIZE = 1;

// Face normals in local space for standard UV mapping usually:
// This depends on how we envision the cube.
// Let's define:
// Up (0, 1, 0) -> 2
// Down (0, -1, 0) -> 5
// Right (1, 0, 0) -> 4
// Left (-1, 0, 0) -> 3
// Front (0, 0, 1) -> 1
// Back (0, 0, -1) -> 6
// We will check dot product of these local vectors rotated to world against WorldUp (0, 1, 0).
// Simpler: Just rotate WorldUp into local space (inverse quat) and check which axis it aligns with.
// That is equivalent.

const getDiceValue = (quaternion: THREE.Quaternion) => {
    const up = new THREE.Vector3(0, 1, 0);
    up.applyQuaternion(quaternion.clone().invert());

    // Now 'up' is the World Up vector represented in Local Space
    // We want to see which local face normal is closest to this 'up' vector.
    // Closest means max dot product.
    // Or simply: check which component is max abs.

    if (Math.abs(up.y) > 0.7) {
        return up.y > 0 ? 2 : 5;
    } else if (Math.abs(up.x) > 0.7) {
        return up.x > 0 ? 4 : 3;
    } else {
        return up.z > 0 ? 1 : 6;
    }
};

const SingleDice = forwardRef(({ position, onStop, color }: { position: [number, number, number], onStop: (val: number) => void, color: string }, ref) => {
    const [meshRef, api] = useBox(() => ({
        mass: 1,
        position,
        args: [DICE_SIZE, DICE_SIZE, DICE_SIZE],
        material: { friction: 0.3, restitution: 0.5 }
    }));

    const velocity = useRef([0, 0, 0]);
    const isRolling = useRef(false);
    const stoppedDuration = useRef(0);

    useEffect(() => {
        const unsub = api.velocity.subscribe((v) => (velocity.current = v));
        return unsub;
    }, [api.velocity]);

    useImperativeHandle(ref, () => ({
        throwDice: () => {
            isRolling.current = true;
            stoppedDuration.current = -20; // Give it time to start moving

            // Reset position to high above
            api.wakeUp();
            api.position.set(position[0], 5 + Math.random(), position[2]);
            api.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
            api.velocity.set(0, 0, 0);
            api.angularVelocity.set(0, 0, 0);

            // Apply random impulse and torque
            const impulse = [
                (Math.random() - 0.5) * 15,
                -10,
                (Math.random() - 0.5) * 15
            ];
            const torque = [
                Math.random() * 20,
                Math.random() * 20,
                Math.random() * 20
            ];

            api.applyImpulse(impulse as [number, number, number], [0, 0, 0]);
            api.applyTorque(torque as [number, number, number]);
        }
    }));

    useFrame(() => {
        if (!isRolling.current) return;

        const v = velocity.current;
        // Check if stopped (velocity near 0)
        if (Math.abs(v[0]) < 0.1 && Math.abs(v[1]) < 0.1 && Math.abs(v[2]) < 0.1) {
            stoppedDuration.current += 1;
            // Confirm stop after ~0.5s (30 frames)
            if (stoppedDuration.current > 30) {
                isRolling.current = false;

                if (meshRef.current) {
                    const q = new THREE.Quaternion().copy(meshRef.current.quaternion);
                    const val = getDiceValue(q);
                    onStop(val);
                }
            }
        } else {
            stoppedDuration.current = 0;
        }
    });

    return (
        <mesh ref={meshRef} castShadow>
            <boxGeometry args={[DICE_SIZE, DICE_SIZE, DICE_SIZE]} />
            <meshStandardMaterial color={color} vertexColors={false} />
            {/* Simple markers for faces */}
            {/* 1 (Front) */}
            <mesh position={[0, 0, 0.51]}>
                <sphereGeometry args={[0.1]} />
                <meshBasicMaterial color="black" />
            </mesh>
            {/* 6 (Back) - 6 dots? Just 1 for now or rely on user implementation of dots */}
            <mesh position={[0, 0, -0.51]}>
                <sphereGeometry args={[0.2]} /> {/* Differentiation by size for now */}
                <meshBasicMaterial color="black" />
            </mesh>
            {/* 2 (Top) */}
            <mesh position={[0, 0.51, 0]}>
                <sphereGeometry args={[0.15]} />
                <meshBasicMaterial color="blue" />
            </mesh>
            {/* 5 (Bottom) */}
            <mesh position={[0, -0.51, 0]}>
                <sphereGeometry args={[0.15]} />
                <meshBasicMaterial color="red" />
            </mesh>
            {/* 4 (Right) */}
            <mesh position={[0.51, 0, 0]}>
                <sphereGeometry args={[0.12]} />
                <meshBasicMaterial color="green" />
            </mesh>
            {/* 3 (Left) */}
            <mesh position={[-0.51, 0, 0]}>
                <sphereGeometry args={[0.12]} />
                <meshBasicMaterial color="yellow" />
            </mesh>
        </mesh>
    );
});

const Dice = () => {
    // Correct store usage
    const setDiceValues = useGameStore(state => state.setDiceValues);
    const rollTrigger = useGameStore(s => s.rollTrigger);

    const dice1Ref = useRef<any>(null);
    const dice2Ref = useRef<any>(null);
    const results = useRef<[number | null, number | null]>([null, null]);

    // Trigger effect
    useEffect(() => {
        if (rollTrigger > 0) {
            results.current = [null, null];
            dice1Ref.current?.throwDice();
            dice2Ref.current?.throwDice();
        }
    }, [rollTrigger]);

    const handleStop = (index: 0 | 1, val: number) => {
        results.current[index] = val;
        // Check if both finished
        if (results.current[0] !== null && results.current[1] !== null) {
            setDiceValues([results.current[0]!, results.current[1]!]);
        }
    };

    return (
        <group>
            <SingleDice
                ref={dice1Ref}
                position={[-2, 5, 0]}
                color="#ffffff"
                onStop={(v) => handleStop(0, v)}
            />
            <SingleDice
                ref={dice2Ref}
                position={[2, 5, 0]}
                color="#eeeeee"
                onStop={(v) => handleStop(1, v)}
            />
        </group>
    );
};

export default Dice;
