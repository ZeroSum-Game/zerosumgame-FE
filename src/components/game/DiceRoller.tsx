import { useEffect, useMemo, useState } from 'react';
import useGameStore from '../../store/useGameStore';

const randDie = () => Math.floor(Math.random() * 6) + 1;

const DiceFace = ({ value }: { value: number | null }) => {
  return <div className="dice-face">{value ?? '—'}</div>;
};

const DiceRoller = () => {
  const rollTrigger = useGameStore((s) => s.rollTrigger);
  const isRolling = useGameStore((s) => s.isRolling);
  const dice = useGameStore((s) => s.dice);
  const setDiceValues = useGameStore((s) => s.setDiceValues);

  const [ghost, setGhost] = useState<[number, number] | null>(null);

  useEffect(() => {
    if (rollTrigger <= 0) return;

    setGhost([randDie(), randDie()]);
    const start = Date.now();

    const interval = window.setInterval(() => {
      const elapsed = Date.now() - start;
      if (elapsed > 900) return;
      setGhost([randDie(), randDie()]);
    }, 90);

    const timeout = window.setTimeout(() => {
      window.clearInterval(interval);
      setGhost(null);
      setDiceValues([randDie(), randDie()]);
    }, 980);

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, [rollTrigger, setDiceValues]);

  const shown = useMemo<[number, number]>(() => {
    if (ghost) return ghost;
    return dice;
  }, [dice, ghost]);

  return (
    <div className={`dice-roller ${isRolling ? 'dice-roller-rolling' : ''}`} aria-label="주사위">
      <div className="dice-row">
        <DiceFace value={shown[0] ?? null} />
        <DiceFace value={shown[1] ?? null} />
      </div>
      <div className="dice-meta">{isRolling ? '굴리는 중…' : ' '}</div>
    </div>
  );
};

export default DiceRoller;
