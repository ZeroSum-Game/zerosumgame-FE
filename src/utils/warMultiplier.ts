import type { WarPayload } from '../store/useGameStore';

const WAR_LINE_RANGES = [
  { start: 0, end: 7 },
  { start: 8, end: 15 },
  { start: 16, end: 23 },
  { start: 24, end: 31 },
] as const;

// Backend parity: nodes excluded from war multipliers even if owned.
const NEUTRAL_NODES = new Set([0, 3, 12, 16, 20, 24, 28, 30]);

const getLineIndex = (nodeIdx: number) => WAR_LINE_RANGES.findIndex((r) => nodeIdx >= r.start && nodeIdx <= r.end);

export const getWarLandMultiplier = (nodeIdx: number, isOwned: boolean, war: WarPayload | null): number => {
  if (!war) return 1;
  if (!isOwned) return 1;
  if (NEUTRAL_NODES.has(nodeIdx)) return 1;

  const lineIdx = getLineIndex(nodeIdx);

  if (war.active) {
    if (war.warNode != null && nodeIdx === war.warNode) return 0.5;
    if (war.warLine != null && lineIdx === war.warLine) return 0.75;
    return 1.1;
  }

  if (war.recoveryActive && war.warLine != null && lineIdx === war.warLine) {
    if (war.warNode != null && nodeIdx === war.warNode) return war.recoveryNode;
    return war.recoveryLine;
  }

  return 1;
};

export const applyWarMultiplier = (value: number, nodeIdx: number, isOwned: boolean, war: WarPayload | null): number => {
  const mult = getWarLandMultiplier(nodeIdx, isOwned, war);
  return Math.round(value * mult);
};

