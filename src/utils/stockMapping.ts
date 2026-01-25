import type { StockSymbol } from '../store/useGameStore';

export type BackendStockSymbol = 'SAMSUNG' | 'TESLA' | 'LOCKHEED' | 'GOLD' | 'BITCOIN';
export type BackendAssetKey = 'samsung' | 'tesla' | 'lockheed' | 'gold' | 'bitcoin';

export const toBackendStockSymbol = (symbol: StockSymbol): BackendStockSymbol => {
  const mapping: Record<StockSymbol, BackendStockSymbol> = {
    SAMSUNG: 'SAMSUNG',
    SK_HYNIX: 'TESLA',
    HYUNDAI: 'LOCKHEED',
    GOLD: 'GOLD',
    BITCOIN: 'BITCOIN',
  };
  return mapping[symbol];
};

export const fromBackendStockSymbol = (symbol: string): StockSymbol | null => {
  const normalized = symbol.trim().toUpperCase();
  const mapping: Record<string, StockSymbol> = {
    SAMSUNG: 'SAMSUNG',
    TESLA: 'SK_HYNIX',
    LOCKHEED: 'HYUNDAI',
    GOLD: 'GOLD',
    BITCOIN: 'BITCOIN',
  };
  return mapping[normalized] ?? null;
};

export const backendAssetKeyToStockSymbol: Record<BackendAssetKey, StockSymbol> = {
  samsung: 'SAMSUNG',
  tesla: 'SK_HYNIX',
  lockheed: 'HYUNDAI',
  gold: 'GOLD',
  bitcoin: 'BITCOIN',
};

export const stockSymbolToBackendAssetKey: Record<StockSymbol, BackendAssetKey> = {
  SAMSUNG: 'samsung',
  SK_HYNIX: 'tesla',
  HYUNDAI: 'lockheed',
  GOLD: 'gold',
  BITCOIN: 'bitcoin',
};

