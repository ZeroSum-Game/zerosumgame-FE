import { useEffect, useRef } from 'react';
import useGameStore from './store/useGameStore';
import LoginPage from './components/pages/LoginPage';
import LobbyPage from './components/pages/LobbyPage';
import GamePage from './components/pages/GamePage';
import ResultPage from './components/pages/ResultPage';
import { playSound } from './utils/sounds';

const App = () => {
  const currentPage = useGameStore((state) => state.currentPage);
  const lobbyAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Initialize Lobby Music
    const audio = new Audio('/lobby.mp3');
    audio.loop = true;
    audio.preload = 'auto';
    audio.volume = 0.3; // Default volume
    audio.muted = true; // allow autoplay, unmute on first user gesture
    lobbyAudioRef.current = audio;

    return () => {
      audio.pause();
      lobbyAudioRef.current = null;
    };
  }, []);

  useEffect(() => {
    const audio = lobbyAudioRef.current;
    if (!audio) return;

    if (currentPage === 'game') {
      audio.pause();
    } else {
      // Play if not in game (Login, Lobby, Result)
      // Browsers might block autoplay, so we catch errors
      audio.play().catch(() => {
        // Autoplay policy prevented playback
      });
    }
  }, [currentPage]);


  useEffect(() => {
    const resumeAudio = () => {
      const audio = lobbyAudioRef.current;
      if (!audio) return;
      if (currentPage === 'game') return;
      if (audio.muted) audio.muted = false;
      if (audio.paused) {
        audio.play().catch(() => undefined);
      }
    };

    window.addEventListener('pointerdown', resumeAudio, { passive: true });
    window.addEventListener('touchstart', resumeAudio, { passive: true });
    window.addEventListener('keydown', resumeAudio);

    return () => {
      window.removeEventListener('pointerdown', resumeAudio);
      window.removeEventListener('touchstart', resumeAudio);
      window.removeEventListener('keydown', resumeAudio);
    };
  }, [currentPage]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Play sound for buttons, links, or elements with role="button"
      if (target.closest('button') || target.closest('a') || target.closest('[role="button"]') || target.closest('input[type="button"]') || target.closest('input[type="submit"]')) {
        playSound('click');
      }
    };

    window.addEventListener('click', handleClick);

    return () => {
      window.removeEventListener('click', handleClick);
    };
  }, []);

  return (
    <>
      {currentPage === 'login' && <LoginPage />}
      {currentPage === 'lobby' && <LobbyPage />}
      {currentPage === 'game' && <GamePage />}
      {currentPage === 'result' && <ResultPage />}
    </>
  );
};

export default App;
