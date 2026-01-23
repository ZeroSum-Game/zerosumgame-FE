import { create } from 'zustand';

type GameState = {
  currentTurn: number;
  playerIndex: number;
  selectedTile: number | null;
  dice: [number, number];
  isDouble: boolean;

  // Physics integration
  isRolling: boolean;
  rollTrigger: number;

  selectTile: (id: number) => void;
  // movePlayer can be internal mostly, but kept for manual moves if needed
  movePlayer: (steps: number) => void;
  nextTurn: () => void;

  // Actions
  startRoll: () => void;
  setDiceValues: (rolls: [number, number]) => void;
};

const useGameStore = create<GameState>((set) => ({
  currentTurn: 1,
  playerIndex: 0,
  selectedTile: null,
  dice: [1, 1],
  isDouble: false,

  isRolling: false,
  rollTrigger: 0,

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
      isDouble: false,
    })),

  startRoll: () => set((state) => ({
    isRolling: true,
    rollTrigger: state.rollTrigger + 1
  })),

  setDiceValues: ([d1, d2]) => {
    set((state) => {
      const isDouble = d1 === d2;
      // Move logic
      const newIndex = (state.playerIndex + d1 + d2) % 32;

      return {
        isRolling: false,
        dice: [d1, d2],
        isDouble,
        playerIndex: newIndex
      };
    });
  }
}));

export default useGameStore;
