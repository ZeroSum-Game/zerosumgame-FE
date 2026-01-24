export const formatKRW = (n: number) => `₩${Math.max(0, Math.round(n)).toLocaleString()}`;

const trimZeros = (s: string) => s.replace(/(\.\d*?[1-9])0+$/u, '$1').replace(/\.0+$/u, '');

export const formatKRWKoShort = (n: number) => {
  const v = Math.max(0, Math.round(n));
  if (v >= 100_000_000) return `₩${trimZeros((v / 100_000_000).toFixed(2))}억`;
  if (v >= 10_000) return `₩${trimZeros((v / 10_000).toFixed(1))}만`;
  return `₩${v.toLocaleString()}`;
};

export const formatKRWKo = (n: number) => {
  const v = Math.max(0, Math.round(n));
  if (v >= 100_000_000) return `₩${v.toLocaleString()} (${formatKRWKoShort(v)})`;
  if (v >= 10_000) return `₩${v.toLocaleString()} (${formatKRWKoShort(v)})`;
  return `₩${v.toLocaleString()}`;
};
