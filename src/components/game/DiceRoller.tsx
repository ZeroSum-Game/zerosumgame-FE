import { useEffect, useMemo, useRef, useState } from 'react';
import useGameStore from '../../store/useGameStore';

const randDie = () => Math.floor(Math.random() * 6) + 1;

const DiceFace = ({ value }: { value: number | null }) => {
  return <div className="dice-face">{value ?? '—'}</div>;
};

const DiceRoller = () => {
  const rollTrigger = useGameStore((s) => s.rollTrigger);
  const rollReleaseTrigger = useGameStore((s) => s.rollReleaseTrigger);
  const isRolling = useGameStore((s) => s.isRolling);
  const rollStage = useGameStore((s) => s.rollStage);
  const pendingDice = useGameStore((s) => s.pendingDice);
  const rollStartedAt = useGameStore((s) => s.rollStartedAt);
  const dice = useGameStore((s) => s.dice);
  const setDiceValues = useGameStore((s) => s.setDiceValues);

  const [ghost, setGhost] = useState<[number, number] | null>(null);
  const [settleAnimKey, setSettleAnimKey] = useState(0);
  const [lockedPreview, setLockedPreview] = useState(false);

  const holdIntervalRef = useRef<number | null>(null);
  const settleTimeoutsRef = useRef<number[]>([]);
  const activeRollIdRef = useRef<number>(0);
  const pendingRef = useRef<[number, number] | null>(null);

  useEffect(() => {
    pendingRef.current = pendingDice;
  }, [pendingDice]);

  const clearTimers = () => {
    if (holdIntervalRef.current !== null) {
      window.clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
    for (const t of settleTimeoutsRef.current) window.clearTimeout(t);
    settleTimeoutsRef.current = [];
  };

  useEffect(() => {
    if (rollTrigger <= 0) return;
    activeRollIdRef.current = rollTrigger;
    clearTimers();
    setLockedPreview(false);

    if (rollStage !== 'HOLDING') return;
    setGhost([randDie(), randDie()]);
    holdIntervalRef.current = window.setInterval(() => {
      if (activeRollIdRef.current !== rollTrigger) return;
      setGhost([randDie(), randDie()]);
    }, 65);

    return () => clearTimers();
  }, [rollStage, rollTrigger]);

  useEffect(() => {
    if (rollReleaseTrigger <= 0) return;
    if (rollStage !== 'SETTLING') return;

    const rollId = activeRollIdRef.current;
    clearTimers();

    const minTotalMs = 420;
    const elapsed = rollStartedAt ? Date.now() - rollStartedAt : minTotalMs;
    const extraDelay = Math.max(0, minTotalMs - elapsed);

    const ticks = [70, 90, 120, 170, 240, 320];
    let acc = extraDelay;

    for (const dt of ticks) {
      acc += dt;
      const t = window.setTimeout(() => {
        if (activeRollIdRef.current !== rollId) return;
        setGhost([randDie(), randDie()]);
      }, acc);
      settleTimeoutsRef.current.push(t);
    }

    const finalT = window.setTimeout(() => {
      if (activeRollIdRef.current !== rollId) return;
      const final = pendingRef.current;
      if (!final) return;
      setLockedPreview(true);
      setGhost(final);
      setSettleAnimKey((k) => k + 1);

      const lockT = window.setTimeout(() => {
        if (activeRollIdRef.current !== rollId) return;
        setLockedPreview(false);
        setGhost(null);
        setDiceValues(final);
      }, 220);
      settleTimeoutsRef.current.push(lockT);
    }, acc + 20);
    settleTimeoutsRef.current.push(finalT);

    return () => clearTimers();
  }, [rollReleaseTrigger, rollStage, rollStartedAt, setDiceValues]);

  const shown = useMemo<[number, number]>(() => {
    if (ghost) return ghost;
    return dice;
  }, [dice, ghost]);

  const meta =
    rollStage === 'HOLDING'
      ? '굴리는 중… (놓으면 멈춰요)'
      : rollStage === 'SETTLING'
      ? '멈추는 중…'
      : isRolling
      ? '굴리는 중…'
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
      <div
        className={[
          'dice-row',
          rollStage === 'HOLDING' || (rollStage === 'SETTLING' && !lockedPreview) ? 'dice-row-rolling' : '',
          lockedPreview ? 'dice-row-settle' : '',
        ].join(' ')}
        key={settleAnimKey}
      >
        <DiceFace value={shown[0] ?? null} />
        <DiceFace value={shown[1] ?? null} />
      </div>
      <div className="dice-meta">{meta}</div>
    </div>
  );
};

export default DiceRoller;
