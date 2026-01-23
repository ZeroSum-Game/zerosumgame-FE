import { useState } from 'react';
import useGameStore, { CHARACTER_INFO, CharacterType } from '../../store/useGameStore';

const CHARACTERS: CharacterType[] = ['ELON', 'SAMSUNG', 'TRUMP', 'PUTIN'];

const LobbyPage = () => {
  const {
    players,
    addPlayer,
    removePlayer,
    selectCharacter,
    setPlayerReady,
    startGame,
    maxPlayers,
  } = useGameStore();

  const [newPlayerName, setNewPlayerName] = useState('');

  const handleAddPlayer = () => {
    if (newPlayerName.trim().length < 2) return;
    if (players.length >= maxPlayers) return;

    addPlayer(newPlayerName.trim());
    setNewPlayerName('');
  };

  const isCharacterTaken = (character: CharacterType) => {
    return players.some(p => p.character === character);
  };

  const canStartGame = players.length >= 2 && players.every(p => p.isReady && p.character);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-6">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 top-1/4 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute -right-40 bottom-1/4 h-96 w-96 rounded-full bg-purple-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-4xl font-black text-white">캐릭터 선택</h1>
          <p className="text-blue-300">플레이어: {players.length} / {maxPlayers}</p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Left: Character Selection */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
            <h2 className="mb-6 text-xl font-bold text-white">캐릭터 목록</h2>

            <div className="grid grid-cols-2 gap-4">
              {CHARACTERS.map((char) => {
                const info = CHARACTER_INFO[char];
                const taken = isCharacterTaken(char);
                const takenBy = players.find(p => p.character === char);

                return (
                  <div
                    key={char}
                    className={`relative overflow-hidden rounded-xl border-2 p-4 transition ${
                      taken
                        ? 'border-green-500/50 bg-green-500/10'
                        : 'border-white/10 bg-white/5 hover:border-white/30'
                    }`}
                  >
                    {/* Character emoji */}
                    <div
                      className="mb-3 flex h-20 w-20 items-center justify-center rounded-full text-4xl mx-auto"
                      style={{ backgroundColor: info.color + '30' }}
                    >
                      {info.emoji}
                    </div>

                    {/* Character name */}
                    <h3 className="text-center text-lg font-bold text-white">{info.name}</h3>

                    {/* Taken badge */}
                    {taken && takenBy && (
                      <div className="mt-2 rounded-full bg-green-500/20 px-3 py-1 text-center text-xs font-medium text-green-400">
                        {takenBy.name} 선택
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Player List */}
          <div className="space-y-6">
            {/* Add Player */}
            {players.length < maxPlayers && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
                <h2 className="mb-4 text-xl font-bold text-white">플레이어 추가</h2>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={newPlayerName}
                    onChange={(e) => setNewPlayerName(e.target.value)}
                    placeholder="플레이어 이름"
                    maxLength={10}
                    className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-500 outline-none transition focus:border-blue-500"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddPlayer()}
                  />
                  <button
                    onClick={handleAddPlayer}
                    disabled={newPlayerName.trim().length < 2}
                    className="rounded-xl bg-blue-600 px-6 py-3 font-bold text-white transition hover:bg-blue-500 disabled:opacity-50"
                  >
                    추가
                  </button>
                </div>
              </div>
            )}

            {/* Player Cards */}
            <div className="space-y-4">
              {players.map((player, index) => (
                <div
                  key={player.id}
                  className={`rounded-2xl border p-4 backdrop-blur-xl transition ${
                    player.isReady
                      ? 'border-green-500/50 bg-green-500/10'
                      : 'border-white/10 bg-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {/* Player order */}
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-lg font-bold text-white">
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
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Ready badge */}
                      {player.isReady && (
                        <span className="rounded-full bg-green-500/20 px-3 py-1 text-xs font-medium text-green-400">
                          준비완료
                        </span>
                      )}

                      {/* Remove button */}
                      <button
                        onClick={() => removePlayer(player.id)}
                        className="rounded-lg bg-red-500/20 p-2 text-red-400 transition hover:bg-red-500/30"
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
                          const taken = isCharacterTaken(char);
                          const isSelected = player.character === char;

                          return (
                            <button
                              key={char}
                              onClick={() => selectCharacter(player.id, char)}
                              disabled={taken && !isSelected}
                              className={`flex h-12 w-12 items-center justify-center rounded-xl text-xl transition ${
                                isSelected
                                  ? 'bg-blue-600 ring-2 ring-blue-400'
                                  : taken
                                  ? 'cursor-not-allowed bg-white/5 opacity-30'
                                  : 'bg-white/10 hover:bg-white/20'
                              }`}
                              title={info.name}
                            >
                              {info.emoji}
                            </button>
                          );
                        })}
                      </div>

                      {/* Ready button */}
                      {player.character && (
                        <button
                          onClick={() => setPlayerReady(player.id, true)}
                          className="mt-4 w-full rounded-xl bg-green-600 py-2 font-bold text-white transition hover:bg-green-500"
                        >
                          준비 완료
                        </button>
                      )}
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
              className={`w-full rounded-2xl py-4 text-xl font-black transition ${
                canStartGame
                  ? 'bg-gradient-to-r from-yellow-500 to-amber-500 text-black shadow-lg shadow-yellow-500/25 hover:from-yellow-400 hover:to-amber-400'
                  : 'cursor-not-allowed bg-white/10 text-gray-500'
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
