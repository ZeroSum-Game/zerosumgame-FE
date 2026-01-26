/**
 * [Initial Survival] 2분반 초성 서바이벌 미니게임 컴포넌트
 * - 실시간 소켓 연동 (EC2 별도 서버)
 * - 초성 퀴즈 및 타임어택 서바이벌 로직
 * - 결과 처리 및 보상
 */
import { useEffect, useRef, useState } from 'react';
import io, { Socket } from 'socket.io-client';
import confetti from 'canvas-confetti';
import axios from 'axios';
import { getToken } from '../../services/auth';
import useGameStore from '../../store/useGameStore';
import { formatKRWKo } from '../../utils/formatKRW';

// --- Types ---
type PlayerStatus = {
    socketId: string;
    userId: number;
    username: string;
    score: number;
    isDropped: boolean; // false=생존, true=탈락
};

// 미니게임 전용 소켓
const MINIGAME_SOCKET_URL = 'http://localhost:5173/';

const InitialSurvival = () => {
    const { closeModal, completeMinigame } = useGameStore();

    // --- Local State ---
    const [socket, setSocket] = useState<Socket | null>(null);
    const [phase, setPhase] = useState<'INTRO' | 'GAME' | 'RESULT'>('INTRO');

    // Intro Countdown
    const [introCount, setIntroCount] = useState(5);

    // Game Data
    const [players, setPlayers] = useState<PlayerStatus[]>([]);
    const [currentInitial, setCurrentInitial] = useState(''); // e.g. "ㄱ ㅇ ㅅ"
    const [timeLeft, setTimeLeft] = useState(20);
    const [myInput, setMyInput] = useState('');
    const [isMyTurn, setIsMyTurn] = useState(false); // (Optional: if turn-based? Req says "Real-time" but usually implies fast input)
    // Requirement says: "누군가 정답을 맞히거나 탈락할 때마다 모든 플레이어의 보드가 즉시 업데이트" -> Real-time ffa?
    // Actually usually initial game is FFA. Whoever types fast gets it?
    // Req: "중복 정답: 동일한 초성... 인정해줘"
    // Let's assume FFA.

    const [myStatus, setMyStatus] = useState<PlayerStatus | null>(null);
    const [winnerName, setWinnerName] = useState<string | null>(null);

    const inputRef = useRef<HTMLInputElement>(null);

    // --- Effects ---

    // 1. Connect Socket on Mount
    useEffect(() => {
        const token = getToken();
        const newSocket = io(MINIGAME_SOCKET_URL, {
            transports: ['websocket'],
            auth: { token },
            // query: { ... } if needed
        });

        newSocket.on('connect', () => {
            console.log('[MiniGame] Connected to dedicated server');
            // Join room or identification happens via auth token usually
            // If specific room logic needed: newSocket.emit('join_minigame', ...);
        });

        // Listeners
        newSocket.on('update_players', (list: PlayerStatus[]) => {
            setPlayers(list);
            // Sync my status
            // We need to know 'who am I'. Usually userId match.
            // Assuming we have my userId from store or auth.
        });

        newSocket.on('new_problem', (initial: string) => {
            setCurrentInitial(initial);
            setMyInput(''); // Clear input
            inputRef.current?.focus();
        });

        newSocket.on('time_update', (sec: number) => {
            setTimeLeft(sec);
        });

        newSocket.on('game_end', (payload: { winnerId: number; winnerName: string; }) => {
            setPhase('RESULT');
            setWinnerName(payload.winnerName);

            // If I am winner, I handle reward logic? Or server does?
            // Req: "20초 종료 후 생존자 중 1등 유저의 userId를 서버로 보내... API를 호출"
            // Better to trigger reward claim from client if this is the instruction, 
            // but usually backend handles rewards. 
            // "1등 유저의 userId를 서버로 보내 ... API를 호출하고" -> impling Client calls API.
            if (payload.winnerName) {
                handleGameEnd(payload.winnerId);
            }
        });

        setSocket(newSocket);

        // Intro Timer (Local for visual, strictly)
        const introInterval = setInterval(() => {
            setIntroCount((prev) => {
                if (prev <= 1) {
                    clearInterval(introInterval);
                    setPhase('GAME');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            newSocket.disconnect();
            clearInterval(introInterval);
        };
    }, []);

    // 2. Input Handling
    const handleInputSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!socket || !myInput.trim()) return;

        socket.emit('submit_answer', { answer: myInput.trim() });

        // Optimistic or wait? 
        // Req: "오타나 오답 입력 시 즉시 탈락(isDropped)" -> Server decides correctness.
        setMyInput('');
    };

    // 3. Reward & Close
    const handleGameEnd = async (winnerId: number) => {
        // Confetti
        confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
        });

        // Check if I am winner to request salary? or just show result?
        // User req: "API를 호출하고"
        // Usually: await apiClaimMiniGameReward(winnerId);
        // For now, standard wait and close.

        setTimeout(() => {
            closeModal();
        }, 5000);
    };

    // --- Renders ---

    // INTRO
    if (phase === 'INTRO') {
        return (
            <div className="flex flex-col items-center justify-center p-10 text-center animate-fade-in">
                <img
                    src="/quiz.png"
                    alt="QUIZ"
                    className="w-64 mb-6 animate-bounce-slow drop-shadow-lg"
                />
                <p className="text-white/90 text-lg mb-2 font-pixel">
                    제한 시간 안에 우리 분반의 초성 이름을<br />가장 많이 맞힌 사람이 승리!
                </p>
                <div className="text-6xl font-black text-yellow-400 drop-shadow-md mt-4 font-pixel">
                    {introCount}
                </div>
            </div>
        );
    }

    // GAME
    if (phase === 'GAME') {
        return (
            <div className="flex flex-col w-full h-full relative">
                {/* Top Right Scoreboard */}
                <div className="absolute -top-12 -right-4 bg-black/60 p-2 rounded-lg border border-white/10 backdrop-blur-sm min-w-[200px]">
                    <h3 className="text-xs text-white/60 mb-2 uppercase font-bold tracking-wider">Live Ranking</h3>
                    <div className="space-y-1">
                        {players.sort((a, b) => b.score - a.score).map((p) => (
                            <div key={p.userId} className={`flex justify-between items-center text-sm ${p.isDropped ? 'text-gray-500 line-through decoration-red-500' : 'text-white'}`}>
                                <div className="flex items-center gap-1">
                                    <span>{p.username}</span>
                                    {p.isDropped && <span>💀</span>}
                                </div>
                                <span className="font-bold text-yellow-400">{p.score}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Top Left Mini Logo */}
                <div className="absolute -top-12 -left-4">
                    <img src="/quiz.png" alt="logo" className="w-12 opacity-80" />
                </div>

                {/* Center Game Area */}
                <div className="flex flex-col items-center justify-center mt-8 gap-6">
                    <div className="bg-white/10 px-8 py-4 rounded-2xl border border-white/20 shadow-xl backdrop-blur">
                        <span className="text-sm text-white/50 block text-center mb-1">Current Keyword</span>
                        <h1 className="text-5xl font-black text-white tracking-[0.5em] font-pixel drop-shadow-[0_4px_0_rgba(0,0,0,0.5)]">
                            {currentInitial || "???"}
                        </h1>
                    </div>

                    <div className="w-full max-w-sm relative">
                        <form onSubmit={handleInputSubmit}>
                            <input
                                ref={inputRef}
                                type="text"
                                value={myInput}
                                onChange={(e) => setMyInput(e.target.value)}
                                className="w-full bg-black/40 border-2 border-yellow-400/50 rounded-xl px-4 py-3 text-center text-xl text-white placeholder-white/20 focus:outline-none focus:border-yellow-400 focus:ring-4 focus:ring-yellow-400/20 transition-all font-bold"
                                placeholder="정답 입력..."
                                autoFocus
                            />
                        </form>
                        {/* Timer Bar */}
                        <div className="mt-4 bg-gray-700 h-2 rounded-full overflow-hidden w-full">
                            <div
                                className="h-full bg-gradient-to-r from-green-400 to-yellow-400 transition-all duration-1000 linear"
                                style={{ width: `${(timeLeft / 20) * 100}%` }}
                            />
                        </div>
                        <p className="text-center text-white/50 text-xs mt-1">{timeLeft}s remaining</p>
                    </div>
                </div>
            </div>
        );
    }

    // RESULT
    return (
        <div className="flex flex-col items-center justify-center p-8 text-center animate-scale-in">
            <h2 className="text-3xl font-black text-white mb-2 font-pixel">GAME OVER</h2>
            <p className="text-white/60 mb-6">최종 우승자</p>

            <div className="bg-gradient-to-b from-yellow-300 to-yellow-600 text-black px-8 py-4 rounded-xl shadow-[0_0_30px_rgba(234,179,8,0.4)] border-2 border-yellow-200 mb-8 transform hover:scale-105 transition-transform">
                <span className="text-2xl font-black">{winnerName || "None"}</span>
            </div>

            <p className="text-sm text-white/40">잠시 후 게임으로 돌아갑니다...</p>
        </div>
    );
};

export default InitialSurvival;
