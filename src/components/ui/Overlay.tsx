import useGameStore from '../../store/useGameStore';
import { useState } from 'react';

const Overlay = () => {
  const { currentTurn, selectedTile, playerIndex, nextTurn, dice, isDouble, rollDice } =
    useGameStore();

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col items-start p-6 text-sm text-white">
      <div className="pointer-events-auto w-full max-w-sm space-y-2 rounded-xl border border-white/20 bg-black/60 p-4 shadow-lg backdrop-blur">
        <p className="text-xs uppercase tracking-[0.2em] text-white/60">현재 턴</p>
        <p className="text-2xl font-semibold">{currentTurn}</p>
        <p className="text-xs uppercase tracking-[0.2em] text-white/60">플레이어 위치</p>
        <p className="text-lg font-medium">{playerIndex}</p>
        <p className="text-xs uppercase tracking-[0.2em] text-white/60">선택한 칸</p>
        <p className="text-lg font-medium">{selectedTile ?? '없음'}</p>
        <p className="text-xs uppercase tracking-[0.2em] text-white/60">
          마지막 주사위
        </p>
        <p className="text-lg font-medium">🎲 {dice[0]} 🎲 {dice[1]}</p>
        <p className="text-xs uppercase tracking-[0.2em] text-white/60">주사위</p>
        <div className="flex items-center gap-2">
          {dice.map((d, i) => (
            <span key={i} className="text-2xl">
              🎲 {d}
            </span>
          ))}
          {isDouble && <span className="ml-2 font-bold text-yellow-400">DOUBLE! 한 번 더!</span>}
        </div>
        <p className="text-xs text-white/70">
          보드 주변을 클릭하면 칸을 선택하고, 정보를 이 영역에서 확인할 수 있습니다.
        </p>
      </div>
      <div className="pointer-events-auto mt-4 flex gap-3">
        <button
          className={`rounded-xl border border-white/20 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-white transition ${isDouble
            ? 'bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-200'
            : 'bg-white/10 hover:bg-white/20'
            }`}
          onClick={rollDice}
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
