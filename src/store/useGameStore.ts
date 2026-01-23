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

// Character types
export type CharacterType = 'ELON' | 'SAMSUNG' | 'TRUMP' | 'PUTIN';

export const CHARACTER_INFO: Record<CharacterType, { name: string; color: string; emoji: string }> = {
  ELON: { name: '일론 머스크', color: '#3b82f6', emoji: '🚀' },
  SAMSUNG: { name: '이재용', color: '#1e40af', emoji: '📱' },
  TRUMP: { name: '트럼프', color: '#ef4444', emoji: '🏛️' },
  PUTIN: { name: '푸틴', color: '#dc2626', emoji: '🐻' },
};

// Player type
export type Player = {
  id: number;
  name: string;
  character: CharacterType | null;
  position: number;
  cash: number;
  isReady: boolean;
};

// Page type
type PageType = 'login' | 'lobby' | 'game';

type GameState = {
  // Page navigation
  currentPage: PageType;
  setCurrentPage: (page: PageType) => void;

  // Players
  players: Player[];
  currentPlayerIndex: number;
  maxPlayers: number;

  // Player actions
  addPlayer: (name: string) => void;
  removePlayer: (id: number) => void;
  selectCharacter: (playerId: number, character: CharacterType) => void;
  setPlayerReady: (playerId: number, ready: boolean) => void;
  startGame: () => void;

  // Game state
  currentTurn: number;
  playerIndex: number;
  selectedTile: number | null;
  dice: [number, number];
  isDouble: boolean;

  // Economy & Land
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
  // Page navigation
  currentPage: 'login',
  setCurrentPage: (page) => set({ currentPage: page }),

  // Players
  players: [],
  currentPlayerIndex: 0,
  maxPlayers: 4,

  addPlayer: (name) => {
    const { players, maxPlayers } = get();
    if (players.length >= maxPlayers) return;

    const newPlayer: Player = {
      id: Date.now(),
      name,
      character: null,
      position: 0,
      cash: 3000000,
      isReady: false,
    };
    set({ players: [...players, newPlayer] });
  },

  removePlayer: (id) => {
    const { players } = get();
    set({ players: players.filter(p => p.id !== id) });
  },

  selectCharacter: (playerId, character) => {
    const { players } = get();
    // Check if character is already taken
    const isTaken = players.some(p => p.character === character && p.id !== playerId);
    if (isTaken) return;

    set({
      players: players.map(p =>
        p.id === playerId ? { ...p, character } : p
      ),
    });
  },

  setPlayerReady: (playerId, ready) => {
    const { players } = get();
    set({
      players: players.map(p =>
        p.id === playerId ? { ...p, isReady: ready } : p
      ),
    });
  },

  startGame: () => {
    const { players } = get();
    // Check all players are ready and have selected characters
    const allReady = players.every(p => p.isReady && p.character);
    if (!allReady || players.length < 2) return;

    set({
      currentPage: 'game',
      currentTurn: 1,
      playerIndex: 0,
      currentPlayerIndex: 0,
    });
  },

  // Game state
  currentTurn: 1,
  playerIndex: 0,
  selectedTile: null,
  dice: [1, 1],
  isDouble: false,

  lands: {},

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
    set((state) => {
      const nextPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
      return {
        currentTurn: state.currentTurn + 1,
        selectedTile: null,
        isDouble: false,
        currentPlayerIndex: nextPlayerIndex,
        playerIndex: state.players[nextPlayerIndex]?.position ?? 0,
      };
    }),

  buyLand: () => {
    const { lands, currentTileInfo, players, currentPlayerIndex } = get();
    const currentPlayer = players[currentPlayerIndex];
    if (!currentPlayer) return;

    const PRICE = currentTileInfo?.price ?? 500000;
    const tileId = currentTileInfo?.index ?? currentPlayer.position;

    if (currentPlayer.cash >= PRICE) {
      set({
        players: players.map((p, i) =>
          i === currentPlayerIndex ? { ...p, cash: p.cash - PRICE } : p
        ),
        lands: {
          ...lands,
          [tileId]: { owner: currentPlayer.name, type: 'LAND' }
        },
        showBuyModal: false,
        currentTileInfo: null
      });
      console.log(`구입 완료: Tile ${tileId}, 잔액: ${currentPlayer.cash - PRICE}`);
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
      const currentPlayer = state.players[state.currentPlayerIndex];
      const newPosition = ((currentPlayer?.position ?? 0) + d1 + d2) % 32;

      return {
        isRolling: false,
        dice: [d1, d2],
        isDouble,
        playerIndex: newPosition,
        players: state.players.map((p, i) =>
          i === state.currentPlayerIndex ? { ...p, position: newPosition } : p
        ),
      };
    });
  }
}));

export default useGameStore;
