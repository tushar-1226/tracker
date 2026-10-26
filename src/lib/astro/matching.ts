/** Ashtakoota Guna Milan (36 points) and Manglik check. Pure: no ephemeris here. */
import { type Graha, RASHIS, norm } from "./constants";

/** What matching needs from a person's chart. */
export type MatchPerson = {
  /** Sidereal Moon longitude, 0–360. */
  moonLongitude: number;
  /** Mars's house from the Lagna, or from the Moon when birth time is unknown. */
  marsHouse: number;
};

export type KootaKey = "varna" | "vashya" | "tara" | "yoni" | "maitri" | "gana" | "bhakoot" | "nadi";
export type Koota = { key: KootaKey; score: number; max: number; note: string };
export type Verdict = "excellent" | "good" | "average" | "low";

export type Match = {
  total: number;
  max: 36;
  verdict: Verdict;
  kootas: Koota[];
  /** Nadi or Bhakoot at zero: the two classical doshas most weighed in a match. */
  doshas: ("nadi" | "bhakoot")[];
  manglik: { groom: boolean; bride: boolean; balanced: boolean };
};

const rashiOfLon = (lon: number) => Math.floor(norm(lon) / 30);
const nakshatraOfLon = (lon: number) => Math.floor(norm(lon) / (360 / 27));

// ── Varna (1) — by Moon sign ────────────────────────────────────────────────
const VARNA_RANK = [2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3]; // Shudra 0 · Vaishya 1 · Kshatriya 2 · Brahmin 3
export const VARNA_NAMES = ["Shudra", "Vaishya", "Kshatriya", "Brahmin"] as const;

// ── Vashya (2) — by Moon sign (Dhanu and Makara split at 15°) ───────────────
export const VASHYA_NAMES = ["Chatushpada", "Manava", "Jalachara", "Vanachara", "Keeta"] as const;
// Rows: groom, columns: bride, in VASHYA_NAMES order.
const VASHYA_TABLE = [
  [2, 1, 1, 0.5, 1],
  [1, 2, 0.5, 0, 1],
  [1, 0.5, 2, 1, 1],
  [0, 0, 0, 2, 0],
  [1, 1, 1, 0, 2],
];
export function vashyaOf(moonLon: number) {
  const r = rashiOfLon(moonLon);
  const firstHalf = norm(moonLon) % 30 < 15;
  switch (r) {
    case 0:
    case 1:
      return 0;
    case 2:
    case 5:
    case 6:
    case 10:
      return 1;
    case 3:
    case 11:
      return 2;
    case 4:
      return 3;
    case 7:
      return 4;
    case 8:
      return firstHalf ? 1 : 0;
    default:
      return firstHalf ? 0 : 2; // Makara
  }
}

// ── Yoni (4) — by nakshatra ─────────────────────────────────────────────────
export const YONI_NAMES = ["Horse", "Elephant", "Sheep", "Serpent", "Dog", "Cat", "Rat", "Cow", "Buffalo", "Tiger", "Deer", "Monkey", "Mongoose", "Lion"] as const;
const NAK_YONI = [0, 1, 2, 3, 3, 4, 5, 2, 5, 6, 6, 7, 8, 9, 8, 9, 10, 10, 4, 11, 12, 11, 13, 0, 13, 7, 1];
const YONI_TABLE = [
  [4, 2, 2, 3, 2, 2, 2, 1, 0, 1, 3, 3, 2, 1],
  [2, 4, 3, 3, 2, 2, 2, 2, 3, 1, 2, 3, 2, 0],
  [2, 3, 4, 2, 1, 2, 1, 3, 3, 1, 2, 0, 3, 1],
  [3, 3, 2, 4, 2, 1, 1, 1, 1, 2, 2, 2, 0, 2],
  [2, 2, 1, 2, 4, 2, 1, 2, 2, 1, 0, 2, 1, 1],
  [2, 2, 2, 1, 2, 4, 0, 2, 2, 1, 3, 3, 2, 1],
  [2, 2, 1, 1, 1, 0, 4, 2, 2, 2, 2, 2, 1, 2],
  [1, 2, 3, 1, 2, 2, 2, 4, 3, 0, 3, 2, 2, 1],
  [0, 3, 3, 1, 2, 2, 2, 3, 4, 1, 2, 2, 2, 1],
  [1, 1, 1, 2, 1, 1, 2, 0, 1, 4, 1, 1, 2, 1],
  [3, 2, 2, 2, 0, 3, 2, 3, 2, 1, 4, 2, 2, 1],
  [3, 3, 0, 2, 2, 3, 2, 2, 2, 1, 2, 4, 3, 2],
  [2, 2, 3, 0, 1, 2, 1, 2, 2, 2, 2, 3, 4, 2],
  [1, 0, 1, 2, 1, 1, 2, 1, 1, 1, 1, 2, 2, 4],
];
export const yoniTable = YONI_TABLE;

// ── Graha Maitri (5) — friendship of the Moon-sign lords ────────────────────
type Rel = "friend" | "neutral" | "enemy";
const FRIENDS: Record<string, { friends: Graha[]; enemies: Graha[] }> = {
  Sun: { friends: ["Moon", "Mars", "Jupiter"], enemies: ["Venus", "Saturn"] },
  Moon: { friends: ["Sun", "Mercury"], enemies: [] },
  Mars: { friends: ["Sun", "Moon", "Jupiter"], enemies: ["Mercury"] },
  Mercury: { friends: ["Sun", "Venus"], enemies: ["Moon"] },
  Jupiter: { friends: ["Sun", "Moon", "Mars"], enemies: ["Mercury", "Venus"] },
  Venus: { friends: ["Mercury", "Saturn"], enemies: ["Sun", "Moon"] },
  Saturn: { friends: ["Mercury", "Venus"], enemies: ["Sun", "Moon", "Mars"] },
};
const rel = (a: string, b: string): Rel => (FRIENDS[a].friends.includes(b as Graha) ? "friend" : FRIENDS[a].enemies.includes(b as Graha) ? "enemy" : "neutral");
export function maitriScore(lordA: string, lordB: string) {
  if (lordA === lordB) return 5;
  const pair = [rel(lordA, lordB), rel(lordB, lordA)].sort().join("+");
  return ({ "friend+friend": 5, "friend+neutral": 4, "neutral+neutral": 3, "enemy+friend": 1, "enemy+neutral": 0.5, "enemy+enemy": 0 } as Record<string, number>)[pair];
}

// ── Gana (6) — by nakshatra ─────────────────────────────────────────────────
export const GANA_NAMES = ["Deva", "Manushya", "Rakshasa"] as const;
const NAK_GANA = [0, 1, 2, 1, 0, 1, 0, 0, 2, 2, 1, 1, 0, 2, 0, 2, 0, 2, 2, 1, 1, 0, 2, 2, 1, 1, 0];
// Rows: groom, columns: bride.
const GANA_TABLE = [
  [6, 6, 1],
  [5, 6, 0],
  [0, 0, 6],
];

// ── Nadi (8) — by nakshatra ─────────────────────────────────────────────────
export const NADI_NAMES = ["Adi", "Madhya", "Antya"] as const;
const nadiOf = (nak: number) => [0, 1, 2, 2, 1, 0][nak % 6];

const moonLord = (lon: number) => RASHIS[rashiOfLon(lon)].lord;

export function verdictFor(total: number): Verdict {
  return total >= 33 ? "excellent" : total >= 25 ? "good" : total >= 18 ? "average" : "low";
}

const isManglik = (house: number) => [1, 2, 4, 7, 8, 12].includes(house);

/**
 * Classical matching. `groom` and `bride` set the direction of the koota rules that have one
 * (Varna, Vashya, Tara, Gana); the total is not symmetric by tradition.
 */
export function guna(groom: MatchPerson, bride: MatchPerson): Match {
  const gNak = nakshatraOfLon(groom.moonLongitude);
  const bNak = nakshatraOfLon(bride.moonLongitude);
  const gRashi = rashiOfLon(groom.moonLongitude);
  const bRashi = rashiOfLon(bride.moonLongitude);
  const kootas: Koota[] = [];

  // Varna
  const gv = VARNA_RANK[gRashi];
  const bv = VARNA_RANK[bRashi];
  kootas.push({ key: "varna", max: 1, score: gv >= bv ? 1 : 0, note: `${VARNA_NAMES[gv]} · ${VARNA_NAMES[bv]}` });

  // Vashya
  const gva = vashyaOf(groom.moonLongitude);
  const bva = vashyaOf(bride.moonLongitude);
  kootas.push({ key: "vashya", max: 2, score: VASHYA_TABLE[gva][bva], note: `${VASHYA_NAMES[gva]} · ${VASHYA_NAMES[bva]}` });

  // Tara: count each nakshatra from the other; 3rd, 5th and 7th (remainder mod 9) are inauspicious.
  const badTara = (from: number, to: number) => [3, 5, 7].includes((((to - from + 27) % 27) + 1) % 9);
  const taraBad = Number(badTara(bNak, gNak)) + Number(badTara(gNak, bNak));
  kootas.push({ key: "tara", max: 3, score: 3 - taraBad * 1.5, note: taraBad === 0 ? "Both counts favourable" : taraBad === 1 ? "One count unfavourable" : "Both counts unfavourable" });

  // Yoni
  const gy = NAK_YONI[gNak];
  const by = NAK_YONI[bNak];
  kootas.push({ key: "yoni", max: 4, score: YONI_TABLE[gy][by], note: `${YONI_NAMES[gy]} · ${YONI_NAMES[by]}` });

  // Graha Maitri
  const gl = moonLord(groom.moonLongitude);
  const bl = moonLord(bride.moonLongitude);
  kootas.push({ key: "maitri", max: 5, score: maitriScore(gl, bl), note: `${gl} · ${bl}` });

  // Gana
  const gg = NAK_GANA[gNak];
  const bg = NAK_GANA[bNak];
  kootas.push({ key: "gana", max: 6, score: GANA_TABLE[gg][bg], note: `${GANA_NAMES[gg]} · ${GANA_NAMES[bg]}` });

  // Bhakoot: 2/12, 5/9 and 6/8 placements of the Moon signs are doshas, softened when the lords are one or mutual friends.
  const d = ((bRashi - gRashi + 12) % 12) + 1;
  const dosha = [2, 12, 5, 9, 6, 8].includes(d);
  const softened = dosha && (gl === bl || (rel(gl, bl) === "friend" && rel(bl, gl) === "friend"));
  kootas.push({
    key: "bhakoot",
    max: 7,
    score: dosha && !softened ? 0 : 7,
    note: !dosha ? `${d}/${((gRashi - bRashi + 12) % 12) + 1} — no dosha` : softened ? `${d}/${((gRashi - bRashi + 12) % 12) + 1} — dosha softened by lords` : `${d}/${((gRashi - bRashi + 12) % 12) + 1} — dosha`,
  });

  // Nadi
  const gn = nadiOf(gNak);
  const bn = nadiOf(bNak);
  kootas.push({ key: "nadi", max: 8, score: gn === bn ? 0 : 8, note: `${NADI_NAMES[gn]} · ${NADI_NAMES[bn]}` });

  const total = kootas.reduce((s, k) => s + k.score, 0);
  const gm = isManglik(groom.marsHouse);
  const bm = isManglik(bride.marsHouse);
  return {
    total,
    max: 36,
    verdict: verdictFor(total),
    kootas,
    doshas: kootas.filter((k) => (k.key === "nadi" || k.key === "bhakoot") && k.score === 0).map((k) => k.key as "nadi" | "bhakoot"),
    manglik: { groom: gm, bride: bm, balanced: gm === bm },
  };
}
