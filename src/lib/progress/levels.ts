/** XP required to advance from `level` to `level + 1`. Early levels are quick, later ones meaningful. */
export function xpToNext(level: number) {
  return Math.round(100 * Math.pow(level, 1.5));
}

/** Converts lifetime XP into the current level and progress within it. */
export function levelFromXp(totalXp: number) {
  let level = 1;
  let remaining = Math.max(0, Math.floor(totalXp));
  while (remaining >= xpToNext(level)) {
    remaining -= xpToNext(level);
    level++;
  }
  const needed = xpToNext(level);
  return { level, current: remaining, needed, progress: remaining / needed };
}
