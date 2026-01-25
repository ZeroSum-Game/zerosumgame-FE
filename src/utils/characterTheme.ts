import type { CharacterType } from '../store/useGameStore';

export const CHARACTER_THEME: Record<CharacterType, { bgClass: string; ringClass: string }> = {
  ELON: {
    bgClass: 'bg-gradient-to-br from-sky-500/38 via-blue-500/16 to-white/[0.02]',
    ringClass: 'ring-sky-200/35',
  },
  TRUMP: {
    bgClass: 'bg-gradient-to-br from-rose-500/38 via-red-500/16 to-white/[0.02]',
    ringClass: 'ring-rose-200/35',
  },
  SAMSUNG: {
    bgClass: 'bg-gradient-to-br from-amber-400/38 via-yellow-300/14 to-white/[0.02]',
    ringClass: 'ring-amber-200/35',
  },
  PUTIN: {
    bgClass: 'bg-gradient-to-br from-emerald-500/36 via-lime-400/14 to-white/[0.02]',
    ringClass: 'ring-emerald-200/35',
  },
};
