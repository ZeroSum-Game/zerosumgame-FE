import { Canvas, useFrame } from '@react-three/fiber';
import { Stars, Sparkles, Cloud } from '@react-three/drei';
import { useRef } from 'react';
import * as THREE from 'three';

const MovingStars = () => {
  const starsRef = useRef<THREE.Group>(null);
  useFrame((state, delta) => {
    if (starsRef.current) {
      starsRef.current.rotation.y += delta * 0.05;
      starsRef.current.rotation.x += delta * 0.02;
    }
  });

  return (
    <group ref={starsRef}>
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      <Sparkles count={200} scale={12} size={4} speed={0.4} opacity={0.5} color="#fbbf24" />
      <Sparkles count={200} scale={15} size={6} speed={0.3} opacity={0.3} color="#60a5fa" />
    </group>
  );
};

const SpaceBackdrop = ({ className = '' }: { className?: string }) => {
  return (
    <div className={`absolute inset-0 -z-10 bg-slate-950 ${className}`} aria-hidden="true">
      <Canvas camera={{ position: [0, 0, 1] }}>
        <MovingStars />
        <ambientLight intensity={0.5} />
      </Canvas>
      {/* Overlay Gradient for consistency with existing theme */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-900/50 to-slate-950 pointer-events-none" />
    </div>
  );
};

export default SpaceBackdrop;
