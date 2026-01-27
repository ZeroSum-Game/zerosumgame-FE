
import { useEffect, useMemo } from 'react';
import useGameStore from '../../store/useGameStore';
import './DiceRoller.css';

const clampDie = (value: number) => Math.min(6, Math.max(1, Math.round(value)));

const PIP_MAP: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

const FACE_ROTATION: Record<number, string> = {
  1: 'rotateX(0deg) rotateY(0deg)',
  2: 'rotateY(-90deg)',
  3: 'rotateX(90deg)',
  4: 'rotateX(-90deg)',
  5: 'rotateY(90deg)',
  6: 'rotateY(180deg)',
};

const DicePips = ({ value }: { value: number }) => {
  const pips = PIP_MAP[value] ?? PIP_MAP[1];
  return (
    <div className="dice-pip-grid">
      {Array.from({ length: 9 }).map((_, idx) => (
        <span key={idx} className={`dice-pip ${pips.includes(idx) ? 'on' : ''}`} />
      ))}
    </div>
  );
};

const DiceCube = ({ value, rolling, settling }: { value: number; rolling: boolean; settling: boolean }) => {
  const rotation = FACE_ROTATION[value] ?? FACE_ROTATION[1];
  const cubeStyle = rolling ? undefined : { transform: rotation };
  return (
    <div className={`dice-cube-shell ${settling ? 'settling' : ''}`}>
      <div className={`dice-cube ${rolling ? 'rolling' : ''}`} style={cubeStyle} aria-label={`dice-${value}`}>
        <div className="dice-face dice-face--front"><DicePips value={1} /></div>
        <div className="dice-face dice-face--back"><DicePips value={6} /></div>
        <div className="dice-face dice-face--right"><DicePips value={2} /></div>
        <div className="dice-face dice-face--left"><DicePips value={5} /></div>
        <div className="dice-face dice-face--top"><DicePips value={3} /></div>
        <div className="dice-face dice-face--bottom"><DicePips value={4} /></div>
      </div>
    </div>
  );
};

const DiceRoller = () => {
  const rollTrigger = useGameStore((s) => s.rollTrigger);
  const rollReleaseTrigger = useGameStore((s) => s.rollReleaseTrigger);
  const isRolling = useGameStore((s) => s.isRolling);
  const rollStage = useGameStore((s) => s.rollStage);
  const dice = useGameStore((s) => s.dice);
  const isDouble = useGameStore((s) => s.isDouble);
  const hasRolledThisTurn = useGameStore((s) => s.hasRolledThisTurn);
  const setDice = useGameStore((s) => s.setDiceValues);

  const safeDice = useMemo(
    () => [clampDie(dice[0]), clampDie(dice[1])] as [number, number],
    [dice],
  );

  useEffect(() => {
    if (safeDice[0] !== dice[0] || safeDice[1] !== dice[1]) {
      setDice(safeDice);
    }
  }, [dice, safeDice, setDice]);

  // We don't need all the complex timeout logic if we rely on CSS transition + socket state.
  // But to sync perfectly, we can keep using the store state.

  // When rollStage is HOLDING: Rolling animation (random spinning)
  // When rollStage is SETTLING: Smooth transition to final value
  // When rollStage is IDLE: Static final value

  const meta =
    rollStage === 'HOLDING'
      ? '주사위 굴리는 중...'
      : rollStage === 'SETTLING'
        ? '결과 확인 중...'
        : isRolling
          ? '주사위 굴리는 중...'
          : ' ';

  const showDouble = !isRolling && rollStage === 'IDLE' && hasRolledThisTurn && isDouble;
  const rowClass =
    rollStage === 'HOLDING'
      ? 'dice-row dice-row-rolling'
      : rollStage === 'SETTLING'
        ? 'dice-row dice-row-settle'
        : 'dice-row';
  const isHolding = rollStage === 'HOLDING';
  const isSettling = rollStage === 'SETTLING';

  return (
    <div
      className={[
        'dice-roller',
        rollStage === 'HOLDING' ? 'dice-roller-holding' : '',
        rollStage === 'SETTLING' ? 'dice-roller-settling' : '',
      ].join(' ')}
      aria-label="주사위"
    >
      <div className={`${rowClass} relative`}>
        {/* DOUBLE! Effect */}
        {showDouble && (
          <div className="absolute -top-16 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
            <div className="text-4xl font-black text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.8)] animate-bounce-custom whitespace-nowrap"
              style={{ fontFamily: "'Press Start 2P', cursive", animation: "bounce 0.5s infinite alternate" }}>
              DOUBLE!
            </div>
          </div>
        )}
        <DiceCube value={safeDice[0]} rolling={isHolding} settling={isSettling} />
        <DiceCube value={safeDice[1]} rolling={isHolding} settling={isSettling} />
      </div>
      <div className="dice-meta">{meta}</div>
    </div>
  );
};


export default DiceRoller;

