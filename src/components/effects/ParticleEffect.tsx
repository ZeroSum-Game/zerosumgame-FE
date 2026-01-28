import { useEffect, useState } from 'react';

type ParticleType = 'coins' | 'lightning' | 'soccer' | 'explosion' | 'rocket';

interface ParticleEffectProps {
    type: ParticleType;
    active: boolean;
    count?: number;
    onComplete?: () => void;
}

const EMOJI_MAP: Record<ParticleType, string> = {
    coins: '💰',
    lightning: '⚡',
    soccer: '⚽',
    explosion: '💥',
    rocket: '🚀',
};

const ParticleEffect = ({ type, active, count = 8, onComplete }: ParticleEffectProps) => {
    const [particles, setParticles] = useState<number[]>([]);

    useEffect(() => {
        if (active) {
            setParticles(Array.from({ length: count }, (_, i) => i));
            const timer = setTimeout(() => {
                setParticles([]);
                if (onComplete) onComplete();
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [active, count, onComplete]);

    if (!active || particles.length === 0) return null;

    const emoji = EMOJI_MAP[type];
    const animationClass = `particle-${type}`;

    return (
        <div className="particle-container">
            {particles.map((i) => (
                <div
                    key={i}
                    className={`particle ${animationClass}`}
                    style={{
                        '--particle-index': i,
                        '--particle-delay': `${i * 0.1}s`,
                    } as React.CSSProperties}
                >
                    {emoji}
                </div>
            ))}
        </div>
    );
};

export default ParticleEffect;
