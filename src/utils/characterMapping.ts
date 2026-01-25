import type { CharacterType } from '../store/useGameStore';

export type BackendCharacter = 'MUSK' | 'LEE' | 'TRUMP' | 'PUTIN';

export const toBackendCharacter = (c: CharacterType): BackendCharacter => {
  switch (c) {
    case 'ELON':
      return 'MUSK';
    case 'SAMSUNG':
      return 'LEE';
    case 'TRUMP':
      return 'TRUMP';
    case 'PUTIN':
      return 'PUTIN';
  }
};

export const fromBackendCharacter = (c: string | null | undefined): CharacterType | null => {
  const v = (c ?? '').toUpperCase();
  if (v === 'MUSK') return 'ELON';
  if (v === 'LEE') return 'SAMSUNG';
  if (v === 'TRUMP') return 'TRUMP';
  if (v === 'PUTIN') return 'PUTIN';
  return null;
};

