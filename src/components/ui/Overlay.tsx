import useGameStore from '../../store/useGameStore';
import { useState } from 'react';
import { BOARD_DATA } from '../../utils/boardUtils';

const Overlay = () => {
  const {
    currentTurn, selectedTile, playerIndex, nextTurn, dice, isDouble, startRoll, isRolling,
    cash, lands, buyLand
  } = useGameStore();

  // You might need to import BOARD_DATA to know if it's a country
  const currentSpace = BOARD_DATA[playerIndex];
  const isLandable = currentSpace.type === 'COUNTRY';
  const isOwned = !!lands[playerIndex];
  const canBuy = !isRolling && isLandable && !isOwned && cash >= (currentSpace.price || 0);

  // Simple state to track if we already acted on this tile? 
  // For now, just show if canBuy is true. 
  // Real game would need a "phase" state (e.g. MOVED -> ACTION -> NEXT).

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col items-start p-6 text-sm text-white">
      <div className="pointer-events-auto w-full max-w-sm space-y-2 rounded-xl border border-white/20 bg-black/60 p-4 shadow-lg backdrop-blur">
        <p className="text-xs uppercase tracking-[0.2em] text-white/60">현재 턴</p>
        <p className="text-2xl font-semibold">{currentTurn}</p>
        <p className="text-xs uppercase tracking-[0.2em] text-white/60">자산</p>
        <p className="text-2xl font-semibold text-emerald-400">₩ {cash.toLocaleString()}</p>
        <p className="text-xs uppercase tracking-[0.2em] text-white/60">플레이어 위치</p>
        <p className="text-lg font-medium">{BOARD_DATA[playerIndex].name}</p>

        <p className="text-xs uppercase tracking-[0.2em] text-white/60">
          마지막 주사위
        </p>
        <p className="text-lg font-medium">🎲 {dice[0]} 🎲 {dice[1]}</p>

        <p className="text-xs text-white/70">
          보드 주변을 클릭하면 칸을 선택하고, 정보를 이 영역에서 확인할 수 있습니다.
        </p>
      </div>

      {/* Buy Modal */}
      {canBuy && (
        <div className="pointer-events-auto absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transform rounded-xl border border-white/20 bg-black/80 p-6 shadow-2xl backdrop-blur-md">
          <h2 className="mb-2 text-xl font-bold text-white">{currentSpace.name} 도착!</h2>
          <p className="mb-4 text-gray-300">이 땅을 구매하시겠습니까?</p>
          <p className="mb-6 text-2xl font-bold text-emerald-400">₩ {currentSpace.price?.toLocaleString()}</p>
          <div className="flex gap-4">
            <button
              onClick={() => buyLand(playerIndex, currentSpace.price || 0)}
              className="rounded-lg bg-emerald-600 px-6 py-2 font-bold text-white hover:bg-emerald-500"
            >
              구매
            </button>
            <button
              onClick={nextTurn} // Skip buying
              className="rounded-lg bg-gray-600 px-6 py-2 font-bold text-white hover:bg-gray-500"
            >
              취소
            </button>
          </div>
        </div>
      )}

      <div className="pointer-events-auto mt-4 flex gap-3">
        <button
          className={`rounded-xl border border-white/20 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-white transition ${isDouble
            ? 'bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-200'
            : 'bg-white/10 hover:bg-white/20'
            }`}
          onClick={() => {
            if (!isRolling) startRoll();
          }}
        >
          {isDouble ? '더블! 다시 굴리기' : '주사위 굴리기'}
        </button>
        <button
          className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-white/20"
          onClick={nextTurn}
        >
          다음 턴 시작
        </button>
      </div>
    </div>
  );

};

export default Overlay;
