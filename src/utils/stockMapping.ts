import type { StockSymbol } from '../store/useGameStore';

export type BackendStockSymbol = 'SAMSUNG' | 'TESLA' | 'LOCKHEED' | 'GOLD' | 'BITCOIN';
export type BackendAssetKey = 'samsung' | 'tesla' | 'lockheed' | 'gold' | 'bitcoin';

export const toBackendStockSymbol = (symbol: StockSymbol): BackendStockSymbol => {
  const mapping: Record<StockSymbol, BackendStockSymbol> = {
    SAMSUNG: 'SAMSUNG',
    TESLA: 'TESLA',
    LOCKHEED: 'LOCKHEED',
    GOLD: 'GOLD',
    BITCOIN: 'BITCOIN',
  };
  return mapping[symbol];
};

export const fromBackendStockSymbol = (symbol: string): StockSymbol | null => {
  const normalized = symbol.trim().toUpperCase();
  const mapping: Record<string, StockSymbol> = {
    SAMSUNG: 'SAMSUNG',
    TESLA: 'TESLA',
    LOCKHEED: 'LOCKHEED',
    GOLD: 'GOLD',
    BITCOIN: 'BITCOIN',
  };
  return mapping[normalized] ?? null;
};

export const backendAssetKeyToStockSymbol: Record<BackendAssetKey, StockSymbol> = {
  samsung: 'SAMSUNG',
  tesla: 'TESLA',
  lockheed: 'LOCKHEED',
  gold: 'GOLD',
  bitcoin: 'BITCOIN',
};

export const stockSymbolToBackendAssetKey: Record<StockSymbol, BackendAssetKey> = {
  SAMSUNG: 'samsung',
  TESLA: 'tesla',
  LOCKHEED: 'lockheed',
  GOLD: 'gold',
  BITCOIN: 'bitcoin',
};
