import { createContext, useContext, useEffect, useRef } from 'react';
import GameOverlay from '../ui/GameOverlay';
import {
  useGameSocket,
  type GameSocketContextValue,
} from '../../hooks/useGameSocket';

type GameSocketContextType = GameSocketContextValue;

const GameSocketContext = createContext<GameSocketContextType | null>(null);

export const useGameSocketContext = () => {
  const ctx = useContext(GameSocketContext);
  if (!ctx) throw new Error('useGameSocketContext must be used within GamePage');
  return ctx;
};

import SpaceBackdrop from '../ui/SpaceBackdrop';

const GamePage = () => {
  const gameSocket = useGameSocket(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio('/bgm.mp3');
    audio.loop = true;
    audio.volume = 0.5;

    const playAudio = async () => {
      try {
        await audio.play();
      } catch (err) {
        console.warn('BGM autoplay failed:', err);
      }
    };

    playAudio();
    audioRef.current = audio;

    return () => {
      audio.pause();
      audio.currentTime = 0;
    };
  }, []);

  const contextValue: GameSocketContextType = {
    ...gameSocket,
  };

  return (
    <GameSocketContext.Provider value={gameSocket}>
      <div className="ui-page game-page-wrapper">
        <SpaceBackdrop />
        <div className="ui-bg-blobs" aria-hidden="true">
          <div className="ui-blob -left-40 top-1/4 bg-sky-500/10" />
          <div className="ui-blob -right-40 bottom-1/4 bg-fuchsia-500/10" />
          <div className="ui-blob left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-indigo-500/10" />
        </div>
        <GameOverlay />
      </div>
    </GameSocketContext.Provider>
  );
};

export default GamePage;
