import { useState } from 'react';
import useGameStore from '../../store/useGameStore';

const LoginPage = () => {
  const [playerName, setPlayerName] = useState('');
  const { addPlayer, setCurrentPage } = useGameStore();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (playerName.trim().length < 2) return;

    addPlayer(playerName.trim());
    setCurrentPage('lobby');
  };

  return (
    <div className="ui-page flex items-center justify-center">
      <div className="ui-bg-blobs" aria-hidden="true">
        <div className="ui-blob -left-24 -top-24 bg-sky-500/20" />
        <div className="ui-blob -bottom-28 -right-28 bg-fuchsia-500/20" />
        <div className="ui-blob left-1/2 top-1/3 -translate-x-1/2 bg-indigo-500/10" />
      </div>

      <div className="relative z-10 w-full max-w-md px-6">
        {/* Logo */}
        <div className="mb-10 text-center">
          <h1 className="mb-2 text-5xl font-black text-white">
            <span className="bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-400 bg-clip-text text-transparent">
              ZERO SUM
            </span>
          </h1>
          <p className="text-lg text-white/70">부자가 되는 보드게임</p>
        </div>

        {/* Login Card */}
        <div className="ui-card-lg">
          <h2 className="mb-6 text-center text-2xl font-bold text-white">게임 입장</h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-300">
                플레이어 이름
              </label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="이름을 입력하세요"
                maxLength={10}
                className="ui-input"
              />
              <p className="mt-2 text-xs text-gray-500">2~10자 이내로 입력해주세요</p>
            </div>

            <button
              type="submit"
              disabled={playerName.trim().length < 2}
              className="ui-btn ui-btn-primary w-full py-4 text-lg font-bold"
            >
              입장하기
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-400">
            최대 4명까지 참가 가능합니다
          </div>
        </div>

        {/* Characters preview */}
        <div className="mt-8 flex justify-center gap-4">
          {['🚀', '📱', '🏛️', '🐻'].map((emoji, i) => (
            <div
              key={i}
              className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-2xl shadow-lg shadow-black/40 backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/10"
            >
              {emoji}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
