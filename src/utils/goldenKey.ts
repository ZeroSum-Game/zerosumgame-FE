import { BOARD_DATA, type Continent } from './boardUtils';
import type { StockSymbol } from '../store/useGameStore';

export type GoldenKeyContext = {
  players: Array<{
    id: number;
    userId: number;
    name: string;
    cash: number;
    isBankrupt: boolean;
    stockHoldings: Partial<Record<StockSymbol, number>>;
  }>;
  lands: Record<number, { ownerId: number; type: 'LAND' | 'LANDMARK' }>;
  landPrices: Record<number, number>;
  assetPrices: Record<StockSymbol, number>;
};

export type GoldenKeyCardPayload = {
  id: number;
  title: string;
  message: string;
  targetType: 'CONTINENT' | 'COUNTRY' | 'STOCK' | 'PLAYER' | 'PLAYERS' | 'PAIR' | 'NONE';
  target?: string;
  continent?: Continent;
  countryId?: number;
  countryName?: string;
  symbol?: StockSymbol;
  playerId?: number;
  playerIds?: number[];
  amount?: number;
  percent?: number;
  multiplier?: number;
  effectValue?: number;
  extra?: Record<string, number | string | boolean | number[]>;
};

const countrySpaces = BOARD_DATA.filter((s) => s.type === 'COUNTRY');

const randInt = (min: number, max: number) => Math.floor(min + Math.random() * (max - min + 1));
const randFloat = (min: number, max: number, digits: number = 2) =>
  Number((min + Math.random() * (max - min)).toFixed(digits));

const pickOne = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)];

const pickCountry = () => pickOne(countrySpaces);

export const drawGoldenKeyCard = (context: GoldenKeyContext): GoldenKeyCardPayload => {
  const alive = context.players.filter((p) => !p.isBankrupt);
  const country = pickCountry();
  const vietnamId = 1;
  const vietnam = BOARD_DATA.find((s) => s.id === vietnamId) ?? { id: vietnamId, name: '베트남' };
  const america: Continent = 'AMERICA';
  const africa: Continent = 'AFRICA';
  const formatPercent = (value: number) => `${Math.round(value * 100)}%`;

  const samsungSupplyBoost = randFloat(0.15, 0.3);
  const lockheedImportBoost = randFloat(0.1, 0.2);
  const bitcoinHalvingBoost = randFloat(0.2, 0.4);
  const securityCost = randInt(100000, 200000);
  const resetSupport = randInt(300000, 600000);
  const landPriceLift = randFloat(0.1, 0.2);
  const goldDemandBoost = randFloat(0.15, 0.25);
  const teslaRegulationDrop = randFloat(0.1, 0.2);
  const startupCash = randInt(500000, 800000);
  const teslaInfraBoost = randFloat(0.15, 0.25);

  const cards: GoldenKeyCardPayload[] = [
    {
      id: 1,
      title: '반도체 공급망 재편',
      targetType: 'STOCK',
      symbol: 'SAMSUNG',
      target: 'SAMSUNG',
      effectValue: samsungSupplyBoost,
      message: `삼성전자 주가가 ${formatPercent(samsungSupplyBoost)} 상승합니다.`,
    },
    {
      id: 2,
      title: '미 관세 정책 변동',
      targetType: 'CONTINENT',
      continent: america,
      target: 'AMERICA',
      effectValue: 0.15,
      message: `미주 대륙 통행료가 ${formatPercent(0.15)} 증가합니다.`,
    },
    {
      id: 3,
      title: '에너지 수입선 다변화',
      targetType: 'STOCK',
      symbol: 'LOCKHEED',
      target: 'LOCKHEED',
      effectValue: lockheedImportBoost,
      message: `록히드마틴 주가가 ${formatPercent(lockheedImportBoost)} 상승합니다.`,
    },
    {
      id: 4,
      title: '비트코인 반감기 효과',
      targetType: 'STOCK',
      symbol: 'BITCOIN',
      target: 'BITCOIN',
      effectValue: bitcoinHalvingBoost,
      message: `비트코인 가격이 ${formatPercent(bitcoinHalvingBoost)} 상승합니다.`,
    },
    {
      id: 5,
      title: '사이버 금융 보안 강화',
      targetType: 'PLAYER',
      playerId: pickOne(alive).id,
      amount: securityCost,
      message: `보안 강화 비용으로 현금 ${securityCost}원을 지불합니다.`,
    },
    {
      id: 6,
      title: '글로벌 리셋 시장 활성화',
      targetType: 'PLAYER',
      playerId: pickOne(alive).id,
      amount: resetSupport,
      message: `하위 플레이어에게 현금 ${resetSupport}원이 지급됩니다.`,
    },
    {
      id: 7,
      title: '부동산 공시지가 현실화',
      targetType: 'NONE',
      effectValue: landPriceLift,
      message: `전국 부동산 인수 비용이 ${formatPercent(landPriceLift)} 상승합니다.`,
    },
    {
      id: 8,
      title: 'AI 칩셋 대량 수주',
      targetType: 'STOCK',
      symbol: 'SAMSUNG',
      target: 'SAMSUNG',
      effectValue: 0.2,
      message: '삼성전자 배당률이 20%로 상승합니다.',
    },
    {
      id: 9,
      title: '안전 자산 선호 심리',
      targetType: 'STOCK',
      symbol: 'GOLD',
      target: 'GOLD',
      effectValue: goldDemandBoost,
      message: `금 가격이 ${formatPercent(goldDemandBoost)} 상승합니다.`,
    },
    {
      id: 10,
      title: '첨단 방산 기술 수출',
      targetType: 'STOCK',
      symbol: 'LOCKHEED',
      target: 'LOCKHEED',
      effectValue: 0.25,
      message: '록히드마틴 주가가 25% 상승합니다.',
    },
    {
      id: 11,
      title: '신흥국 통화 가치 하락',
      targetType: 'CONTINENT',
      continent: africa,
      target: 'AFRICA',
      effectValue: 0.15,
      extra: { countryIds: [vietnam.id] },
      message: `아프리카 및 ${vietnam.name} 통행료가 ${formatPercent(0.15)} 감소합니다.`,
    },
    {
      id: 12,
      title: '빅테크 독점 규제',
      targetType: 'STOCK',
      symbol: 'TESLA',
      target: 'TESLA',
      effectValue: -teslaRegulationDrop,
      message: `테슬라 주가가 ${formatPercent(teslaRegulationDrop)} 하락합니다.`,
    },
    {
      id: 13,
      title: '탄소 배출권 가격 조정',
      targetType: 'PLAYERS',
      amount: 30000,
      message: '보유한 땅마다 3만 원을 지불합니다.',
    },
    {
      id: 14,
      title: '스타트업 M&A 성사',
      targetType: 'PLAYER',
      playerId: pickOne(alive).id,
      amount: startupCash,
      message: `현금 ${startupCash}원을 확보했습니다.`,
    },
    {
      id: 15,
      title: '글로벌 물류 병목 해소',
      targetType: 'NONE',
      effectValue: 0.1,
      message: '전체 통행료가 10% 감소합니다.',
    },
    {
      id: 16,
      title: '디지털 화폐(CBDC) 도입',
      targetType: 'PLAYER',
      playerId: pickOne(alive).id,
      amount: 100000,
      message: '현금 10만 원 보너스를 받습니다.',
    },
    {
      id: 17,
      title: '전기차 충전 인프라 확충',
      targetType: 'STOCK',
      symbol: 'TESLA',
      target: 'TESLA',
      effectValue: teslaInfraBoost,
      message: `테슬라 주가가 ${formatPercent(teslaInfraBoost)} 상승합니다.`,
    },
    {
      id: 18,
      title: '지정학적 긴급 평화협정',
      targetType: 'PLAYER',
      playerId: pickOne(alive).id,
      effectValue: 0.05,
      message: '방어자 전쟁 승률 +5% 보정이 적용됩니다.',
    },
    {
      id: 19,
      title: '스마트 시티 건설 붐',
      targetType: 'COUNTRY',
      countryId: country.id,
      countryName: country.name,
      target: country.name,
      effectValue: 0.3,
      message: `${country.name} 통행료가 30% 증가합니다.`,
    },
    {
      id: 20,
      title: 'AI 자산 관리 조언',
      targetType: 'PLAYER',
      playerId: pickOne(alive).id,
      effectValue: 0.05,
      message: '총자산 평가액이 5% 상승합니다.',
    },
  ];

  return pickOne(cards);
};
