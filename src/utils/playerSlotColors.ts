export const PLAYER_SLOT_COLORS = ['#3B82F6', '#EF4444', '#22C55E', '#FACC15'] as const;

export const getPlayerSlotColor = (index: number) => {
  const len = PLAYER_SLOT_COLORS.length;
  const safeIndex = ((index % len) + len) % len;
  return PLAYER_SLOT_COLORS[safeIndex];
};

