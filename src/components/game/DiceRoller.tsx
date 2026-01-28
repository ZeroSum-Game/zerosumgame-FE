import { useMemo } from 'react';
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

const DiceFace = ({ value }: { value: number }) => {
  const pips = PIP_MAP[value] ?? PIP_MAP[1];
  return (
    <div className="dice-pip-grid">
      {Array.from({ length: 9 }).map((_, idx) => (
        <span key={idx} className={`dice-pip ${pips.includes(idx) ? 'on' : ''}`} />
      ))}
    </div>
  );
};

const Dice = ({ value, rolling }: { value: number; rolling: boolean }) => {
  return (
    <div className={`dice-cube-shell ${rolling ? '' : 'settling'}`}>
      <div className={`dice-cube ${rolling ? 'rolling' : ''}`}>
        <DiceFace value={value} />
      </div>
    </div>
  );
};

const DiceRoller = () => {
  const rollStage = useGameStore((s) => s.rollStage);
  const dice = useGameStore((s) => s.dice);
  const isDouble = useGameStore((s) => s.isDouble);
  const hasRolledThisTurn = useGameStore((s) => s.hasRolledThisTurn);

  const safeDice = useMemo(
    () => [clampDie(dice[0]), clampDie(dice[1])] as [number, number],
    [dice],
  );

  const isRolling = rollStage === 'HOLDING';
  const showResult = rollStage === 'IDLE' && hasRolledThisTurn;
  const sum = safeDice[0] + safeDice[1];

  return (
    <div className="dice-roller">
      <div className="dice-row">
        <Dice value={safeDice[0]} rolling={isRolling} />
        <Dice value={safeDice[1]} rolling={isRolling} />
      </div>

      {showResult ? (
        <div className="dice-result-display">
          <span>{safeDice[0]}</span>
          <span>+</span>
          <span>{safeDice[1]}</span>
          <span>=</span>
          <span className="dice-sum">{sum}</span>
          {isDouble && <span className="text-yellow-400 ml-2">DOUBLE!</span>}
        </div>
      ) : (
        <div className="dice-meta">
          {isRolling ? '주사위 굴리는 중...' : ' '}
        </div>
      )}
    </div>
  );
};

export default DiceRoller;
