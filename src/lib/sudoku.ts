// sudoku.ts
// Deterministic, seed-driven Sudoku generator.
// Same seed (e.g. "2025-05-31") always produces the same puzzle + solution.

export type Grid = number[][]; // 9x9, 0 = empty

const BASE = 3;
const SIDE = BASE * BASE; // 9

// ---------------------------------------------------------------------------
// Seeded PRNG
// ---------------------------------------------------------------------------

// xmur3: turn an arbitrary string into a 32-bit seed generator.
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

// mulberry32: fast PRNG returning a float in [0, 1).
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
  const seedFn = xmur3(seed);
  return mulberry32(seedFn());
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
// Solved grid
// ---------------------------------------------------------------------------

// Build a fully solved grid from a known-valid base pattern, then randomize it
// by shuffling rows-within-bands, bands, cols-within-stacks, stacks, and the
// digit labels. Every one of these transforms preserves validity, so this is
// guaranteed to be a legal solution with no backtracking required.
function generateSolved(rng: () => number): Grid {
  const pattern = (r: number, c: number) =>
    (BASE * (r % BASE) + Math.floor(r / BASE) + c) % SIDE;

  const rows: number[] = [];
  for (const band of shuffle([0, 1, 2], rng)) {
    for (const r of shuffle([0, 1, 2], rng)) rows.push(band * BASE + r);
  }

  const cols: number[] = [];
  for (const stack of shuffle([0, 1, 2], rng)) {
    for (const c of shuffle([0, 1, 2], rng)) cols.push(stack * BASE + c);
  }

  const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], rng);

  return rows.map((r) => cols.map((c) => nums[pattern(r, c)]));
}

// ---------------------------------------------------------------------------
// Solution counting (for uniqueness)
// ---------------------------------------------------------------------------

// Counts solutions, bailing out once `limit` is reached (we only ever care
// whether a puzzle has exactly 1 solution, so limit = 2 is enough).
function countSolutions(grid: Grid, limit = 2): number {
  const g = grid.map((row) => row.slice());
  let count = 0;

  const isValid = (r: number, c: number, n: number): boolean => {
    for (let i = 0; i < SIDE; i++) {
      if (g[r][i] === n || g[i][c] === n) return false;
    }
    const br = Math.floor(r / BASE) * BASE;
    const bc = Math.floor(c / BASE) * BASE;
    for (let i = 0; i < BASE; i++) {
      for (let j = 0; j < BASE; j++) {
        if (g[br + i][bc + j] === n) return false;
      }
    }
    return true;
  };

  const solve = (): void => {
    let r = -1;
    let c = -1;
    outer: for (let i = 0; i < SIDE; i++) {
      for (let j = 0; j < SIDE; j++) {
        if (g[i][j] === 0) {
          r = i;
          c = j;
          break outer;
        }
      }
    }

    if (r === -1) {
      count++; // no empty cell -> a complete solution
      return;
    }

    for (let n = 1; n <= SIDE; n++) {
      if (isValid(r, c, n)) {
        g[r][c] = n;
        solve();
        g[r][c] = 0;
        if (count >= limit) return;
      }
    }
  };

  solve();
  return count;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export type Difficulty = "easy" | "medium" | "hard";

export interface SudokuOptions {
  /** Target number of revealed cells. Overrides `difficulty` if set. */
  clues?: number;
  difficulty?: Difficulty;
}

export interface Sudoku {
  puzzle: Grid;
  solution: Grid;
  seed: string;
  clues: number;
}

const DIFFICULTY_CLUES: Record<Difficulty, number> = {
  easy: 40,
  medium: 32,
  hard: 26,
};

/**
 * Generate a Sudoku puzzle deterministically from a seed string.
 *
 * The same seed always yields the same puzzle and solution. The resulting
 * puzzle is guaranteed to have exactly one solution.
 *
 * @param seed e.g. a date like "2025-05-31"
 */
export function generateSudoku(
  seed: string,
  options: SudokuOptions = {},
): Sudoku {
  const rng = makeRng(seed);
  const solution = generateSolved(rng);
  const puzzle = solution.map((row) => row.slice());

  const targetClues =
    options.clues ?? DIFFICULTY_CLUES[options.difficulty ?? "medium"];
  const cellsToRemove = Math.max(0, SIDE * SIDE - targetClues);

  // Try removing cells in a seed-shuffled order; keep a removal only if the
  // puzzle still has a unique solution afterward.
  const cells = shuffle(
    Array.from({ length: SIDE * SIDE }, (_, i) => i),
    rng,
  );

  let removed = 0;
  for (const cell of cells) {
    if (removed >= cellsToRemove) break;
    const r = Math.floor(cell / SIDE);
    const c = cell % SIDE;
    if (puzzle[r][c] === 0) continue;

    const backup = puzzle[r][c];
    puzzle[r][c] = 0;
    if (countSolutions(puzzle, 2) !== 1) {
      puzzle[r][c] = backup; // removal broke uniqueness -> revert
    } else {
      removed++;
    }
  }

  const clues = puzzle.reduce(
    (acc, row) => acc + row.filter((v) => v !== 0).length,
    0,
  );

  return { puzzle, solution, seed, clues };
}

// ---------------------------------------------------------------------------
// Example
// ---------------------------------------------------------------------------

// const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
// const { puzzle, solution, clues } = generateSudoku(today, { difficulty: "medium" });
// console.log(`Seed ${today} -> ${clues} clues`);
// console.log(puzzle.map((r) => r.join(" ")).join("\n"));
