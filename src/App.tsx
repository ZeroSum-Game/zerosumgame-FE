import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Physics, usePlane } from '@react-three/cannon';
import Overlay from './components/ui/Overlay';
import Board from './components/3d/Board';
import Dice from './components/3d/Dice';

const Floor = () => {
  const [ref] = usePlane(() => ({ rotation: [-Math.PI / 2, 0, 0], position: [0, -0.5, 0] }));
  return (
    <mesh ref={ref} visible={false}>
      <planeGeometry args={[100, 100]} />
    </mesh>
  );
};

const App = () => {
  return (
    <div className="relative flex h-screen w-screen overflow-hidden bg-gradient-to-br from-[#05050d] via-[#0c0f1f] to-[#1b1b2c]">
      <Canvas
        camera={{ position: [0, 40, 0], fov: 45 }}
        shadows
        gl={{ antialias: true }}
        className="h-full w-full"
      >
        <fog attach="fog" args={['#05050d', 30, 80]} />
        <ambientLight intensity={2.0} />
        <directionalLight
          intensity={2.5}
          position={[10, 20, 5]}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <Physics gravity={[0, -30, 0]}>
          <Floor />
          <Board />
          <Dice />
        </Physics>
        <OrbitControls
          makeDefault
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI / 2.2}
          enablePan={true}
          maxDistance={40}
        />
      </Canvas>
      <Overlay />
    </div>
  );
};

export default App;
