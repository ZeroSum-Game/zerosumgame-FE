/**
 * [Initial Survival] 2분반 초성 서바이벌 미니게임 컴포넌트
 * - 초성 퀴즈 및 타임어택 서바이벌 로직
 * - 결과 처리 및 보상
 */
import { useEffect, useRef, useState, useMemo } from 'react';
import confetti from 'canvas-confetti';
import useGameStore from '../../store/useGameStore';
import { getChosung } from '../../utils/koreanUtils';
import { formatKRWKo } from '../../utils/formatKRW';

// [User Request] Provided List
const NAMES = [
    "박찬우", "김명성", "김지연", "임태빈", "배서연", "이건", "강예서",
    "신원영", "박성재", "정재우", "민동휘", "임남중", "박성준", "이준엽",
    "탁한진", "최영운", "정재원", "안준영", "박세윤", "임유진", "전하은"
];

// --- Types ---
type PlayerStatus = {
    userId: number;
    username: string;
    score: number;
    isDropped: boolean;
    isReady: boolean; // Ready State
};

const SALARY_AMOUNT = 300000; // Example Salary Amount

const InitialSurvival = () => {
    const { closeModal } = useGameStore();

    // --- Start with Mock Players ---
    const [players, setPlayers] = useState<PlayerStatus[]>([
        { userId: 1, username: '나', score: 0, isDropped: false, isReady: false },
        { userId: 2, username: '알파고', score: 0, isDropped: false, isReady: true }, // Bots ready by default
        { userId: 3, username: '베타고', score: 0, isDropped: false, isReady: true },
        { userId: 4, username: '감마고', score: 0, isDropped: false, isReady: true },
        { userId: 5, username: '델타고', score: 0, isDropped: false, isReady: true },
    ]);

    const [phase, setPhase] = useState<'READY' | 'COUNTDOWN' | 'GAME' | 'RESULT'>('READY');
    const [introCount, setIntroCount] = useState(3);
    const [currentName, setCurrentName] = useState('');
    const [timeLeft, setTimeLeft] = useState(20);
    const [myInput, setMyInput] = useState('');

    // Winners info
    const [winners, setWinners] = useState<{ names: string[], prizePerPerson: number } | null>(null);

    const inputRef = useRef<HTMLInputElement>(null);
    const timerRef = useRef<number | null>(null);

    // Get current Chosung
    const currentChosung = useMemo(() => getChosung(currentName), [currentName]);

    // Check if everyone is ready
    const allReady = useMemo(() => players.every(p => p.isReady), [players]);

    // --- Methods ---
    const nextProblem = () => {
        const randomName = NAMES[Math.floor(Math.random() * NAMES.length)];
        setCurrentName(randomName);
        setTimeLeft(20);
        setMyInput('');
        inputRef.current?.focus();
    };

    const toggleReady = () => {
        setPlayers(prev => prev.map(p => p.userId === 1 ? { ...p, isReady: !p.isReady } : p));
    };

    // --- Effects ---

    // 1. Ready Phase -> Countdown
    useEffect(() => {
        if (phase === 'READY' && allReady) {
            setPhase('COUNTDOWN');
        }
    }, [phase, allReady]);

    // 2. Countdown -> Game
    useEffect(() => {
        if (phase !== 'COUNTDOWN') return;
        const interval = setInterval(() => {
            setIntroCount((prev) => {
                if (prev <= 1) {
                    clearInterval(interval);
                    setPhase('GAME');
                    nextProblem();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [phase]);

    // 3. Game Timer & Logic
    useEffect(() => {
        if (phase !== 'GAME') return;

        timerRef.current = window.setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    nextProblem(); // Just loop for demo
                    return 20;
                }

                // MOCK: Simulate bot activity
                if (Math.random() < 0.1) {
                    setPlayers(list => {
                        const bots = list.filter(p => p.userId !== 1 && !p.isDropped);
                        if (bots.length === 0) return list;
                        const luckyBot = bots[Math.floor(Math.random() * bots.length)];
                        return list.map(p => p.userId === luckyBot.userId ? { ...p, score: p.score + 10 } : p);
                    });
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [phase]);

    const handleInputSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!myInput.trim()) return;

        const input = myInput.trim();
        const inputChosung = getChosung(input);

        // Check Answer: Match Chosung AND in List
        // User request: "맞힌 개수가 똑같으면..." -> Score is correct count * 10 or something.
        // Currently +100 per correct answer.
        if (inputChosung === currentChosung && NAMES.includes(input)) {
            setPlayers(prev => prev.map(p => p.userId === 1 ? { ...p, score: p.score + 100 } : p));
            nextProblem();
        } else {
            // Optional: Penalty
            setMyInput('');
        }
    };

    // Manual Finish for Demo (or time based in real app)
    const finishGame = () => {
        // Calculate Winners
        const maxScore = Math.max(...players.map(p => p.score));
        const topPlayers = players.filter(p => p.score === maxScore);
        const prizePerPerson = Math.floor(SALARY_AMOUNT / topPlayers.length);

        setWinners({
            names: topPlayers.map(p => p.username),
            prizePerPerson
        });
        setPhase('RESULT');
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    };

    // --- Renders ---

    // READY PHASE
    if (phase === 'READY') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[500px] animate-fade-in relative">
                <h2 className="text-4xl font-black text-white mb-8 font-pixel drop-shadow-lg">
                    PLAYER READY
                </h2>

                <div className="grid grid-cols-5 gap-4 mb-12">
                    {players.map(p => (
                        <div key={p.userId} className={`flex flex-col items-center gap-2 p-4 rounded-xl border ${p.isReady ? 'bg-green-500/20 border-green-500' : 'bg-white/5 border-white/10'}`}>
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold ${p.isReady ? 'bg-green-500 text-white' : 'bg-white/10 text-white/30'}`}>
                                {p.username[0]}
                            </div>
                            <span className="text-sm text-white">{p.username}</span>
                            <span className={`text-xs font-bold ${p.isReady ? 'text-green-400' : 'text-white/40'}`}>
                                {p.isReady ? 'READY' : 'WAITING'}
                            </span>
                        </div>
                    ))}
                </div>

                <div className="absolute bottom-10">
                    <button
                        onClick={toggleReady}
                        className={`px-12 py-4 rounded-full text-2xl font-black transition-all transform hover:scale-105 active:scale-95 ${players[0].isReady ? 'bg-gray-600 text-gray-300' : 'bg-yellow-400 text-black shadow-[0_0_20px_rgba(250,204,21,0.5)]'}`}
                    >
                        {players[0].isReady ? 'WAITING...' : 'READY!'}
                    </button>
                    {allReady && <p className="mt-4 text-green-400 animate-pulse font-bold">All Players Ready! Starting...</p>}
                </div>
            </div>
        );
    }

    // COUNTDOWN
    if (phase === 'COUNTDOWN') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[500px]">
                <div className="text-9xl font-black text-yellow-400 animate-ping font-pixel">
                    {introCount > 0 ? introCount : 'GO!'}
                </div>
            </div>
        );
    }

    // GAME PHASE
    if (phase === 'GAME') {
        return (
            <div className="flex w-full h-full min-h-[500px] relative">
                {/* Left (Game) & Right (Ranking) Container */}

                {/* 1. Ranking Board (Top Right Absolute) */}
                <div className="absolute top-0 right-0 w-64 bg-black/60 border border-white/10 rounded-xl p-4 backdrop-blur-md z-10 shadow-xl">
                    <div className="flex items-center justify-between mb-2 pb-2 border-b border-white/10">
                        <span className="text-xs font-black text-white/60 tracking-wider">LIVE RANKING</span>
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    </div>
                    <div className="space-y-1">
                        {players.sort((a, b) => b.score - a.score).map((p, index) => (
                            <div key={p.userId} className={`flex items-center justify-between text-sm p-1.5 rounded ${p.userId === 1 ? 'bg-white/10' : ''}`}>
                                <div className="flex items-center gap-2">
                                    <span className={`w-4 text-center font-bold ${index < 3 ? 'text-yellow-400' : 'text-white/30'}`}>{index + 1}</span>
                                    <span className="text-white truncate max-w-[80px]">{p.username}</span>
                                </div>
                                <span className="font-mono font-bold text-white/90">{p.score}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 2. Main Game Area (Centered) */}
                <div className="flex-1 flex flex-col items-center justify-center relative p-8">
                    <div className="flex flex-col items-center gap-8 w-full max-w-2xl">
                        {/* Keyword Display */}
                        <div className="w-full bg-white/5 px-12 py-10 rounded-3xl border border-white/10 shadow-2xl backdrop-blur-sm text-center transform transition-all hover:bg-white/10">
                            <span className="text-lg text-white/40 block mb-6 uppercase tracking-[0.3em] font-light">Target Keyword</span>
                            <div className="flex justify-center gap-4">
                                {currentChosung.split('').map((char, i) => (
                                    <span key={i} className="text-7xl font-black text-white drop-shadow-[0_4px_0_rgba(0,0,0,0.5)] w-24 h-24 flex items-center justify-center bg-black/30 rounded-2xl border border-white/5 shadow-inner">
                                        {char}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Input Area */}
                        <div className="w-full relative group max-w-lg">
                            <form onSubmit={handleInputSubmit}>
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={myInput}
                                    onChange={(e) => setMyInput(e.target.value)}
                                    className="w-full bg-black/60 border-2 border-yellow-400/30 rounded-2xl px-8 py-5 text-center text-3xl text-white placeholder-white/10 focus:outline-none focus:border-yellow-400 focus:ring-4 focus:ring-yellow-400/10 transition-all font-bold tracking-wider"
                                    placeholder="정답 입력"
                                    autoFocus
                                />
                            </form>

                            {/* Timer Bar */}
                            <div className="absolute -bottom-8 left-0 right-0 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                <div
                                    className={`h-full transition-all duration-1000 linear ${timeLeft < 5 ? 'bg-red-500' : 'bg-yellow-400'}`}
                                    style={{ width: `${(timeLeft / 20) * 100}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Debug/Dev Button to End Game */}
                    <button onClick={finishGame} className="absolute bottom-4 left-4 text-xs text-white/20 hover:text-white">
                        [DEV] Finish Game
                    </button>
                </div>
            </div>
        );
    }

    // RESULT PHASE
    if (phase === 'RESULT' && winners) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[500px] text-center animate-scale-in">
                <h2 className="text-5xl font-black text-white mb-2 font-pixel tracking-widest">GAME OVER</h2>
                <div className="w-24 h-1 bg-yellow-400 mb-8 mx-auto" />

                <div className="bg-black/40 border border-yellow-400/30 p-8 rounded-2xl backdrop-blur-md max-w-md w-full">
                    <p className="text-white/60 mb-4 uppercase tracking-widest text-sm">Winner(s)</p>
                    <div className="text-3xl font-black text-yellow-400 mb-6 flex flex-wrap justify-center gap-2">
                        {winners.names.map(name => (
                            <span key={name} className="bg-yellow-400/10 px-3 py-1 rounded-lg border border-yellow-400/20">{name}</span>
                        ))}
                    </div>

                    <div className="border-t border-white/10 pt-6">
                        <p className="text-white/60 text-sm mb-1">Prize per person</p>
                        <p className="text-4xl font-black text-white">{formatKRWKo(winners.prizePerPerson)}</p>
                    </div>
                </div>

                <button
                    onClick={closeModal}
                    className="mt-8 px-8 py-3 bg-white/10 hover:bg-white/20 text-white rounded-full font-bold transition-all"
                >
                    Close
                </button>
            </div>
        );
    }

    return null;
};

export default InitialSurvival;
