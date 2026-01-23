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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-purple-500/20 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md px-6">
        {/* Logo */}
        <div className="mb-10 text-center">
          <h1 className="mb-2 text-5xl font-black text-white">
            <span className="bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-400 bg-clip-text text-transparent">
              ZERO SUM
            </span>
          </h1>
          <p className="text-lg text-blue-300">부자가 되는 보드게임</p>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl">
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
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-500 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
              <p className="mt-2 text-xs text-gray-500">2~10자 이내로 입력해주세요</p>
            </div>

            <button
              type="submit"
              disabled={playerName.trim().length < 2}
              className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 py-4 text-lg font-bold text-white shadow-lg shadow-blue-500/25 transition hover:from-blue-500 hover:to-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
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
              className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10 text-2xl backdrop-blur transition hover:scale-110 hover:bg-white/20"
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
