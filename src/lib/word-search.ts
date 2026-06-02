// wordsearch.ts
// Deterministic, seed-driven word search generator.
// Same seed + same word list always produces the same grid.

export type Grid = string[][]; // rows of single uppercase letters

// ---------------------------------------------------------------------------
// Seeded PRNG  (identical to the sudoku module, so behavior is consistent)
// ---------------------------------------------------------------------------

function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeRng(seed: string): () => number {
  return mulberry32(xmur3(seed)());
}

function shuffle<T>(arr: readonly T[], rng: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------------------------------------------------------------------------
// Directions
// ---------------------------------------------------------------------------

// dr/dc steps. The 8 compass directions; we filter these by options.
interface Dir {
  dr: number;
  dc: number;
  diagonal: boolean;
  backward: boolean; // points left or up
}

const ALL_DIRECTIONS: Dir[] = [
  { dr: 0, dc: 1, diagonal: false, backward: false }, // E
  { dr: 1, dc: 0, diagonal: false, backward: false }, // S
  { dr: 1, dc: 1, diagonal: true, backward: false }, // SE
  { dr: 1, dc: -1, diagonal: true, backward: true }, // SW
  { dr: 0, dc: -1, diagonal: false, backward: true }, // W
  { dr: -1, dc: 0, diagonal: false, backward: true }, // N
  { dr: -1, dc: -1, diagonal: true, backward: true }, // NW
  { dr: -1, dc: 1, diagonal: true, backward: true }, // NE
];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export interface WordSearchOptions {
  /** Number of rows. Defaults to `size`, else max(longest word, 10). */
  rows?: number;
  /** Number of columns. Defaults to `size`, else max(longest word, 10). */
  cols?: number;
  /** Shorthand that sets both rows and cols when neither is given. */
  size?: number;
  /** Allow diagonal placements. Default true. */
  allowDiagonal?: boolean;
  /** Allow words running right-to-left / bottom-to-top. Default true. */
  allowBackward?: boolean;
  /**
   * Fill empty cells using only letters that appear in the word list (makes
   * the puzzle harder) instead of the full alphabet. Default false.
   */
  fillFromWordLetters?: boolean;
}

export interface Placement {
  word: string; // normalized (uppercase, letters only)
  row: number; // start row
  col: number; // start col
  dr: number; // row step
  dc: number; // col step
  cells: Array<{ row: number; col: number }>; // every cell the word occupies
}

export interface WordSearch {
  grid: Grid;
  rows: number;
  cols: number;
  seed: string;
  placements: Placement[]; // successfully placed words, with coordinates
  unplaced: string[]; // words that did not fit
}

function normalize(word: string): string {
  return word.toUpperCase().replace(/[^A-Z]/g, "");
}

/**
 * Generate a word search deterministically from a seed string.
 *
 * The same seed + same word list always yields the same grid. Words are
 * placed longest-first for better packing; any that cannot fit are returned
 * in `unplaced` rather than throwing.
 *
 * @param words list of words to hide
 * @param seed  e.g. a date like "2025-05-31"
 */
export function generateWordSearch(
  words: readonly string[],
  seed: string,
  options: WordSearchOptions = {},
): WordSearch {
  const rng = makeRng(seed);

  // Normalize, drop empties, de-duplicate (keep first occurrence order).
  const seen = new Set<string>();
  const cleaned: string[] = [];
  for (const raw of words) {
    const w = normalize(raw);
    if (w.length > 0 && !seen.has(w)) {
      seen.add(w);
      cleaned.push(w);
    }
  }

  const longest = cleaned.reduce((m, w) => Math.max(m, w.length), 0);
  const fallback = Math.max(options.size ?? 0, longest, 10);
  const rows = Math.max(options.rows ?? options.size ?? fallback, 1);
  const cols = Math.max(options.cols ?? options.size ?? fallback, 1);

  // Place longest words first — they're the hardest to fit. Sort is a pure
  // function of the word list, so determinism is preserved. Tie-break
  // alphabetically so equal-length words have a stable order regardless of
  // input ordering.
  const ordered = cleaned
    .slice()
    .sort((a, b) => b.length - a.length || (a < b ? -1 : a > b ? 1 : 0));

  const allowDiagonal = options.allowDiagonal ?? true;
  const allowBackward = options.allowBackward ?? true;
  const dirs = ALL_DIRECTIONS.filter(
    (d) => (allowDiagonal || !d.diagonal) && (allowBackward || !d.backward),
  );

  // null = empty cell.
  const grid: (string | null)[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => null),
  );

  const fits = (word: string, r0: number, c0: number, d: Dir): boolean => {
    for (let i = 0; i < word.length; i++) {
      const r = r0 + d.dr * i;
      const c = c0 + d.dc * i;
      if (r < 0 || r >= rows || c < 0 || c >= cols) return false;
      const existing = grid[r][c];
      if (existing !== null && existing !== word[i]) return false; // conflict
    }
    return true;
  };

  const place = (word: string, r0: number, c0: number, d: Dir): Placement => {
    const cells: Array<{ row: number; col: number }> = [];
    for (let i = 0; i < word.length; i++) {
      const r = r0 + d.dr * i;
      const c = c0 + d.dc * i;
      grid[r][c] = word[i];
      cells.push({ row: r, col: c });
    }
    return { word, row: r0, col: c0, dr: d.dr, dc: d.dc, cells };
  };

  const placements: Placement[] = [];
  const unplaced: string[] = [];

  for (const word of ordered) {
    // Build every (start cell x direction) candidate, shuffle deterministically,
    // and take the first that fits. Trying all candidates (rather than random
    // retries with a cap) maximizes the chance of placement while staying
    // deterministic.
    const candidates: Array<{ r: number; c: number; d: Dir }> = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        for (const d of dirs) candidates.push({ r, c, d });
      }
    }

    let placed = false;
    for (const { r, c, d } of shuffle(candidates, rng)) {
      if (fits(word, r, c, d)) {
        placements.push(place(word, r, c, d));
        placed = true;
        break;
      }
    }
    if (!placed) unplaced.push(word);
  }

  // Choose the fill alphabet.
  let fillPool = ALPHABET;
  if (options.fillFromWordLetters) {
    const letters = new Set<string>();
    for (const w of cleaned) for (const ch of w) letters.add(ch);
    fillPool = [...letters].sort().join("") || ALPHABET;
  }

  // Fill remaining cells in row-major order, drawing from the seeded stream.
  const finalGrid: Grid = grid.map((row) =>
    row.map((cell) =>
      cell !== null ? cell : fillPool[Math.floor(rng() * fillPool.length)],
    ),
  );

  return { grid: finalGrid, rows, cols, seed, placements, unplaced };
}

// ---------------------------------------------------------------------------
// Example
// ---------------------------------------------------------------------------

// const { grid, placements, unplaced } = generateWordSearch(
//   ["typescript", "react", "sudoku", "fediverse", "retro"],
//   "2025-05-31",
//   { rows: 10, cols: 15 },
// );
// console.log(grid.map((r) => r.join(" ")).join("\n"));
// console.log("placed:", placements.map((p) => p.word));
// if (unplaced.length) console.log("could not fit:", unplaced);
