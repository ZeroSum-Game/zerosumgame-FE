import useGameStore, { CHARACTER_INFO } from '../../store/useGameStore';
import { useState, useEffect } from 'react';
import { BOARD_DATA } from '../../utils/boardUtils';

// Stock data
const STOCK_DATA = [
  { name: 'SAMSUNG', nameKr: '삼성전자', basePrice: 72500, change: 2.3 },
  { name: 'SK HYNIX', nameKr: 'SK하이닉스', basePrice: 178000, change: -1.2 },
  { name: 'HYUNDAI', nameKr: '현대차', basePrice: 215000, change: 0.8 },
  { name: 'BITCOIN', nameKr: '비트코인', basePrice: 95450000, change: 5.4 },
  { name: 'GOLD', nameKr: '금', basePrice: 285000, change: -0.3 },
];

const StockPanel = () => {
  const [prices, setPrices] = useState(STOCK_DATA.map(s => s.basePrice));

  useEffect(() => {
    const interval = setInterval(() => {
      setPrices(prev => prev.map((p, i) => {
        const fluctuation = (Math.random() - 0.5) * STOCK_DATA[i].basePrice * 0.002;
        return Math.round(p + fluctuation);
      }));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="pointer-events-auto w-72 rounded-xl border border-white/20 bg-black/70 p-4 shadow-xl backdrop-blur">
      <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-2">
        <h2 className="bg-gradient-to-r from-yellow-400 to-amber-500 bg-clip-text text-sm font-bold text-transparent">
          STOCK MARKET
        </h2>
        <span className="animate-pulse text-[10px] text-green-400">● LIVE</span>
      </div>
      <div className="space-y-2">
        {STOCK_DATA.map((stock, i) => (
          <div key={stock.name} className="flex items-center justify-between text-xs">
            <div className="flex flex-col">
              <span className="font-semibold text-white">{stock.name}</span>
              <span className="text-[10px] text-gray-500">{stock.nameKr}</span>
            </div>
            <div className="text-right">
              <div className="font-mono text-gray-200">
                {prices[i] >= 1000000
                  ? `${(prices[i] / 10000).toLocaleString()}만`
                  : prices[i].toLocaleString()
                }
              </div>
              <div className={`text-[10px] font-bold ${stock.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {stock.change >= 0 ? '▲' : '▼'} {Math.abs(stock.change)}%
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const GameOverlay = () => {
  const {
    currentTurn, playerIndex, nextTurn, dice, isDouble, startRoll, isRolling,
    buyLand, showBuyModal, closeModal, currentTileInfo,
    players, currentPlayerIndex
  } = useGameStore();

  const currentPlayer = players[currentPlayerIndex];
  const displayTileName = currentTileInfo?.name || BOARD_DATA[playerIndex]?.name || "기본 땅";
  const displayPrice = currentTileInfo?.price || 500000;

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col p-4 text-sm text-white">
      {/* Top row: Game info left, Stock panel right */}
      <div className="flex justify-between">
        {/* Left: Game Status */}
        <div className="pointer-events-auto w-72 space-y-3 rounded-xl border border-white/20 bg-black/70 p-4 shadow-xl backdrop-blur">
          {/* Current Player */}
          <div className="flex items-center gap-3 border-b border-white/10 pb-3">
            {currentPlayer?.character && (
              <div
                className="flex h-12 w-12 items-center justify-center rounded-full text-2xl"
                style={{ backgroundColor: CHARACTER_INFO[currentPlayer.character].color + '40' }}
              >
                {CHARACTER_INFO[currentPlayer.character].emoji}
              </div>
            )}
            <div>
              <p className="text-xs text-white/50">현재 턴</p>
              <p className="text-lg font-bold">{currentPlayer?.name || 'Player'}</p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-widest text-white/50">턴</span>
            <span className="text-xl font-bold">{currentTurn}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-widest text-white/50">자산</span>
            <span className="text-lg font-bold text-emerald-400">₩{(currentPlayer?.cash || 0).toLocaleString()}</span>
          </div>
          <div className="border-t border-white/10 pt-2">
            <span className="text-[10px] uppercase tracking-widest text-white/50">현재 위치</span>
            <p className="text-base font-semibold">{BOARD_DATA[playerIndex]?.name}</p>
          </div>
          <div className="flex items-center gap-2 border-t border-white/10 pt-2">
            <span className="text-[10px] uppercase tracking-widest text-white/50">주사위</span>
            <span className="text-lg">🎲 {dice[0]}</span>
            <span className="text-lg">🎲 {dice[1]}</span>
            {isDouble && <span className="rounded bg-yellow-500/30 px-1.5 py-0.5 text-[10px] font-bold text-yellow-300">더블!</span>}
          </div>
        </div>

        {/* Right: Stock Panel */}
        <StockPanel />
      </div>

      {/* Player List - Bottom Left */}
      <div className="pointer-events-auto mt-4 w-72 rounded-xl border border-white/20 bg-black/70 p-3 shadow-xl backdrop-blur">
        <p className="mb-2 text-[10px] uppercase tracking-widest text-white/50">플레이어</p>
        <div className="space-y-2">
          {players.map((player, idx) => (
            <div
              key={player.id}
              className={`flex items-center gap-2 rounded-lg p-2 ${
                idx === currentPlayerIndex ? 'bg-white/10 ring-1 ring-yellow-500/50' : ''
              }`}
            >
              {player.character && (
                <span className="text-lg">{CHARACTER_INFO[player.character].emoji}</span>
              )}
              <div className="flex-1">
                <p className="text-sm font-medium">{player.name}</p>
                <p className="text-xs text-emerald-400">₩{player.cash.toLocaleString()}</p>
              </div>
              {idx === currentPlayerIndex && (
                <span className="text-[10px] text-yellow-400">▶</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom: Action buttons */}
      <div className="mt-auto flex justify-center gap-3">
        <button
          className={`pointer-events-auto rounded-xl border border-white/20 px-6 py-3 text-sm font-semibold uppercase tracking-wide transition ${
            isDouble
              ? 'bg-yellow-500/30 text-yellow-200 hover:bg-yellow-500/40'
              : 'bg-white/10 text-white hover:bg-white/20'
          }`}
          onClick={() => {
            if (!isRolling) startRoll();
          }}
          disabled={isRolling}
        >
          {isRolling ? '굴리는 중...' : isDouble ? '더블! 다시 굴리기' : '주사위 굴리기'}
        </button>
        <button
          className="pointer-events-auto rounded-xl border border-white/20 bg-white/10 px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-white/20"
          onClick={nextTurn}
        >
          턴 종료
        </button>
      </div>

      {/* Buy Modal */}
      {showBuyModal && (
        <div className="pointer-events-auto absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-xl border border-white/20 bg-black/90 p-6 shadow-2xl backdrop-blur-md">
          <h2 className="mb-1 text-xl font-bold text-white">🏠 토지 구매</h2>
          <p className="mb-4 text-2xl font-bold text-yellow-400">{displayTileName}</p>
          <p className="mb-6 text-lg text-gray-300">
            가격: <span className="font-bold text-emerald-400">₩{displayPrice.toLocaleString()}</span>
          </p>
          <div className="flex gap-4">
            <button
              onClick={() => buyLand()}
              className="flex-1 rounded-lg bg-emerald-600 px-6 py-3 font-bold text-white transition hover:bg-emerald-500"
            >
              구매하기
            </button>
            <button
              onClick={() => closeModal()}
              className="flex-1 rounded-lg bg-gray-700 px-6 py-3 font-bold text-white transition hover:bg-gray-600"
            >
              취소
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameOverlay;
