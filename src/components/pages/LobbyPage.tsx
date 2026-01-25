import { useEffect, useState } from 'react';
import useGameStore, { CHARACTER_INFO, CharacterType } from '../../store/useGameStore';
import { CHARACTER_THEME } from '../../utils/characterTheme';

const CHARACTERS: CharacterType[] = ['ELON', 'SAMSUNG', 'TRUMP', 'PUTIN'];
const PLAYER_SLOT_BADGE_CLASSES = [
  'border-sky-400/30 bg-sky-500/[0.14] text-sky-50',
  'border-red-400/30 bg-red-500/[0.14] text-red-50',
  'border-emerald-400/30 bg-emerald-500/[0.14] text-emerald-50',
  'border-amber-300/30 bg-amber-400/[0.14] text-amber-50',
] as const;

const LobbyPage = () => {
  const {
    players,
    removePlayer,
    selectCharacter,
    setPlayerReady,
    startGame,
    maxPlayers,
  } = useGameStore();

  const [activePlayerId, setActivePlayerId] = useState<number | null>(null);

  useEffect(() => {
    // Keep active player aligned to a non-ready player (if possible).
    const activeStillValid = players.some((p) => p.id === activePlayerId && !p.isReady);
    if (activeStillValid) return;

    const firstNonReady = players.find((p) => !p.isReady);
    setActivePlayerId(firstNonReady?.id ?? null);
  }, [players, activePlayerId]);

  const activePlayer = players.find((p) => p.id === activePlayerId) ?? null;

  const isCharacterTaken = (character: CharacterType) => {
    return players.some(p => p.character === character);
  };

  const canStartGame = players.length >= 2 && players.every(p => p.isReady && p.character);

  return (
    <div className="ui-page p-6">
      <div className="ui-bg-blobs" aria-hidden="true">
        <div className="ui-blob -left-40 top-1/4 bg-sky-500/10" />
        <div className="ui-blob -right-40 bottom-1/4 bg-fuchsia-500/10" />
        <div className="ui-blob left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-indigo-500/10" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-4xl font-black text-white">캐릭터 선택</h1>
          <p className="text-white/70">플레이어: {players.length} / {maxPlayers}</p>
        </div>

        <div className="grid items-start gap-8 lg:grid-cols-2">
          {/* Left: Character Selection */}
          <div className="ui-card">
            <h2 className="mb-6 text-xl font-bold text-white">캐릭터 목록</h2>

            <div className="grid grid-cols-2 gap-4">
              {CHARACTERS.map((char) => {
                const info = CHARACTER_INFO[char];
                const theme = CHARACTER_THEME[char];
                const taken = isCharacterTaken(char);
                const takenBy = players.find(p => p.character === char);
                const canPick =
                  !!activePlayer && !activePlayer.isReady && (!taken || takenBy?.id === activePlayer.id);

                return (
                  <button
                    key={char}
                    type="button"
                    onClick={() => {
                      if (!activePlayer) return;
                      selectCharacter(activePlayer.id, char);
                    }}
                    disabled={!canPick}
                    className={`relative overflow-hidden rounded-2xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-400/20 disabled:cursor-not-allowed disabled:opacity-60 ${
                      taken
                        ? 'border-emerald-400/40 bg-emerald-400/[0.08]'
                        : 'border-white/10 bg-white/[0.04] hover:border-white/20 hover:bg-white/[0.06]'
                    }`}
                  >
                    {/* Character emoji */}
                    <div
                      className={`mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full border border-white/10 shadow-lg shadow-black/40 ${theme.bgClass}`}
                    >
                      <img
                        src={info.avatar || '/assets/characters/default.png'}
                        alt={info.name}
                        className={`h-20 w-20 rounded-full object-cover ring-2 ${theme.ringClass}`}
                      />
                    </div>

                    {/* Character name */}
                    <h3 className="text-center text-lg font-bold text-white">{info.name}</h3>
                    <p className="mt-1 text-center text-xs text-white/70">{info.abilityShort}</p>

                    {/* Taken badge */}
                    {taken && takenBy && (
                      <div className="ui-badge ui-badge-success mt-2 w-full justify-center">
                        {takenBy.name} 선택
                      </div>
                    )}
                    {!taken && activePlayer && (
                      <div className="ui-badge mt-2 w-full justify-center border-sky-400/20 bg-sky-500/[0.12] text-sky-100">
                        {activePlayer.name} 선택
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Player List */}
          <div className="space-y-6">
            {/* Player Cards */}
            <div className="space-y-4">
              {players.map((player, index) => (
                <div
                  key={player.id}
                  className={`ui-card-sm transition ${
                    player.isReady
                      ? 'border-emerald-400/40 bg-emerald-500/[0.10]'
                      : activePlayerId === player.id
                      ? 'border-sky-400/40 bg-sky-500/[0.10] ring-2 ring-sky-400/20'
                      : 'cursor-pointer hover:border-white/20'
                  }`}
                  onClick={() => {
                    if (!player.isReady) setActivePlayerId(player.id);
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {/* Player order */}
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full border text-lg font-bold ${PLAYER_SLOT_BADGE_CLASSES[index % PLAYER_SLOT_BADGE_CLASSES.length]}`}
                      >
                        {index + 1}
                      </div>

                      {/* Player info */}
                      <div>
                        <h3 className="font-bold text-white">{player.name}</h3>
                        <p className="text-sm text-gray-400">
                          {player.character
                            ? CHARACTER_INFO[player.character].name
                            : '캐릭터 미선택'}
                        </p>
                        {player.character && (
                          <p className="mt-1 text-xs text-blue-200/80">
                            {CHARACTER_INFO[player.character].abilityShort}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Ready badge */}
                      {player.isReady && (
                        <span className="ui-badge ui-badge-success">
                          준비완료
                        </span>
                      )}

                      {/* Remove button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removePlayer(player.id);
                        }}
                        className="ui-icon-btn border-red-400/20 bg-red-500/[0.12] text-red-200 hover:bg-red-500/[0.18]"
                        aria-label="플레이어 제거"
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  {/* Character selection */}
                  {!player.isReady && (
                    <div className="mt-4">
                      <p className="mb-2 text-sm text-gray-400">캐릭터 선택:</p>
                      <div className="flex gap-2">
                        {CHARACTERS.map((char) => {
                          const info = CHARACTER_INFO[char];
                          const theme = CHARACTER_THEME[char];
                          const taken = isCharacterTaken(char);
                          const isSelected = player.character === char;

                          return (
                            <button
                              key={char}
                              onClick={() => selectCharacter(player.id, char)}
                              disabled={taken && !isSelected}
                              className={`flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 text-xl transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-400/20 ${
                                isSelected
                                  ? 'bg-sky-500/25 ring-2 ring-sky-400/25'
                                  : taken
                                  ? 'cursor-not-allowed bg-white/[0.04] opacity-30'
                                  : 'bg-white/[0.06] hover:bg-white/[0.10]'
                              }`}
                              title={info.name}
                            >
                              <img
                                src={info.avatar || '/assets/characters/default.png'}
                                alt={info.name}
                                className={`h-10 w-10 rounded-full object-cover ring-2 ${theme.ringClass}`}
                              />
                            </button>
                          );
                        })}
                      </div>

                      {/* Ready button */}
                      {player.character && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPlayerReady(player.id, true);
                          }}
                          className="ui-btn ui-btn-success mt-4 w-full py-2 font-bold"
                        >
                          준비 완료
                        </button>
                      )}

                      {player.character && (
                        <div className="mt-3 rounded-xl border border-white/10 bg-black/[0.25] px-4 py-3 text-xs text-white/80 backdrop-blur">
                          {CHARACTER_INFO[player.character].abilityDetail}
                        </div>
                      )}
                    </div>
                  )}

                  {player.isReady && (
                    <div className="mt-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPlayerReady(player.id, false);
                        }}
                        className="ui-btn ui-btn-secondary w-full py-2 font-bold"
                      >
                        준비 취소
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {/* Empty slots */}
              {Array.from({ length: maxPlayers - players.length }).map((_, i) => (
                <div
                  key={`empty-${i}`}
                  className="flex h-24 items-center justify-center rounded-2xl border border-dashed border-white/20 bg-white/5"
                >
                  <span className="text-gray-500">빈 슬롯</span>
                </div>
              ))}
            </div>

            {/* Start Game Button */}
            <button
              onClick={startGame}
              disabled={!canStartGame}
              className={`ui-btn w-full rounded-2xl py-4 text-xl font-black transition ${
                canStartGame
                  ? 'ui-btn-cta'
                  : 'cursor-not-allowed border border-white/10 bg-white/[0.06] text-white/40'
              }`}
            >
              {players.length < 2
                ? '최소 2명 필요'
                : !canStartGame
                ? '모든 플레이어 준비 필요'
                : '🎮 게임 시작!'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LobbyPage;
