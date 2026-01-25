export type BoardSpaceType =
  | 'START'
  | 'COUNTRY'
  | 'STOCK'
  | 'MINIGAME'
  | 'ISLAND'
  | 'KEY'
  | 'TAX'
  | 'WAR'
  | 'EXPO';

export type Continent = 'ASIA' | 'AFRICA' | 'EUROPE' | 'AMERICA';

export type BoardSpace = {
  id: number;
  name: string;
  type: BoardSpaceType;
  price?: number;
  continent?: Continent;
  description?: string;
};

// 시계 방향 보드판 (오른쪽 아래 모서리가 시작)
// 레이아웃:
//     16 - 17 - 18 - 19 - 20 - 21 - 22 - 23 - 24
//     |                                        |
//    15                                       25
//    14                                       26
//    13                                       27
//    12                                       28
//    11                                       29
//    10                                       30
//     9                                       31
//     |                                        |
//     8 -  7 -  6 -  5 -  4 -  3 -  2 -  1 -  0(시작)

export const BOARD_DATA: BoardSpace[] = [
  // ============================================
  // ⬅️ 1. 하단 라인 (0~7번) / 아시아 & 오세아니아
  // 시작(우하 코너) → 왼쪽으로 진행
  // ============================================
  { id: 0, name: '시작', type: 'START', description: '출발점—매 턴 통과 시 월급 지급.' },
  { id: 1, name: '베트남', type: 'COUNTRY', price: 535500, continent: 'ASIA', description: '동남아의 성장 시장—저가 생산과 관광이 강점.' },
  { id: 2, name: '오락실', type: 'MINIGAME', description: '미니게임에 도전하여 보상을 획득하세요.' },
  { id: 3, name: '호주', type: 'COUNTRY', price: 665000, continent: 'ASIA', description: '자원 부국—광산·에너지 기반이 탄탄.' },
  { id: 4, name: '테슬라', type: 'STOCK', description: '전기차·에너지 혁신 기업—높은 변동성과 성장성.' },
  { id: 5, name: '중국', type: 'COUNTRY', price: 756000, continent: 'ASIA', description: '거대 내수와 제조업 중심—변동성도 큰 편.' },
  { id: 6, name: '일본', type: 'COUNTRY', price: 735000, continent: 'ASIA', description: '정밀 제조·브랜드 강국—안정적 이미지.' },
  { id: 7, name: '대한민국', type: 'COUNTRY', price: 700000, continent: 'ASIA', description: 'IT·콘텐츠·제조가 강점—성장과 경쟁이 치열.' },

  // ============================================
  // ⬆️ 2. 좌측 라인 (8~15번) / 중동 & 아프리카
  // 전쟁(좌하 코너) → 위로 진행
  // ============================================
  { id: 8, name: '전쟁', type: 'WAR', description: '전쟁 칸—다른 플레이어에게 전쟁을 선포할 수 있습니다.' },
  { id: 9, name: '금 거래소', type: 'STOCK', description: '안전자산 금—시장 불안 시 가치 상승.' },
  { id: 10, name: 'UAE', type: 'COUNTRY', price: 770000, continent: 'AFRICA', description: '에너지·금융 허브—오일머니 기반.' },
  { id: 11, name: '이란', type: 'COUNTRY', price: 630000, continent: 'AFRICA', description: '에너지 자원 풍부—정세에 따라 리스크 변동.' },
  { id: 12, name: '황금열쇠', type: 'KEY', description: '랜덤 이벤트 카드를 뽑습니다.' },
  { id: 13, name: '이집트', type: 'COUNTRY', price: 567000, continent: 'AFRICA', description: '수에즈 운하 물류 요충—관광 산업도 큼.' },
  { id: 14, name: '록히드마틴', type: 'STOCK', description: '세계 최대 방산 기업—국방 예산과 연동.' },
  { id: 15, name: '남아공', type: 'COUNTRY', price: 598500, continent: 'AFRICA', description: '광물 자원과 금융 중심—원자재 흐름 영향.' },

  // ============================================
  // ➡️ 3. 상단 라인 (16~23번) / 유럽
  // 월드컵/올림픽(좌상 코너) → 오른쪽으로 진행
  // ============================================
  { id: 16, name: '월드컵/올림픽', type: 'EXPO', description: '월드컵·올림픽 개최—전 플레이어 이동 이벤트.' },
  { id: 17, name: '러시아', type: 'COUNTRY', price: 661500, continent: 'EUROPE', description: '에너지·자원 대국—정치·외교 변수에 민감.' },
  { id: 18, name: '삼성전자', type: 'STOCK', description: '반도체·전자 대기업—글로벌 IT 수요와 연동.' },
  { id: 19, name: '스위스', type: 'COUNTRY', price: 1001000, continent: 'EUROPE', description: '금융·제약·정밀 산업—프리미엄/안정 이미지.' },
  { id: 20, name: '황금열쇠', type: 'KEY', description: '랜덤 이벤트 카드를 뽑습니다.' },
  { id: 21, name: '프랑스', type: 'COUNTRY', price: 770000, continent: 'EUROPE', description: '럭셔리·관광·항공우주—브랜드 파워.' },
  { id: 22, name: '영국', type: 'COUNTRY', price: 924000, continent: 'EUROPE', description: '금융·서비스 중심—시장 이슈 영향.' },
  { id: 23, name: '독일', type: 'COUNTRY', price: 885000, continent: 'EUROPE', description: '기계·자동차·제조 강국—기술 기반 탄탄.' },

  // ============================================
  // ⬇️ 4. 우측 라인 (24~31번) / 아메리카
  // 우주여행(우상 코너) → 아래로 진행
  // ============================================
  { id: 24, name: '우주여행', type: 'ISLAND', description: '우주여행 특별 칸—특별 이벤트 발생.' },
  { id: 25, name: '비트코인', type: 'STOCK', description: '암호화폐 대장—극심한 변동성과 높은 수익 가능성.' },
  { id: 26, name: '브라질', type: 'COUNTRY', price: 630000, continent: 'AMERICA', description: '농산물·자원 대국—신흥국 변동성.' },
  { id: 27, name: '아르헨티나', type: 'COUNTRY', price: 567000, continent: 'AMERICA', description: '농축산 중심—환율·물가 변수 큼.' },
  { id: 28, name: '황금열쇠', type: 'KEY', description: '랜덤 이벤트 카드를 뽑습니다.' },
  { id: 29, name: '캐나다', type: 'COUNTRY', price: 735000, continent: 'AMERICA', description: '자원·IT·금융 균형—미국 경기와 연동.' },
  { id: 30, name: '국세청', type: 'TAX', description: '세금 칸—총 자산의 일정 비율을 납부합니다.' },
  { id: 31, name: '미국', type: 'COUNTRY', price: 1078000, continent: 'AMERICA', description: '세계 최대 시장—테크·금융 주도, 기회와 경쟁 공존.' }
];

export type BoardTile = {
  id: number;
  space: BoardSpace;
  position: [number, number, number];
  rotation: [number, number, number];
};

export const TILE_COUNT = BOARD_DATA.length; // 32 tiles

// Board dimensions: 9x9 grid (8 tiles per side + corners)
const TILE_SPACING = 2.8;

// Calculate board dimensions
const BOARD_WIDTH = 8 * TILE_SPACING;  // 8 * 2.8 = 22.4
const BOARD_HEIGHT = 8 * TILE_SPACING; // 8 * 2.8 = 22.4
const HALF_WIDTH = BOARD_WIDTH / 2;    // 11.2
const HALF_HEIGHT = BOARD_HEIGHT / 2;  // 11.2

// 시계 방향 레이아웃:
// - 하단 (0-7): 8칸, 0이 우하 코너 (시작), 왼쪽으로 진행
// - 좌측 (8-15): 8칸, 8이 좌하 코너, 위로 진행
// - 상단 (16-23): 8칸, 16이 좌상 코너, 오른쪽으로 진행
// - 우측 (24-31): 8칸, 24가 우상 코너, 아래로 진행

const BOTTOM_COUNT = 8;  // indices 0-7
const LEFT_COUNT = 8;    // indices 8-15
const TOP_COUNT = 8;     // indices 16-23
const RIGHT_COUNT = 8;   // indices 24-31

export const getTileTransform = (index: number): { position: [number, number, number]; rotation: [number, number, number] } => {
  let x = 0;
  let z = 0;
  let rotY = 0;

  if (index < BOTTOM_COUNT) {
    // 하단 라인 (0-7): 시작(0)이 우하 코너, 왼쪽으로 진행
    // index 0: x = HALF_WIDTH (우측)
    // index 7: x = -HALF_WIDTH + TILE_SPACING (좌측 코너 바로 오른쪽)
    const pos = index;
    x = HALF_WIDTH - pos * TILE_SPACING;
    z = HALF_HEIGHT;
    rotY = Math.PI; // 위를 향함 (보드 안쪽)
  } else if (index < BOTTOM_COUNT + LEFT_COUNT) {
    // 좌측 라인 (8-15): 8이 좌하 코너, 위로 진행
    // index 8: z = HALF_HEIGHT (하단)
    // index 15: z = -HALF_HEIGHT + TILE_SPACING (상단 코너 바로 아래)
    const pos = index - BOTTOM_COUNT;
    x = -HALF_WIDTH;
    z = HALF_HEIGHT - pos * TILE_SPACING;
    rotY = -Math.PI / 2; // 오른쪽을 향함 (보드 안쪽)
  } else if (index < BOTTOM_COUNT + LEFT_COUNT + TOP_COUNT) {
    // 상단 라인 (16-23): 16이 좌상 코너, 오른쪽으로 진행
    // index 16: x = -HALF_WIDTH (좌측)
    // index 23: x = HALF_WIDTH - TILE_SPACING (우측 코너 바로 왼쪽)
    const pos = index - BOTTOM_COUNT - LEFT_COUNT;
    x = -HALF_WIDTH + pos * TILE_SPACING;
    z = -HALF_HEIGHT;
    rotY = 0; // 아래를 향함 (보드 안쪽)
  } else {
    // 우측 라인 (24-31): 24가 우상 코너, 아래로 진행
    // index 24: z = -HALF_HEIGHT (상단)
    // index 31: z = HALF_HEIGHT - TILE_SPACING (하단 코너 바로 위)
    const pos = index - BOTTOM_COUNT - LEFT_COUNT - TOP_COUNT;
    x = HALF_WIDTH;
    z = -HALF_HEIGHT + pos * TILE_SPACING;
    rotY = Math.PI / 2; // 왼쪽을 향함 (보드 안쪽)
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
