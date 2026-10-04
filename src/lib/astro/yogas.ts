import { type Graha, houseFrom, norm } from "./constants";

type Pos = { graha: Graha; longitude: number; rashi: number; dignity: "exalted" | "debilitated" | "own" | null };

export type YogaKey =
  | "gajaKesari"
  | "budhaditya"
  | "chandraMangala"
  | "ruchaka"
  | "bhadra"
  | "hamsa"
  | "malavya"
  | "sasa"
  | "mangalDosha"
  | "kemadruma"
  | "kaalSarp";

export type FoundYoga = { key: YogaKey; kind: "yoga" | "dosha"; grahas: Graha[] };

const KENDRA = [1, 4, 7, 10];
const MAHAPURUSHA: [Graha, YogaKey][] = [
  ["Mars", "ruchaka"],
  ["Mercury", "bhadra"],
  ["Jupiter", "hamsa"],
  ["Venus", "malavya"],
  ["Saturn", "sasa"],
];

/**
 * Classical combinations found in a birth chart. `houseRef` is the Lagna sign
 * (or the Moon sign when the birth time is unknown).
 */
export function detectYogas(positions: Pos[], houseRef: number): FoundYoga[] {
  const p = (g: Graha) => positions.find((x) => x.graha === g)!;
  const moon = p("Moon");
  const found: FoundYoga[] = [];

  if (KENDRA.includes(houseFrom(moon.rashi, p("Jupiter").rashi))) found.push({ key: "gajaKesari", kind: "yoga", grahas: ["Jupiter", "Moon"] });
  if (p("Sun").rashi === p("Mercury").rashi) found.push({ key: "budhaditya", kind: "yoga", grahas: ["Sun", "Mercury"] });
  if (moon.rashi === p("Mars").rashi) found.push({ key: "chandraMangala", kind: "yoga", grahas: ["Moon", "Mars"] });

  for (const [g, key] of MAHAPURUSHA) {
    const x = p(g);
    if ((x.dignity === "own" || x.dignity === "exalted") && KENDRA.includes(houseFrom(houseRef, x.rashi))) found.push({ key, kind: "yoga", grahas: [g] });
  }

  if ([1, 2, 4, 7, 8, 12].includes(houseFrom(houseRef, p("Mars").rashi))) found.push({ key: "mangalDosha", kind: "dosha", grahas: ["Mars"] });

  // Kemadruma: no planet (other than the Sun and nodes) with, or on either side of, the Moon.
  const others = positions.filter((x) => !["Moon", "Sun", "Rahu", "Ketu"].includes(x.graha));
  if (!others.some((x) => [1, 2, 12].includes(houseFrom(moon.rashi, x.rashi)))) found.push({ key: "kemadruma", kind: "dosha", grahas: ["Moon"] });

  // Kaal Sarp: all seven planets on one side of the Rahu–Ketu axis.
  const rahu = p("Rahu").longitude;
  const seven = positions.filter((x) => x.graha !== "Rahu" && x.graha !== "Ketu");
  const arc = seven.map((x) => norm(x.longitude - rahu));
  if (arc.every((a) => a < 180) || arc.every((a) => a > 180)) found.push({ key: "kaalSarp", kind: "dosha", grahas: ["Rahu", "Ketu"] });

  return found;
}
