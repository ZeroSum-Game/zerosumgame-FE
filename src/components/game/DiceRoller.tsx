
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
  const isDouble = useGameStore((s) => s.isDouble);
  const hasRolledThisTurn = useGameStore((s) => s.hasRolledThisTurn);

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

  return (
    <div
      className={[
        'dice-roller',
        rollStage === 'HOLDING' ? 'dice-roller-holding' : '',
        rollStage === 'SETTLING' ? 'dice-roller-settling' : '',
      ].join(' ')}
      aria-label="주사위"
    >
      <div className="dice-row relative">
        {/* DOUBLE! Effect */}
        {showDouble && (
          <div className="absolute -top-16 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
            <div className="text-4xl font-black text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.8)] animate-bounce-custom whitespace-nowrap"
              style={{ fontFamily: "'Press Start 2P', cursive", animation: "bounce 0.5s infinite alternate" }}>
              DOUBLE!
            </div>
          </div>
        )}
        <Dice3D value={dice[0]} rolling={rollStage === 'HOLDING'} />
        <Dice3D value={dice[1]} rolling={rollStage === 'HOLDING'} />
      </div>
      <div className="dice-meta">{meta}</div>
    </div>
  );
};


export default DiceRoller;

