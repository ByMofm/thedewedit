function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export interface Rating {
  score: number;
  count: number;
}

export function getRating(seed: string): Rating {
  const h = hash(seed);
  const score = 4.3 + ((h % 70) / 100);
  const count = 60 + (h % 320);
  return { score: Math.round(score * 10) / 10, count };
}
