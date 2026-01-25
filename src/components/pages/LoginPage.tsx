import { useMemo } from 'react';
import useGameStore, { CHARACTER_INFO, type CharacterType } from '../../store/useGameStore';
import { CHARACTER_THEME } from '../../utils/characterTheme';

const CHARACTER_ORDER: CharacterType[] = ['ELON', 'SAMSUNG', 'TRUMP', 'PUTIN'];

const LoginPage = () => {
  const { addPlayer, setCurrentPage } = useGameStore();

  const guestName = useMemo(() => {
    const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `게스트-${suffix}`;
  }, []);

  return (
    <div className="ui-page flex items-center justify-center">
      <div className="ui-bg-blobs" aria-hidden="true">
        <div className="ui-blob -left-24 -top-24 bg-sky-500/20" />
        <div className="ui-blob -bottom-28 -right-28 bg-fuchsia-500/20" />
        <div className="ui-blob left-1/2 top-1/3 -translate-x-1/2 bg-indigo-500/10" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-6xl px-6">
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_auto_1fr]">
          {/* Left characters (desktop) */}
          <div className="hidden items-center justify-center lg:flex">
            <div className="flex flex-col gap-10">
              {CHARACTER_ORDER.slice(0, 2).map((char) => {
                const c = CHARACTER_THEME[char];
                const src = CHARACTER_INFO[char].avatar;
                return (
                  <div
                    key={char}
                    className={`h-52 w-52 rounded-full border border-white/10 p-2 shadow-2xl shadow-black/50 backdrop-blur xl:h-60 xl:w-60 ${c.bgClass}`}
                  >
                    <img
                      src={src}
                      alt="캐릭터"
                      className={`h-full w-full rounded-full object-cover ring-2 ${c.ringClass}`}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Center */}
          <div className="w-full max-w-lg justify-self-center">
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

              <div className="space-y-6">
                <button
                  type="button"
                  onClick={() => {
                    // TODO: Replace with real Google OAuth flow + user profile.
                    addPlayer(guestName);
                    setCurrentPage('lobby');
                  }}
                  className="flex w-full items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/90 px-6 py-5 text-lg font-black text-slate-900 shadow-lg shadow-black/40 transition hover:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-400/25"
                >
                  <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
                    <path
                      fill="#FFC107"
                      d="M43.611 20.083H42V20H24v8h11.303C33.657 32.651 29.172 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.971 3.029l5.657-5.657C34.05 6.053 29.272 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
                    />
                    <path
                      fill="#FF3D00"
                      d="M6.306 14.691l6.571 4.819C14.655 16.108 19.01 12 24 12c3.059 0 5.842 1.154 7.971 3.029l5.657-5.657C34.05 6.053 29.272 4 24 4c-7.682 0-14.32 4.337-17.694 10.691z"
                    />
                    <path
                      fill="#4CAF50"
                      d="M24 44c5.066 0 9.756-1.939 13.254-5.091l-6.126-5.182C29.079 35.091 26.676 36 24 36c-5.151 0-9.625-3.326-11.283-7.946l-6.521 5.025C9.505 39.556 16.227 44 24 44z"
                    />
                    <path
                      fill="#1976D2"
                      d="M43.611 20.083H42V20H24v8h11.303c-.792 2.243-2.231 4.149-4.175 5.424l.003-.002 6.126 5.182C36.823 39.83 44 35 44 24c0-1.341-.138-2.65-.389-3.917z"
                    />
                  </svg>
                  Google로 계속하기
                </button>
                <div className="text-center text-sm text-white/60">
                  로그인 후 게임에 참가할 수 있어요.
                </div>
              </div>

              <div className="mt-6 text-center text-sm text-gray-400">최대 4명까지 참가 가능합니다</div>
            </div>

            {/* Characters preview (mobile) */}
            <div className="mt-8 flex justify-center gap-4 lg:hidden">
              {CHARACTER_ORDER.map((char) => {
                const c = CHARACTER_THEME[char];
                const src = CHARACTER_INFO[char].avatar;
                return (
                  <div
                    key={char}
                    className={`flex h-14 w-14 items-center justify-center rounded-full border border-white/10 shadow-lg shadow-black/40 backdrop-blur transition hover:-translate-y-0.5 ${c.bgClass}`}
                  >
                    <img
                      src={src}
                      alt="캐릭터"
                      className={`h-14 w-14 rounded-full object-cover ring-2 ${c.ringClass}`}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right characters (desktop) */}
          <div className="hidden items-center justify-center lg:flex">
            <div className="flex flex-col gap-10">
              {CHARACTER_ORDER.slice(2, 4).map((char) => {
                const c = CHARACTER_THEME[char];
                const src = CHARACTER_INFO[char].avatar;
                return (
                  <div
                    key={char}
                    className={`h-52 w-52 rounded-full border border-white/10 p-2 shadow-2xl shadow-black/50 backdrop-blur xl:h-60 xl:w-60 ${c.bgClass}`}
                  >
                    <img
                      src={src}
                      alt="캐릭터"
                      className={`h-full w-full rounded-full object-cover ring-2 ${c.ringClass}`}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
