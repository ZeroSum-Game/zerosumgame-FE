import { create } from 'zustand';

// Types for Land Ownership
type LandType = 'LAND' | 'BUILDING' | 'LANDMARK';

type LandState = {
  owner: string;
  type: LandType;
};

type TileInfo = {
  index: number;
  name: string;
  price?: number;
};

type GameState = {
  currentTurn: number;
  playerIndex: number;
  selectedTile: number | null;
  dice: [number, number];
  isDouble: boolean;

  // Economy & Land
  cash: number;
  lands: Record<number, LandState>;

  // Buy Modal
  showBuyModal: boolean;
  currentTileInfo: TileInfo | null;

  // Physics integration
  isRolling: boolean;
  rollTrigger: number;

  selectTile: (id: number) => void;
  movePlayer: (steps: number) => void;
  nextTurn: () => void;
  buyLand: (tileId: number, cost: number) => void;
  setShowBuyModal: (show: boolean, tileInfo?: TileInfo) => void;
  closeBuyModal: () => void;

  // Actions
  startRoll: () => void;
  setDiceValues: (rolls: [number, number]) => void;
};

const useGameStore = create<GameState>((set, get) => ({
  currentTurn: 1,
  playerIndex: 0,
  selectedTile: null,
  dice: [1, 1],
  isDouble: false,

  cash: 3000000, // 300만원 시작
  lands: {},

  // Buy Modal initial state
  showBuyModal: false,
  currentTileInfo: null,

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

  buyLand: (tileId, cost) => {
    const { cash, lands } = get();
    if (cash >= cost) {
      set({
        cash: cash - cost,
        lands: {
          ...lands,
          [tileId]: { owner: 'Player 1', type: 'LAND' }
        },
        showBuyModal: false,
        currentTileInfo: null
      });
      console.log(`구입 완료: Tile ${tileId}, 잔액: ${cash - cost}`);
    } else {
      console.log('잔액 부족');
    }
  },

  setShowBuyModal: (show, tileInfo) => {
    set({
      showBuyModal: show,
      currentTileInfo: tileInfo || null
    });
  },

  closeBuyModal: () => {
    set({
      showBuyModal: false,
      currentTileInfo: null
    });
  },

  startRoll: () => {
    set((state) => ({
      isRolling: true,
      rollTrigger: state.rollTrigger + 1
    }));
  },

  setDiceValues: ([d1, d2]) => {
    set((state) => {
      const isDouble = d1 === d2;
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
