import { create } from 'zustand';

type GameState = {
  currentTurn: number;
  playerIndex: number;
  selectedTile: number | null;
  selectTile: (id: number) => void;
  movePlayer: (steps: number) => void;
  nextTurn: () => void;
};

const useGameStore = create<GameState>((set) => ({
  currentTurn: 1,
  playerIndex: 0,
  selectedTile: null,
  selectTile: (id) =>
    set(() => ({
      selectedTile: id,
    })),
  movePlayer: (steps) =>
    set((state) => ({
      playerIndex: (state.playerIndex + steps) % 32,
    })),
  nextTurn: () =>
    set((state) => ({
      currentTurn: state.currentTurn + 1,
      selectedTile: null,
    })),
}));

export default useGameStore;
