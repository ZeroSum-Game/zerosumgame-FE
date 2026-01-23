import useGameStore from './store/useGameStore';
import LoginPage from './components/pages/LoginPage';
import LobbyPage from './components/pages/LobbyPage';
import GamePage from './components/pages/GamePage';

const App = () => {
  const currentPage = useGameStore((state) => state.currentPage);

  return (
    <>
      {currentPage === 'login' && <LoginPage />}
      {currentPage === 'lobby' && <LobbyPage />}
      {currentPage === 'game' && <GamePage />}
    </>
  );
};

export default App;
