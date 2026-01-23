import { Text, RoundedBox } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef, useState } from 'react';
import * as THREE from 'three';

type StockItem = {
    name: string;
    symbol: string;
    price: number;
    change: number;
};

const STOCK_DATA: StockItem[] = [
    { name: 'SAMSUNG', symbol: '삼성전자', price: 72500, change: 2.3 },
    { name: 'SK HYNIX', symbol: 'SK하이닉스', price: 178000, change: -1.2 },
    { name: 'HYUNDAI', symbol: '현대차', price: 215000, change: 0.8 },
    { name: 'BITCOIN', symbol: '비트코인', price: 95450000, change: 5.4 },
    { name: 'GOLD', symbol: '금', price: 285000, change: -0.3 },
];

const StockBoard = () => {
    const groupRef = useRef<THREE.Group>(null);
    const [tick, setTick] = useState(0);

    // Subtle floating animation
    useFrame((state) => {
        if (groupRef.current) {
            groupRef.current.position.y = 3 + Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
            groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.2) * 0.05;
        }
        // Update tick for price flicker effect
        if (Math.floor(state.clock.elapsedTime * 2) !== tick) {
            setTick(Math.floor(state.clock.elapsedTime * 2));
        }
    });

    return (
        <group ref={groupRef} position={[0, 3, 0]}>
            {/* Main Board Background */}
            <RoundedBox
                args={[6, 4, 0.3]}
                radius={0.15}
                smoothness={4}
                castShadow
                receiveShadow
            >
                <meshStandardMaterial
                    color="#1a1a2e"
                    roughness={0.3}
                    metalness={0.5}
                    emissive="#1a1a2e"
                    emissiveIntensity={0.1}
                />
            </RoundedBox>

            {/* Glass effect overlay */}
            <RoundedBox
                args={[5.6, 3.6, 0.1]}
                radius={0.1}
                smoothness={4}
                position={[0, 0, 0.15]}
            >
                <meshPhysicalMaterial
                    color="#0f0f23"
                    roughness={0.1}
                    metalness={0.8}
                    transmission={0.1}
                    thickness={0.5}
                />
            </RoundedBox>

            {/* Title */}
            <Text
                position={[0, 1.5, 0.25]}
                fontSize={0.35}
                color="#fbbf24"
                anchorX="center"
                anchorY="middle"
                font="/fonts/NotoSansKR-Bold.ttf"
                outlineWidth={0.02}
                outlineColor="#000"
            >
                📊 실시간 주식/자산
            </Text>

            {/* Stock Items */}
            {STOCK_DATA.map((stock, index) => {
                const yPos = 0.8 - index * 0.55;
                const isPositive = stock.change >= 0;
                const priceFlicker = tick % 2 === 0 ? 0 : (Math.random() - 0.5) * 100;
                const displayPrice = stock.price + priceFlicker;

                return (
                    <group key={stock.name} position={[0, yPos, 0.25]}>
                        {/* Symbol Name */}
                        <Text
                            position={[-2.2, 0, 0]}
                            fontSize={0.22}
                            color="#ffffff"
                            anchorX="left"
                            anchorY="middle"
                            font="/fonts/NotoSansKR-Bold.ttf"
                        >
                            {stock.symbol}
                        </Text>

                        {/* Price */}
                        <Text
                            position={[0.8, 0, 0]}
                            fontSize={0.22}
                            color="#e2e8f0"
                            anchorX="right"
                            anchorY="middle"
                            font="/fonts/NotoSansKR-Bold.ttf"
                        >
                            ₩{displayPrice.toLocaleString()}
                        </Text>

                        {/* Change Percentage */}
                        <Text
                            position={[2.4, 0, 0]}
                            fontSize={0.2}
                            color={isPositive ? '#10b981' : '#ef4444'}
                            anchorX="right"
                            anchorY="middle"
                            font="/fonts/NotoSansKR-Bold.ttf"
                        >
                            {isPositive ? '▲' : '▼'} {Math.abs(stock.change).toFixed(1)}%
                        </Text>
                    </group>
                );
            })}

            {/* Decorative border glow */}
            <mesh position={[0, 0, -0.2]}>
                <planeGeometry args={[6.2, 4.2]} />
                <meshBasicMaterial color="#3b82f6" transparent opacity={0.3} />
            </mesh>
        </group>
    );
};

export default StockBoard;
