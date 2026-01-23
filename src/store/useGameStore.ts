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
  buyLand: () => void;
  setShowBuyModal: (show: boolean, tileInfo?: TileInfo) => void;
  closeModal: () => void;

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

  buyLand: () => {
    const { cash, lands, currentTileInfo, playerIndex } = get();
    // Use currentTileInfo or fall back to playerIndex if needed, but per requirements buyLand logic:
    // "current Turn player cash deduct -> register owner in lands -> close showBuyModal"
    // We assume the land to buy is at `playerIndex` or `currentTileInfo.index`.
    // Let's use playerIndex as the source of truth for "current land" if currentTileInfo is not fully set, 
    // but typically showBuyModal is true implying valid land.

    // Fixed price 500,000 as per UI requirement "Price: 500,000" (acting as the effective price for this step)
    // Or should we use a stored price? User said "Price: 500,000 (temporary fixed)" for UI. 
    // I will use 500,000 for the logic too to match.
    const PRICE = 500000;

    // Identify which tile.
    // If currentTileInfo is present, use it. Otherwise use playerIndex.
    const tileId = currentTileInfo?.index ?? playerIndex;

    if (cash >= PRICE) {
      set({
        cash: cash - PRICE,
        lands: {
          ...lands,
          [tileId]: { owner: `Player 1`, type: 'LAND' } // Fixed owner for now
        },
        showBuyModal: false,
        currentTileInfo: null
      });
      console.log(`구입 완료: Tile ${tileId}, 잔액: ${cash - PRICE}`);
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

  closeModal: () => {
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
