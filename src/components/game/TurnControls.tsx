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

  let label = action ?? 'WAIT';
  if (phase === 'MOVING') label = 'MOVING…';
  if (isRolling) label = 'ROLLING…';
  if (activeModal) label = 'ACTION REQUIRED';

  const hint =
    canRoll && extraRolls > 0
      ? `Extra roll: ${extraRolls}`
      : canEndTurn
      ? 'Close positions, then end the turn.'
      : activeModal
      ? 'Resolve the modal to continue.'
      : phase === 'MOVING'
      ? 'Position updating…'
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

