export type BoardSpaceType =
  | 'START'
  | 'COUNTRY'
  | 'STOCK'
  | 'MINIGAME'
  | 'ISLAND'
  | 'KEY'
  | 'TAX';

export type Continent = 'ASIA' | 'AFRICA' | 'EUROPE' | 'AMERICA';

export type BoardSpace = {
  id: number;
  name: string;
  type: BoardSpaceType;
  price?: number;
  continent?: Continent;
};

export const BOARD_DATA: BoardSpace[] = [
  // Bottom row (0-8): 9 tiles, left to right
  { id: 0, name: '시작', type: 'START' },
  { id: 1, name: '베트남', type: 'COUNTRY', price: 535500, continent: 'ASIA' },
  { id: 2, name: '오락실', type: 'MINIGAME' },
  { id: 3, name: '호주', type: 'COUNTRY', price: 665000, continent: 'ASIA' },
  { id: 4, name: '현대차', type: 'STOCK' },
  { id: 5, name: '중국', type: 'COUNTRY', price: 756000, continent: 'ASIA' },
  { id: 6, name: '일본', type: 'COUNTRY', price: 735000, continent: 'ASIA' },
  { id: 7, name: '대한민국', type: 'COUNTRY', price: 700000, continent: 'ASIA' },
  { id: 8, name: '전쟁', type: 'ISLAND' },

  // Right column (9-15): 7 tiles, bottom to top (excluding corners)
  { id: 9, name: '금 거래소', type: 'STOCK' },
  { id: 10, name: 'UAE', type: 'COUNTRY', price: 770000, continent: 'AFRICA' },
  { id: 11, name: '이란', type: 'COUNTRY', price: 630000, continent: 'AFRICA' },
  { id: 12, name: '황금열쇠', type: 'KEY' },
  { id: 13, name: '이집트', type: 'COUNTRY', price: 567000, continent: 'AFRICA' },
  { id: 14, name: 'SK하이닉스', type: 'STOCK' },
  { id: 15, name: '남아공', type: 'COUNTRY', price: 598500, continent: 'AFRICA' },

  // Top row (16-24): 9 tiles, right to left
  { id: 16, name: '올림픽', type: 'ISLAND' },
  { id: 17, name: '러시아', type: 'COUNTRY', price: 661500, continent: 'EUROPE' },
  { id: 18, name: '삼성전자', type: 'STOCK' },
  { id: 19, name: '스위스', type: 'COUNTRY', price: 1001000, continent: 'EUROPE' },
  { id: 20, name: '황금열쇠', type: 'KEY' },
  { id: 21, name: '프랑스', type: 'COUNTRY', price: 770000, continent: 'EUROPE' },
  { id: 22, name: '영국', type: 'COUNTRY', price: 924000, continent: 'EUROPE' },
  { id: 23, name: '독일', type: 'COUNTRY', price: 885000, continent: 'EUROPE' },
  { id: 24, name: '우주여행', type: 'ISLAND' },

  // Left column (25-31): 7 tiles, top to bottom (excluding corners)
  { id: 25, name: '비트코인', type: 'STOCK' },
  { id: 26, name: '브라질', type: 'COUNTRY', price: 630000, continent: 'AMERICA' },
  { id: 27, name: '아르헨티나', type: 'COUNTRY', price: 567000, continent: 'AMERICA' },
  { id: 28, name: '황금열쇠', type: 'KEY' },
  { id: 29, name: '캐나다', type: 'COUNTRY', price: 735000, continent: 'AMERICA' },
  { id: 30, name: '국세청', type: 'TAX' },
  { id: 31, name: '미국', type: 'COUNTRY', price: 1078000, continent: 'AMERICA' }
];

export type BoardTile = {
  id: number;
  space: BoardSpace;
  position: [number, number, number];
  rotation: [number, number, number];
};

export const TILE_COUNT = BOARD_DATA.length; // 32 tiles

// Board dimensions: 9x9 grid
const HORIZONTAL_TILES = 9; // Bottom and top rows
const VERTICAL_TILES = 9;   // Left and right columns (9 positions, but corners shared)
const TILE_SPACING = 2.8;   // Increased from 2.2 for larger board

// Calculate board dimensions
const BOARD_WIDTH = (HORIZONTAL_TILES - 1) * TILE_SPACING;  // 8 * 2.2 = 17.6
const BOARD_HEIGHT = (VERTICAL_TILES - 1) * TILE_SPACING;   // 8 * 2.2 = 17.6
const HALF_WIDTH = BOARD_WIDTH / 2;   // 8.8
const HALF_HEIGHT = BOARD_HEIGHT / 2; // 8.8

// Tile counts per side
const BOTTOM_COUNT = 9;  // indices 0-8  (corners at 0 and 8)
const RIGHT_COUNT = 7;   // indices 9-15 (between corners, not including them)
const TOP_COUNT = 9;     // indices 16-24 (corners at 16 and 24)
const LEFT_COUNT = 7;    // indices 25-31 (between corners, not including them)

export const getTileTransform = (index: number): { position: [number, number, number]; rotation: [number, number, number] } => {
  let x = 0;
  let z = 0;
  let rotY = 0;

  if (index < BOTTOM_COUNT) {
    // Bottom row (0-8): 9 tiles, left to right
    const pos = index;
    x = -HALF_WIDTH + pos * TILE_SPACING;
    z = HALF_HEIGHT;
    rotY = 0;
  } else if (index < BOTTOM_COUNT + RIGHT_COUNT) {
    // Right column (9-15): 7 tiles between bottom-right and top-right corners
    const pos = index - BOTTOM_COUNT; // 0 to 6
    x = HALF_WIDTH;
    z = HALF_HEIGHT - (pos + 1) * TILE_SPACING; // Start one step up from bottom-right corner
    rotY = -Math.PI / 2;
  } else if (index < BOTTOM_COUNT + RIGHT_COUNT + TOP_COUNT) {
    // Top row (16-24): 9 tiles, right to left
    const pos = index - BOTTOM_COUNT - RIGHT_COUNT; // 0 to 8
    x = HALF_WIDTH - pos * TILE_SPACING;
    z = -HALF_HEIGHT;
    rotY = Math.PI;
  } else {
    // Left column (25-31): 7 tiles between top-left and bottom-left corners
    const pos = index - BOTTOM_COUNT - RIGHT_COUNT - TOP_COUNT; // 0 to 6
    x = -HALF_WIDTH;
    z = -HALF_HEIGHT + (pos + 1) * TILE_SPACING; // Start one step down from top-left corner
    rotY = Math.PI / 2;
  }

  return {
    position: [x, 0.2, z],
    rotation: [0, rotY, 0],
  };
};

export const generateBoardTiles = (): BoardTile[] => {
  return BOARD_DATA.map((space) => {
    const { position, rotation } = getTileTransform(space.id);

    return {
      id: space.id,
      space,
      position,
      rotation,
    };
  });
};

// Export board dimensions for Board.tsx
export const BOARD_DIMENSIONS = {
  width: BOARD_WIDTH,
  height: BOARD_HEIGHT,
  halfWidth: HALF_WIDTH,
  halfHeight: HALF_HEIGHT,
};
