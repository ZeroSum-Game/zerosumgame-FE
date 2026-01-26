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
  description?: string;
};

export const BOARD_DATA: BoardSpace[] = [
  // Bottom row (0-8): 9 tiles, left to right
  { id: 0, name: '시작', type: 'START' },
  { id: 1, name: '베트남', type: 'COUNTRY', price: 535500, continent: 'ASIA', description: '동남아의 성장 시장—저가 생산과 관광이 강점.' },
  { id: 2, name: '오락실', type: 'MINIGAME' },
  { id: 3, name: '호주', type: 'COUNTRY', price: 665000, continent: 'ASIA', description: '자원 부국—광산·에너지 기반이 탄탄.' },
  { id: 4, name: '테슬라', type: 'STOCK' },
  { id: 5, name: '중국', type: 'COUNTRY', price: 756000, continent: 'ASIA', description: '거대 내수와 제조업 중심—변동성도 큰 편.' },
  { id: 6, name: '일본', type: 'COUNTRY', price: 735000, continent: 'ASIA', description: '정밀 제조·브랜드 강국—안정적 이미지.' },
  { id: 7, name: '대한민국', type: 'COUNTRY', price: 700000, continent: 'ASIA', description: 'IT·콘텐츠·제조가 강점—성장과 경쟁이 치열.' },
  { id: 8, name: '전쟁', type: 'ISLAND' },

  // Right column (9-15): 7 tiles, bottom to top (excluding corners)
  { id: 9, name: '금 거래소', type: 'STOCK' },
  { id: 10, name: 'UAE', type: 'COUNTRY', price: 770000, continent: 'AFRICA', description: '에너지·금융 허브—오일머니 기반.' },
  { id: 11, name: '이란', type: 'COUNTRY', price: 630000, continent: 'AFRICA', description: '에너지 자원 풍부—정세에 따라 리스크 변동.' },
  { id: 12, name: '황금열쇠', type: 'KEY' },
  { id: 13, name: '이집트', type: 'COUNTRY', price: 567000, continent: 'AFRICA', description: '수에즈 운하 물류 요충—관광 산업도 큼.' },
  { id: 14, name: '록히드마틴', type: 'STOCK' },
  { id: 15, name: '남아공', type: 'COUNTRY', price: 598500, continent: 'AFRICA', description: '광물 자원과 금융 중심—원자재 흐름 영향.' },

  // Top row (16-24): 9 tiles, right to left
  { id: 16, name: '올림픽', type: 'ISLAND' },
  { id: 17, name: '러시아', type: 'COUNTRY', price: 661500, continent: 'EUROPE', description: '에너지·자원 대국—정치·외교 변수에 민감.' },
  { id: 18, name: '삼성전자', type: 'STOCK' },
  { id: 19, name: '스위스', type: 'COUNTRY', price: 1001000, continent: 'EUROPE', description: '금융·제약·정밀 산업—프리미엄/안정 이미지.' },
  { id: 20, name: '황금열쇠', type: 'KEY' },
  { id: 21, name: '프랑스', type: 'COUNTRY', price: 770000, continent: 'EUROPE', description: '럭셔리·관광·항공우주—브랜드 파워.' },
  { id: 22, name: '영국', type: 'COUNTRY', price: 924000, continent: 'EUROPE', description: '금융·서비스 중심—시장 이슈 영향.' },
  { id: 23, name: '독일', type: 'COUNTRY', price: 885000, continent: 'EUROPE', description: '기계·자동차·제조 강국—기술 기반 탄탄.' },
  { id: 24, name: '월드컵', type: 'ISLAND' },

  // Left column (25-31): 7 tiles, top to bottom (excluding corners)
  { id: 25, name: '비트코인', type: 'STOCK' },
  { id: 26, name: '브라질', type: 'COUNTRY', price: 630000, continent: 'AMERICA', description: '농산물·자원 대국—신흥국 변동성.' },
  { id: 27, name: '아르헨티나', type: 'COUNTRY', price: 567000, continent: 'AMERICA', description: '농축산 중심—환율·물가 변수 큼.' },
  { id: 28, name: '황금열쇠', type: 'KEY' },
  { id: 29, name: '캐나다', type: 'COUNTRY', price: 735000, continent: 'AMERICA', description: '자원·IT·금융 균형—미국 경기와 연동.' },
  { id: 30, name: '국세청', type: 'TAX' },
  { id: 31, name: '미국', type: 'COUNTRY', price: 1078000, continent: 'AMERICA', description: '세계 최대 시장—테크·금융 주도, 기회와 경쟁 공존.' }
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
