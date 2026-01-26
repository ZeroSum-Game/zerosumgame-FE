import { createContext, useContext } from 'react';
import GameOverlay from '../ui/GameOverlay';
import { useGameSocket, type GameSocketState } from '../../hooks/useGameSocket';
import useGameStore from '../../store/useGameStore';
import { apiRollDice } from '../../services/api';
import BuyAssetModal from '../../components/game/BuyAssetModal';

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
  const setDiceValues = useGameStore((state) => state.setDiceValues);
  const setActiveModal = useGameStore((state) => state.setActiveModal);
  const activeModal = useGameStore((state) => state.activeModal);

  const handleRollDice = async () => {
    try {
      const result = await apiRollDice();
      
      setDiceValues([result.dice1, result.dice2]);

      setTimeout(() => {
        if (result.actionRequired === 'BUY_ASSET') {
          setActiveModal('BUY_ASSET');
        } 
        else if (result.actionRequired === 'WAR_CHOICE') {
          setActiveModal('WAR_CHOICE');
        }
        else if (result.actionRequired === 'WORLDCUP_HOST') {
          setActiveModal('WORLDCUP_HOST', { nodeIdx: result.newLocation });
        }

        if (result.eventResult) {
           if (result.eventResult.type === 'TAX') {
              alert(`국세청: 자산의 10%인 ${result.eventResult.amount.toLocaleString()}원을 납부했습니다.`);
           } else if (result.eventResult.type === 'SPACE') {
              alert(result.eventResult.msg);
           }
        }
      }, 2000);

    } catch (e) {
      console.error('주사위 굴리기 실패:', e);
      alert('주사위를 굴리는 중 오류가 발생했습니다.');
    }
  };

  const contextValue: GameSocketContextType = {
    ...gameSocket,
    rollDice: handleRollDice, 
  };

  return (
    <GameSocketContext.Provider value={contextValue}>
      <GameOverlay />
      {activeModal?.type === 'BUY_ASSET' && <BuyAssetModal />}
    </GameSocketContext.Provider>
  );
};

export default GamePage;