import { create } from 'zustand';

type GameState = {
  currentTurn: number;
  playerIndex: number;
  selectedTile: number | null;
  dice: [number, number];
  isDouble: boolean;
  selectTile: (id: number) => void;
  movePlayer: (steps: number) => void;
  nextTurn: () => void;
  rollDice: () => void;
};

const useGameStore = create<GameState>((set) => ({
  currentTurn: 1,
  playerIndex: 0,
  selectedTile: null,
  dice: [1, 1], // 초기값
  isDouble: false,
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
      isDouble: false, // 턴 넘길 때 더블 초기화
    })),
  rollDice: () => {
    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    const isDouble = d1 === d2;

    set((state) => {
      // 주사위 값 업데이트
      const newState = {
        ...state,
        dice: [d1, d2] as [number, number],
        isDouble,
      };

      // 플레이어 이동 (dice1 + dice2)
      newState.playerIndex = (state.playerIndex + d1 + d2) % 32;

      // 더블이 아니면 턴 넘김 준비 (자동으로 넘기진 않고 상태만 업데이트하거나 여기서 처리 가능)
      // 요구사항: "더블이 아닐 경우에만 턴 넘기기 로직(주석으로 // TODO: Next Turn)을 수행"
      if (!isDouble) {
        // TODO: Next Turn
        // 현재는 Overlay에서 '다음 턴 시작' 버튼을 눌러야 nextTurn이 호출됨.
        // 만약 자동 턴 넘김을 원한다면 여기서 nextTurn 로직을 호출하거나 플래그를 세울 수 있음.
      } else {
        // 더블이면 턴 유지
      }

      return newState;
    });
  },
}));

export default useGameStore;
