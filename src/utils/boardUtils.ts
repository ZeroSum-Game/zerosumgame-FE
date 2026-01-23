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
  { id: 0, name: '시작', type: 'START' },
  { id: 1, name: '베트남', type: 'COUNTRY', price: 535500, continent: 'ASIA' },
  { id: 2, name: '오락실', type: 'MINIGAME' },
  { id: 3, name: '호주', type: 'COUNTRY', price: 665000, continent: 'ASIA' },
  { id: 4, name: '현대차', type: 'STOCK' },
  { id: 5, name: '중국', type: 'COUNTRY', price: 756000, continent: 'ASIA' },
  { id: 6, name: '일본', type: 'COUNTRY', price: 735000, continent: 'ASIA' },
  { id: 7, name: '대한민국', type: 'COUNTRY', price: 700000, continent: 'ASIA' },
  { id: 8, name: '전쟁', type: 'ISLAND' },
  { id: 9, name: '금 거래소', type: 'STOCK' },
  { id: 10, name: 'UAE', type: 'COUNTRY', price: 770000, continent: 'AFRICA' },
  { id: 11, name: '이란', type: 'COUNTRY', price: 630000, continent: 'AFRICA' },
  { id: 12, name: '황금열쇠', type: 'KEY' },
  { id: 13, name: '이집트', type: 'COUNTRY', price: 567000, continent: 'AFRICA' },
  { id: 14, name: 'SK하이닉스', type: 'STOCK' },
  { id: 15, name: '남아공', type: 'COUNTRY', price: 598500, continent: 'AFRICA' },
  { id: 16, name: '올림픽', type: 'ISLAND' },
  { id: 17, name: '러시아', type: 'COUNTRY', price: 661500, continent: 'EUROPE' },
  { id: 18, name: '삼성전자', type: 'STOCK' },
  { id: 19, name: '스위스', type: 'COUNTRY', price: 1001000, continent: 'EUROPE' },
  { id: 20, name: '황금열쇠', type: 'KEY' },
  { id: 21, name: '프랑스', type: 'COUNTRY', price: 770000, continent: 'EUROPE' },
  { id: 22, name: '영국', type: 'COUNTRY', price: 924000, continent: 'EUROPE' },
  { id: 23, name: '독일', type: 'COUNTRY', price: 885000, continent: 'EUROPE' },
  { id: 24, name: '우주여행', type: 'ISLAND' },
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

export const TILE_COUNT = BOARD_DATA.length;
const SIDE_LENGTH = 16;
const HALF_SIDE = SIDE_LENGTH / 2;
const PERIMETER = SIDE_LENGTH * 4;

const getPositionFromDistance = (distance: number) => {
  const normalized = distance % PERIMETER;
  if (normalized < SIDE_LENGTH) {
    return {
      x: -HALF_SIDE + normalized,
      z: HALF_SIDE,
    };
  }

  if (normalized < SIDE_LENGTH * 2) {
    return {
      x: HALF_SIDE,
      z: HALF_SIDE - (normalized - SIDE_LENGTH),
    };
  }

  if (normalized < SIDE_LENGTH * 3) {
    return {
      x: HALF_SIDE - (normalized - SIDE_LENGTH * 2),
      z: -HALF_SIDE,
    };
  }

  return {
    x: -HALF_SIDE,
    z: -HALF_SIDE + (normalized - SIDE_LENGTH * 3),
  };
};

export const getTileTransform = (index: number) => {
  const spacing = PERIMETER / TILE_COUNT;
  const distance = (index + 0.5) * spacing;
  const { x, z } = getPositionFromDistance(distance);

  return {
    position: [x, 0.15, z] as [number, number, number],
    rotation: [0, 0, 0] as [number, number, number],
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
