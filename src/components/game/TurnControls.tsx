import { useEffect, useRef, useState } from 'react';
import useGameStore from '../../store/useGameStore';
import { useGameSocketContext } from '../pages/GamePage';

let sharedDiceAudioCtx: AudioContext | null = null;

const getAudioContext = () => {
  if (sharedDiceAudioCtx) return sharedDiceAudioCtx;
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  sharedDiceAudioCtx = new Ctx();
  return sharedDiceAudioCtx;
};

const useDiceSounds = () => {
  const rollingRef = useRef<null | { source: AudioBufferSourceNode; gain: GainNode }>(null);

  const startRolling = async () => {
    const ctx = getAudioContext();
    if (ctx.state !== 'running') await ctx.resume();
    if (rollingRef.current) return;

    const seconds = 1.1;
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.16;

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 780;
    filter.Q.value = 0.6;

    const gain = ctx.createGain();
    gain.gain.value = 0.0001;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.11, now + 0.08);

    source.start();
    rollingRef.current = { source, gain };
  };

  const stopRollingWithClick = async () => {
    const ctx = getAudioContext();
    if (ctx.state !== 'running') await ctx.resume();

    const rolling = rollingRef.current;
    if (rolling) {
      const now = ctx.currentTime;
      rolling.gain.gain.cancelScheduledValues(now);
      rolling.gain.gain.setValueAtTime(rolling.gain.gain.value, now);
      rolling.gain.gain.linearRampToValueAtTime(0.0001, now + 0.07);
      rolling.source.stop(now + 0.08);
      rollingRef.current = null;
    }

    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = 260;

    const gain = ctx.createGain();
    gain.gain.value = 0.0001;

    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.08, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
    osc.start(now);
    osc.stop(now + 0.10);
  };

  useEffect(() => {
    return () => {
      try {
        rollingRef.current?.source.stop();
      } catch {
        // ignore
      }
      rollingRef.current = null;
    };
  }, []);

  return { startRolling, stopRollingWithClick };
};

const TurnControls = () => {
  const phase = useGameStore((s) => s.phase);
  const activeModal = useGameStore((s) => s.activeModal);
  const hasRolledThisTurn = useGameStore((s) => s.hasRolledThisTurn);
  const extraRolls = useGameStore((s) => s.extraRolls);
  const isRolling = useGameStore((s) => s.isRolling);
  const rollStage = useGameStore((s) => s.rollStage);

  // 백엔드 연동: useGameSocketContext 사용
  const { rollDice, endTurn, error } = useGameSocketContext();

  const canRoll = phase === 'IDLE' && !activeModal && (!hasRolledThisTurn || extraRolls > 0) && !isRolling;
  const canEndTurn = phase === 'IDLE' && !activeModal && hasRolledThisTurn && !isRolling;

  const isHoldRolling = rollStage === 'HOLDING';
  const isSettling = rollStage === 'SETTLING';

  const rollButtonActive = canRoll || isHoldRolling || isSettling;
  const action = rollButtonActive ? 'ROLL' : canEndTurn ? 'END TURN' : null;
  const disabled = !action || (action === 'ROLL' ? !rollButtonActive : action === 'END TURN' ? !canEndTurn : true);

  let label = action === 'ROLL' ? '주사위 굴리기' : action === 'END TURN' ? '턴 종료' : '대기';
  if (phase === 'MOVING') label = '이동 중…';
  if (isHoldRolling) label = '굴리는 중…';
  if (isSettling) label = '멈추는 중…';
  if (activeModal) label = '처리 필요';

  const hint =
    error ? error :
    canRoll && extraRolls > 0
      ? `추가 굴리기: ${extraRolls}`
      : canRoll
      ? '버튼을 클릭하여 주사위를 굴려요.'
      : canEndTurn
      ? '확인 후 턴을 종료하세요.'
      : activeModal
      ? '모달을 처리해야 계속할 수 있어요.'
      : phase === 'MOVING'
      ? '이동 중…'
      : ' ';

  const { startRolling, stopRollingWithClick } = useDiceSounds();
  const [pressing, setPressing] = useState(false);

  const handleRoll = async () => {
    if (!canRoll) return;
    setPressing(true);
    await startRolling();
    rollDice(); // 백엔드로 주사위 굴리기 요청
    setTimeout(async () => {
      await stopRollingWithClick();
      setPressing(false);
    }, 500);
  };

  const handleEndTurn = () => {
    if (!canEndTurn) return;
    endTurn(); // 백엔드로 턴 종료 요청
  };

  return (
    <div className="turn-controls">
      <button
        type="button"
        className={[
          'dash-btn',
          disabled ? 'dash-btn-disabled' : 'dash-btn-primary',
          pressing ? 'dash-btn-holding' : '',
        ].join(' ')}
        disabled={disabled}
        onClick={() => {
          if (action === 'ROLL' && canRoll) {
            void handleRoll();
          } else if (action === 'END TURN' && canEndTurn) {
            handleEndTurn();
          }
        }}
      >
        {label}
      </button>
      <div className={`turn-controls-hint ${error ? 'text-red-400' : ''}`}>{hint}</div>
    </div>
  );
};

export default TurnControls;
