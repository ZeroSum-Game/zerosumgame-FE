import { Canvas } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import { Physics, usePlane } from '@react-three/cannon';
import { Suspense } from 'react';
import Board from '../3d/Board';
import Dice from '../3d/Dice';
import GameOverlay from '../ui/GameOverlay';

const Floor = () => {
  const [ref] = usePlane(() => ({
    rotation: [-Math.PI / 2, 0, 0],
    position: [0, 0.05, 0],
  }));
  return (
    <mesh ref={ref} visible={false}>
      <planeGeometry args={[100, 100]} />
    </mesh>
  );
};

const GamePage = () => {
  return (
    <div className="relative flex h-screen w-screen overflow-hidden">
      <Canvas
        camera={{
          position: [0, 28, 18],
          fov: 55,
          near: 0.1,
          far: 200,
        }}
        shadows
        gl={{ antialias: true }}
        className="h-full w-full"
        onCreated={({ camera }) => {
          camera.lookAt(0, 0, 0);
        }}
      >
        <color attach="background" args={['#0a0a12']} />

        <ambientLight intensity={1.2} />
        <directionalLight
          intensity={2}
          position={[10, 30, 10]}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-far={60}
          shadow-camera-left={-25}
          shadow-camera-right={25}
          shadow-camera-top={25}
          shadow-camera-bottom={-25}
        />
        <directionalLight intensity={0.6} position={[-15, 20, -15]} color="#c4d4ff" />
        <pointLight position={[0, 15, 0]} intensity={1} color="#ffffff" distance={40} />
        <pointLight position={[-10, 3, -10]} intensity={0.5} color="#f59e0b" distance={15} />
        <pointLight position={[10, 3, -10]} intensity={0.5} color="#3b82f6" distance={15} />
        <pointLight position={[-10, 3, 10]} intensity={0.5} color="#22c55e" distance={15} />
        <pointLight position={[10, 3, 10]} intensity={0.5} color="#ec4899" distance={15} />

        <Environment preset="night" />

        <Suspense fallback={null}>
          <Board />
          <Physics gravity={[0, -25, 0]}>
            <Floor />
            <Dice />
          </Physics>
        </Suspense>
      </Canvas>
      <GameOverlay />
    </div>
  );
};

export default GamePage;
