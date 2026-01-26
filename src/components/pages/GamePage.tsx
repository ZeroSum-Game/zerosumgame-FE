import { createContext, useContext } from 'react';
import GameOverlay from '../ui/GameOverlay';
import { useGameSocket, type GameSocketState } from '../../hooks/useGameSocket';

type GameSocketContextType = GameSocketState & {
  rollDice: () => void;
  endTurn: () => void;
  isMyTurn: () => boolean;
  pickOrderCard: (cardNumber: number) => void;
  socket: ReturnType<typeof useGameSocket>['socket'];
};

const GameSocketContext = createContext<GameSocketContextType | null>(null);

export const useGameSocketContext = () => {
  const ctx = useContext(GameSocketContext);
  if (!ctx) throw new Error('useGameSocketContext must be used within GamePage');
  return ctx;
};

const GamePage = () => {
  const gameSocket = useGameSocket(1);

  const contextValue: GameSocketContextType = {
    ...gameSocket,
  };

  return (
    <GameSocketContext.Provider value={contextValue}>
      <GameOverlay />
    </GameSocketContext.Provider>
  );
};

export default GamePage;
