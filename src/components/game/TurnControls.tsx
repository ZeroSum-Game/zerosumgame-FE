import useGameStore from '../../store/useGameStore';

const TurnControls = () => {
  const phase = useGameStore((s) => s.phase);
  const activeModal = useGameStore((s) => s.activeModal);
  const hasRolledThisTurn = useGameStore((s) => s.hasRolledThisTurn);
  const extraRolls = useGameStore((s) => s.extraRolls);
  const isRolling = useGameStore((s) => s.isRolling);

  const startRoll = useGameStore((s) => s.startRoll);
  const endTurn = useGameStore((s) => s.endTurn);

  const canRoll = phase === 'IDLE' && !activeModal && (!hasRolledThisTurn || extraRolls > 0) && !isRolling;
  const canEndTurn = phase === 'IDLE' && !activeModal && hasRolledThisTurn && !isRolling;

  const action = canRoll ? 'ROLL' : canEndTurn ? 'END TURN' : null;
  const disabled = !action;

  let label = action === 'ROLL' ? '굴리기' : action === 'END TURN' ? '턴 종료' : '대기';
  if (phase === 'MOVING') label = '이동 중…';
  if (isRolling) label = '굴리는 중…';
  if (activeModal) label = '처리 필요';

  const hint =
    canRoll && extraRolls > 0
      ? `추가 굴리기: ${extraRolls}`
      : canEndTurn
      ? '확인 후 턴을 종료하세요.'
      : activeModal
      ? '모달을 처리해야 계속할 수 있어요.'
      : phase === 'MOVING'
      ? '이동 중…'
      : ' ';

  return (
    <div className="turn-controls">
      <button
        type="button"
        className={`dash-btn ${disabled ? 'dash-btn-disabled' : 'dash-btn-primary'}`}
        disabled={disabled}
        onClick={() => {
          if (canRoll) startRoll();
          if (canEndTurn) endTurn();
        }}
      >
        {label}
      </button>
      <div className="turn-controls-hint">{hint}</div>
    </div>
  );
};

export default TurnControls;
