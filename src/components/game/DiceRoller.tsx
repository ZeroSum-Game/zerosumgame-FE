
import { useEffect, useMemo, useRef, useState } from 'react';
import useGameStore from '../../store/useGameStore';
import Dice3D from './Dice3D'; // [Merge Note] Imported 3D Dice component
import './DiceRoller.css';

const randDie = () => Math.floor(Math.random() * 6) + 1;

const DiceRoller = () => {
  const rollTrigger = useGameStore((s) => s.rollTrigger);
  const rollReleaseTrigger = useGameStore((s) => s.rollReleaseTrigger);
  const isRolling = useGameStore((s) => s.isRolling);
  const rollStage = useGameStore((s) => s.rollStage);
  const dice = useGameStore((s) => s.dice);

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

  return (
    <div
      className={[
        'dice-roller',
        rollStage === 'HOLDING' ? 'dice-roller-holding' : '',
        rollStage === 'SETTLING' ? 'dice-roller-settling' : '',
      ].join(' ')}
      aria-label="주사위"
    >
      <div className="dice-row">
        <Dice3D value={dice[0]} rolling={rollStage === 'HOLDING'} />
        <Dice3D value={dice[1]} rolling={rollStage === 'HOLDING'} />
      </div>
      <div className="dice-meta">{meta}</div>
    </div>
  );
};


export default DiceRoller;

