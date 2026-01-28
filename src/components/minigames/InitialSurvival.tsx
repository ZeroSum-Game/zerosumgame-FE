import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import useGameStore, { GAME_RULES } from '../../store/useGameStore';
import { useGameSocketContext } from '../pages/GamePage';
import { apiGrantMinigameReward } from '../../services/api';
import { formatKRWKo } from '../../utils/formatKRW';

type MinigamePhase = 'INTRO' | 'GAME' | 'RESULT';

type MinigamePlayer = {
  userId: number;
  nickname: string;
  score: number;
  isDropped: boolean;
};

type RankingRow = {
  rank: number;
  userId: number;
  nickname: string;
  score: number;
  isDropped: boolean;
};

const InitialSurvival = () => {
  const { closeModal, appendEventLog } = useGameStore();
  const { socket, myUserId } = useGameSocketContext();
  const [phase, setPhase] = useState<MinigamePhase>('INTRO');
  const [players, setPlayers] = useState<MinigamePlayer[]>([]);
  const [ranking, setRanking] = useState<RankingRow[]>([]);
  const [currentChosung, setCurrentChosung] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);
  const [timeLimit, setTimeLimit] = useState(0);
  const [introLeft, setIntroLeft] = useState(0);
  const [totalLeft, setTotalLeft] = useState(0);
  const [resultLeft, setResultLeft] = useState(0);
  const [winnerUserId, setWinnerUserId] = useState<number | null>(null);
  const [winners, setWinners] = useState<string[] | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const joinedRef = useRef(false);
  const rewardSentRef = useRef(false);

  const myPlayer = useMemo(
    () => players.find((p) => p.userId === myUserId),
    [players, myUserId]
  );

  const scoreboardPlayers = useMemo(
    () => [...players].sort((a, b) => b.score - a.score).slice(0, 4),
    [players]
  );

  useEffect(() => {
    if (!socket) return;

    const handleState = (payload: any) => {
      if (!payload) return;
      setPhase(payload.phase ?? 'INTRO');
      setPlayers(Array.isArray(payload.players) ? payload.players : []);
      setRanking(Array.isArray(payload.ranking) ? payload.ranking : []);
      setCurrentChosung(payload.currentChosung || '');
      setTimeLeft(Number(payload.timeLeft || 0));
      setTimeLimit(Number(payload.timeLimit || 0));
      setIntroLeft(Number(payload.introLeft || 0));
      setTotalLeft(Number(payload.totalLeft || 0));
      setResultLeft(Number(payload.resultLeft || 0));
      setWinners(payload.winners || null);
      setWinnerUserId(payload.winnerUserId ?? null);
      if (payload.phase === 'GAME') setErrorMessage(null);
    };

    const handleError = (payload: any) => {
      const message = payload?.message ? String(payload.message) : '오류가 발생했습니다.';
      setErrorMessage(message);
    };

    socket.on('minigame_state', handleState);
    socket.on('minigame_error', handleError);

    return () => {
      socket.off('minigame_state', handleState);
      socket.off('minigame_error', handleError);
    };
  }, [socket]);

  useEffect(() => {
    if (!socket) return;
    if (socket.connected && !joinedRef.current) {
      socket.emit('minigame_join');
      joinedRef.current = true;
    }
    if (!socket.connected) {
      joinedRef.current = false;
    }
    // Cleanup: Reset joinedRef when component unmounts
    return () => {
      joinedRef.current = false;
      rewardSentRef.current = false;
    };
  }, [socket, socket?.connected]);

  useEffect(() => {
    if (phase !== 'RESULT' || rewardSentRef.current || !winnerUserId) return;
    rewardSentRef.current = true;
    void (async () => {
      try {
        const result = await apiGrantMinigameReward(winnerUserId);
        const rewardValue = Math.max(0, Number(result?.reward ?? GAME_RULES.START_SALARY));
        if (rewardValue > 0 && winnerUserId === myUserId) {
          useGameStore.setState((state) => ({
            players: state.players.map((player) =>
              player.userId === winnerUserId ? { ...player, cash: player.cash + rewardValue } : player
            ),
          }));
          appendEventLog('MINIGAME', '미니게임 보상', `${formatKRWKo(rewardValue)} 지급`);
        }
      } catch (e: any) {
        setErrorMessage(e?.message ?? '보상 지급에 실패했습니다.');
      }
    })();
  }, [phase, winnerUserId, myUserId, appendEventLog]);

  useEffect(() => {
    if (phase === 'RESULT' && resultLeft <= 0) {
      closeModal();
    }
  }, [phase, resultLeft, closeModal]);

  useEffect(() => {
    if (phase === 'GAME' && !myPlayer?.isDropped) {
      inputRef.current?.focus();
    }
  }, [phase, myPlayer, currentChosung]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (phase !== 'GAME') return;
    if (!socket) return;
    if (myPlayer?.isDropped) return;
    const answer = inputValue.trim();
    if (!answer) return;
    socket.emit('minigame_answer', { answer });
    setInputValue('');
  };

  if (phase === 'INTRO') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px]">
        <img src="/quiz.png" alt="Quiz" className="w-[220px] h-auto mb-5 drop-shadow-xl" />
        <p className="text-base text-white/80 font-bold">제한 시간 내 2분반의 이름을 많이 맞히면 승리!</p>
        <p className="mt-3 text-xs text-white/50">시작까지 {introLeft}s</p>
      </div>
    );
  }

  if (phase === 'GAME') {
    const progress = timeLimit > 0 ? Math.max(0, Math.min(100, (timeLeft / timeLimit) * 100)) : 0;
    return (
      <div className="flex w-full h-full min-h-[500px] relative">
        <div className="absolute top-3 left-4 text-xs text-white/60">
          제한시간 {totalLeft}s
        </div>

        <div className="absolute top-10 -right-10 w-48 max-h-40 overflow-auto bg-black/60 border border-white/10 rounded-xl p-2.5 backdrop-blur-md z-10 shadow-xl">
          <div className="flex items-center justify-between mb-1.5 pb-1.5 border-b border-white/10">
            <span className="text-[10px] font-black text-white/60 tracking-wider">
              실시간 순위
            </span>
            <div className="w-1 h-1 rounded-full bg-red-500 animate-pulse" />
          </div>
          <div className="space-y-0.5">
            {scoreboardPlayers.map((p, index) => (
              <div
                key={p.userId}
                className={`flex items-center justify-between text-[11px] p-1 rounded ${
                  p.userId === myUserId ? "bg-white/10" : ""
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className={`w-3 text-center font-bold text-[10px] ${index < 3 ? "text-yellow-400" : "text-white/30"}`}
                  >
                    {index + 1}
                  </span>
                  <span className="text-white truncate max-w-[88px] text-[10px]">
                    {p.nickname}
                  </span>
                  {p.isDropped && (
                    <span className="text-red-400 text-[10px]">💀</span>
                  )}
                </div>
                <span className="font-mono font-bold text-white/90 text-[11px]">
                  {p.score}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center relative p-8">
          <div className="flex flex-col items-center gap-8 w-full max-w-5xl">
            <div className="w-full bg-white/5 px-8 py-6 rounded-2xl border border-white/10 shadow-2xl backdrop-blur-sm text-center">
              <span className="text-sm text-white/40 block mb-5 uppercase tracking-[0.3em] font-light">
                플레이어 초성을 입력하세요
              </span>
              <div className="flex justify-center gap-4">
                {(currentChosung || "-").split("").map((char, i) => (
                  <span
                    key={i}
                    className="text-4xl font-black text-white drop-shadow-[0_4px_0_rgba(0,0,0,0.5)] w-16 h-16 flex items-center justify-center bg-black/30 rounded-xl border border-white/5 shadow-inner"
                  >
                    {char}
                  </span>
                ))}
              </div>
            </div>

            <div className="w-full relative group max-w-lg">
              <form onSubmit={handleSubmit}>
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="w-full bg-black/60 border-2 border-yellow-400/30 rounded-2xl px-7 py-4 text-center text-2xl text-white placeholder-white/10 focus:outline-none focus:border-yellow-400 focus:ring-4 focus:ring-yellow-400/10 transition-all font-bold tracking-wider"
                  placeholder="정답 입력"
                  disabled={myPlayer?.isDropped}
                  autoFocus
                />
              </form>

              <div className="absolute -bottom-8 left-0 right-0 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-1000 linear ${timeLeft < 2 ? "bg-red-500" : "bg-yellow-400"}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {myPlayer?.isDropped && (
              <p className="text-red-400 font-bold">오답으로 탈락했습니다.</p>
            )}
            {errorMessage && (
              <p className="text-red-300 text-sm">{errorMessage}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'RESULT') {
    const winnerNames = winners && winners.length > 0 ? winners : null;
    const sortedRanking = ranking.length
      ? ranking
      : scoreboardPlayers.map((p, idx) => ({
        rank: idx + 1,
        userId: p.userId,
        nickname: p.nickname,
        score: p.score,
        isDropped: p.isDropped,
      }));
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] text-center animate-scale-in">
        <h2 className="text-4xl font-black text-white mb-2 font-pixel tracking-widest">최종 순위</h2>
        <div className="w-24 h-1 bg-yellow-400 mb-6 mx-auto" />
        <p className="text-xs text-white/50 mb-6">종료까지 {resultLeft}s</p>

        <div className="bg-black/40 border border-yellow-400/30 p-8 rounded-2xl backdrop-blur-md max-w-md w-full">
          <p className="text-white/60 mb-4 uppercase tracking-widest text-sm">랭킹</p>
          <div className="space-y-2">
            {sortedRanking.map((row) => (
              <div key={row.userId} className="flex items-center justify-between text-white/90 text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-6 text-yellow-300 font-black">{row.rank}</span>
                  <span className="font-bold">{row.nickname}</span>
                  {row.isDropped && <span className="text-red-400">💀</span>}
                </div>
                <span className="font-mono font-bold">{row.score}</span>
              </div>
            ))}
          </div>

          {winnerNames ? (
            <div className="mt-6 text-yellow-300 font-black">우승: {winnerNames.join(', ')}</div>
          ) : (
            <div className="mt-6 text-white/70 font-bold">승자 없음</div>
          )}
        </div>
      </div>
    );
  }

  return null;
};

export default InitialSurvival;
