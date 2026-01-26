import { Canvas, useFrame } from '@react-three/fiber';
import { RoundedBox, Text, Environment, Lightformer } from '@react-three/drei';
import { useRef, useState, useEffect, useMemo } from 'react';
import * as THREE from 'three';

type DieProps = {
    value: number;
    rolling: boolean;
};

const Die = ({ value, rolling }: DieProps) => {
    const meshRef = useRef<THREE.Mesh>(null);

    // Target rotation for each face (Euler angles)
    // 1: front (0,0,0)
    // 6: back (PI, 0, 0)
    // 2: right (0, -PI/2, 0)
    // 5: left (0, PI/2, 0)
    // 3: top (PI/2, 0, 0)
    // 4: bottom (-PI/2, 0, 0)
    const targetRotation = useMemo(() => {
        switch (value) {
            case 1: return [0, 0, 0];
            case 6: return [Math.PI, 0, 0];
            case 2: return [0, -Math.PI / 2, 0];
            case 5: return [0, Math.PI / 2, 0];
            case 3: return [Math.PI / 2, 0, 0];
            case 4: return [-Math.PI / 2, 0, 0];
            default: return [0, 0, 0];
        }
    }, [value]);

    useFrame((state, delta) => {
        if (!meshRef.current) return;

        if (rolling) {
            // Fast random spin
            meshRef.current.rotation.x += delta * 15;
            meshRef.current.rotation.y += delta * 12;
            meshRef.current.rotation.z += delta * 8;
        } else {
            // Settle to target
            const [tx, ty, tz] = targetRotation;

            // Smooth damp
            const step = delta * 10;
            // Normalize rotation to avoid 360 spin jumps if possible, 
            // but simplistic lerp is often enough for this if we reset or mod 2PI.
            // For simplicity, we just lerp to the exact target values if close enough, 
            // else reset/snap.

            // However, current random spin leaves it at arbitrary angles. 
            // We can just set rotation directly for now or animate strictly.
            // To make it look "settled", let's just snap for this iteration or smooth lerp.

            // Since rolling is state-based, when rolling stops, we want to snap or lerp.
            // Basic approach: CSS transforms were doing it. Here we do it frame by frame.

            // Simple logic: If we entered "not rolling" state, we lerp to target.
            meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, tx, step);
            meshRef.current.rotation.y = THREE.MathUtils.lerp(meshRef.current.rotation.y, ty, step);
            meshRef.current.rotation.z = THREE.MathUtils.lerp(meshRef.current.rotation.z, tz, step);
        }
    });

    return (
        <RoundedBox ref={meshRef} args={[2, 2, 2]} radius={0.3} smoothness={4} castShadow receiveShadow>
            <meshStandardMaterial color="#0f172a" roughness={0.3} metalness={0.8} />

            {/* 1 - Front */}
            <Text position={[0, 0, 1.01]} fontSize={1.2} color="white" anchorX="center" anchorY="middle">1</Text>

            {/* 6 - Back */}
            <Text position={[0, 0, -1.01]} rotation={[0, Math.PI, 0]} fontSize={1.2} color="white" anchorX="center" anchorY="middle">6</Text>

            {/* 2 - Right */}
            <Text position={[1.01, 0, 0]} rotation={[0, Math.PI / 2, 0]} fontSize={1.2} color="white" anchorX="center" anchorY="middle">2</Text>

            {/* 5 - Left */}
            <Text position={[-1.01, 0, 0]} rotation={[0, -Math.PI / 2, 0]} fontSize={1.2} color="white" anchorX="center" anchorY="middle">5</Text>

            {/* 3 - Top */}
            <Text position={[0, 1.01, 0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={1.2} color="white" anchorX="center" anchorY="middle">3</Text>

            {/* 4 - Bottom */}
            <Text position={[0, -1.01, 0]} rotation={[Math.PI / 2, 0, 0]} fontSize={1.2} color="white" anchorX="center" anchorY="middle">4</Text>
        </RoundedBox>
    );
};

// Main Component
const Dice3D = ({ value, rolling }: DieProps) => {
    return (
        // We wrap each die in a small canvas or use one shared canvas?
        // Current usage in DiceRoller is two <Dice3D /> side by side.
        // Creating multiple Canvases is expensive but okay for 2 dice.
        // Better to have one Canvas in DiceRoller, but to not refactor usage completely, 
        // let's use a small canvas for each.
        <div style={{ width: 100, height: 100 }}>
            <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
                <ambientLight intensity={1.5} />
                <pointLight position={[10, 10, 10]} intensity={2} />
                <DirectionalLighting />
                <Die value={value} rolling={rolling} />
            </Canvas>
        </div>
    );
};

const DirectionalLighting = () => {
    return (
        <>
            <pointLight position={[-10, -10, -10]} intensity={0.5} color="blue" />
            <Environment preset="city" />
        </>
    )
}

export default Dice3D;
