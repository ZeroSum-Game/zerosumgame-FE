import useGameStore, { CHARACTER_INFO } from '../../store/useGameStore';

const formatMoney = (n: number) => `₩${Math.max(0, Math.round(n)).toLocaleString()}`;
const PLAYER_SLOT_ICON_CLASSES = [
  'border-sky-400/30 bg-sky-500/[0.14]',
  'border-red-400/30 bg-red-500/[0.14]',
  'border-emerald-400/30 bg-emerald-500/[0.14]',
  'border-amber-300/30 bg-amber-400/[0.14]',
] as const;

const ResultPage = () => {
  const gameResult = useGameStore((state) => state.gameResult);
  const players = useGameStore((state) => state.players);
  const resetToLobby = useGameStore((state) => state.resetToLobby);
  const resetAll = useGameStore((state) => state.resetAll);

  const ranking = gameResult?.ranking ?? [];
  const winnerId = gameResult?.winnerId ?? null;
  const winner = winnerId ? players.find((p) => p.id === winnerId) ?? null : null;

  return (
    <div className="ui-page flex items-center justify-center p-6">
      <div className="ui-bg-blobs" aria-hidden="true">
        <div className="ui-blob -left-40 top-1/4 bg-amber-400/10" />
        <div className="ui-blob -right-40 bottom-1/4 bg-emerald-400/10" />
        <div className="ui-blob left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-sky-500/10" />
      </div>

      <div className="relative z-10 w-full max-w-3xl">
        <div className="ui-card-lg">
          <p className="text-[10px] uppercase tracking-[0.35em] text-white/60">GAME OVER</p>
          <h1 className="mt-2 text-4xl font-black text-white">결과</h1>
          <p className="mt-2 text-sm text-white/70">
            {gameResult?.reason ?? '게임 종료'} · {gameResult?.endedAtRound ?? 0}턴
          </p>

          <div className="mt-8 rounded-2xl border border-white/10 bg-black/30 p-5">
            <p className="text-sm font-bold text-white/80">우승</p>
            <div className="mt-3 flex items-center gap-4">
              <div
                className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 text-3xl shadow-lg shadow-black/40"
                style={{ backgroundColor: winner?.character ? CHARACTER_INFO[winner.character].color + '26' : 'rgba(255,255,255,0.06)' }}
              >
                {winner?.character ? CHARACTER_INFO[winner.character].emoji : '🏆'}
              </div>
              <div className="flex-1">
                <p className="text-2xl font-black text-amber-300">{winner?.name ?? '—'}</p>
                <p className="text-sm text-white/60">
                  {winner?.character ? CHARACTER_INFO[winner.character].name : ''}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <p className="mb-3 text-sm font-bold text-white/80">순위</p>
            <div className="space-y-2">
              {ranking.map((r, idx) => {
                const p = players.find((x) => x.id === r.playerId) ?? null;
                const isWinner = r.playerId === winnerId;
                const slotIndex = players.findIndex((x) => x.id === r.playerId);
                const iconClass = PLAYER_SLOT_ICON_CLASSES[(slotIndex === -1 ? 0 : slotIndex) % PLAYER_SLOT_ICON_CLASSES.length];
                return (
                  <div
                    key={r.playerId}
                    className={`flex items-center justify-between rounded-2xl border px-4 py-3 ${
                      isWinner ? 'border-amber-300/30 bg-amber-400/[0.08]' : 'border-white/10 bg-white/[0.04]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-lg font-black">
                        {idx + 1}
                      </div>
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-xl border text-xl ${iconClass}`}
                      >
                        {p?.character ? CHARACTER_INFO[p.character].emoji : '🙂'}
                      </div>
                      <div>
                        <p className="text-sm font-black text-white">{p?.name ?? '—'}</p>
                        <p className="text-[10px] text-white/50">{p?.character ? CHARACTER_INFO[p.character].name : ''}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-white/50">총자산</p>
                      <p className={`text-sm font-black ${isWinner ? 'text-amber-200' : 'text-emerald-300'}`}>
                        {formatMoney(r.netWorth)}
                      </p>
                    </div>
                  </div>
                );
              })}
              {ranking.length === 0 && <p className="text-sm text-white/50">결과를 불러올 수 없습니다.</p>}
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button type="button" className="ui-btn ui-btn-secondary flex-1 py-4 text-lg font-black" onClick={resetToLobby}>
              로비로
            </button>
            <button type="button" className="ui-btn ui-btn-primary flex-1 py-4 text-lg font-black" onClick={resetAll}>
              처음으로
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultPage;
