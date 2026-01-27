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
  const dice = useGameStore((s) => s.dice);
  const rollingUserId = useGameStore((s) => s.rollingUserId);
  const players = useGameStore((s) => s.players);

  const { rollDice, endTurn, error, isMyTurn, myUserId, connected } = useGameSocketContext();
  const myTurn = isMyTurn();

  const rollingPlayer = rollingUserId ? players.find((p) => p.userId === rollingUserId) : null;
  const rollingPlayerName = rollingPlayer?.name ?? '플레이어';

  const canRoll =
    connected &&
    myTurn &&
    phase === 'IDLE' &&
    !activeModal &&
    (!hasRolledThisTurn || extraRolls > 0) &&
    !isRolling;
  const canEndTurn = connected && myTurn && phase === 'IDLE' && !activeModal && hasRolledThisTurn && !isRolling;

  const isHoldRolling = rollStage === 'HOLDING';
  const isSettling = rollStage === 'SETTLING';

  const { startRolling, stopRollingWithClick } = useDiceSounds();
  const [pressing, setPressing] = useState(false);
  const soundFnRef = useRef({ startRolling, stopRollingWithClick });
  soundFnRef.current = { startRolling, stopRollingWithClick };

  useEffect(() => {
    if (isRolling && rollingUserId && rollingUserId !== myUserId) {
      void soundFnRef.current.startRolling().catch(() => undefined);
    }
  }, [isRolling, rollingUserId, myUserId]);

  useEffect(() => {
    if (!isRolling && rollStage === 'IDLE') {
      void soundFnRef.current.stopRollingWithClick().catch(() => undefined);
    }
  }, [isRolling, rollStage]);

  const handleRoll = () => {
    if (!canRoll) return;
    setPressing(true);
    rollDice();
    void startRolling().catch(() => undefined);
    window.setTimeout(() => {
      setPressing(false);
    }, 500);
  };

  const handleEndTurn = () => {
    if (!canEndTurn) return;
    endTurn();
  };

  if (!myTurn) {
    return (
      <div className="turn-controls">
        {isRolling ? (
          <div className="turn-controls-spectate">
            <div className="spectate-dice-animation">
              <span className="spectate-dice">[]</span>
              <span className="spectate-dice delay">[]</span>
            </div>
            <div className="spectate-text">
              {isSettling ? (
                <span className="dice-result">
                  주사위 {dice[0]} + {dice[1]} = {dice[0] + dice[1]}
                </span>
              ) : (
                <span>{rollingPlayerName} 주사위 굴리는 중...</span>
              )}
            </div>
          </div>
        ) : (
          <div className="turn-controls-waiting">
            <span>다른 플레이어 기다리는 중</span>
          </div>
        )}
      </div>
    );
  }

  const rollButtonActive = canRoll || isHoldRolling || isSettling;
  const action = rollButtonActive ? 'ROLL' : canEndTurn ? 'END_TURN' : 'WAIT';
  const disabled =
    action === 'WAIT' || (action === 'ROLL' ? !canRoll : action === 'END_TURN' ? !canEndTurn : true);

  let label = connected ? 'WAIT' : '연결 중..';
  if (action === 'ROLL') label = '주사위 굴리기';
  if (action === 'END_TURN') label = '턴 종료';
  if (phase === 'MOVING') label = '움직이는 중..';
  if (isHoldRolling) label = '굴리는 중..';
  if (isSettling) label = `주사위 ${dice[0]} + ${dice[1]} = ${dice[0] + dice[1]}`;
  if (activeModal) label = '움직임이 필요합니다';

  const hint =
    error ??
    (!connected
      ? '서버에 연결하는 중 입니다.'
      : canRoll && extraRolls > 0
      ? `추가 굴리기 ${extraRolls}`
      : canRoll
      ? '주사위를 굴리세요'
      : canEndTurn
      ? '다음 플레이어로 턴을 넘기세요.'
      : activeModal
      ? '모달을 해결하세요.'
      : phase === 'MOVING'
      ? '움직이는 중...'
      : isSettling
      ? dice[0] === dice[1]
        ? '더블! 한번 더!'
        : ''
      : ' ');

  return (
    <div className="turn-controls">
      <button
        type="button"
        className={[
          'dash-btn',
          disabled ? 'dash-btn-disabled' : 'dash-btn-primary',
          pressing ? 'dash-btn-holding' : '',
          isSettling ? 'dash-btn-result' : '',
        ].join(' ')}
        disabled={disabled}
        onClick={() => {
          if (action === 'ROLL' && canRoll) {
            handleRoll();
          } else if (action === 'END_TURN' && canEndTurn) {
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
