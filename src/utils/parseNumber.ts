export const toNumber = (value: unknown, fallback: number = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'bigint') return Number(value);
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return fallback;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
};

export const toInt = (value: unknown, fallback: number = 0): number => {
  const n = toNumber(value, NaN);
  if (!Number.isFinite(n)) return fallback;
  return Math.trunc(n);
};

