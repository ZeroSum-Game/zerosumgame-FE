import type { StockSymbol } from '../store/useGameStore';
import type { BoardSpace, Continent } from './boardUtils';

export type Region = 'ASIA' | 'EUROPE' | 'AMERICAS' | 'AFRICA' | 'MIDDLE_EAST' | 'GLOBAL';

const continentToRegion = (continent: Continent): Region => {
  switch (continent) {
    case 'ASIA':
      return 'ASIA';
    case 'EUROPE':
      return 'EUROPE';
    case 'AFRICA':
      return 'AFRICA';
    case 'AMERICA':
      return 'AMERICAS';
    default:
      return 'GLOBAL';
  }
};

export const getRegionForStockSymbol = (symbol: StockSymbol): Region => {
  switch (symbol) {
    case 'SAMSUNG':
    case 'SK_HYNIX':
    case 'HYUNDAI':
      return 'ASIA';
    case 'BITCOIN':
    case 'GOLD':
      return 'GLOBAL';
    default:
      return 'GLOBAL';
  }
};

export const getRegionForBoardSpace = (
  space: BoardSpace,
  opts?: { stockSymbol?: StockSymbol | undefined }
): Region | null => {
  if (space.type === 'COUNTRY') {
    // UAE, Iran are grouped as Middle East for UI cues.
    if (space.id === 10 || space.id === 11) return 'MIDDLE_EAST';
    return space.continent ? continentToRegion(space.continent) : 'GLOBAL';
  }

  if (space.type === 'STOCK' && opts?.stockSymbol) {
    return getRegionForStockSymbol(opts.stockSymbol);
  }

  return null;
};

