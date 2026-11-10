export const COLORS = [
  { id: "red", label: "RED", hex: "#e4464e" },
  { id: "green", label: "GREEN", hex: "#18834e" },
  { id: "blue", label: "BLUE", hex: "#3569e8" },
  { id: "purple", label: "PURPLE", hex: "#9c4acb" },
  { id: "yellow", label: "YELLOW", hex: "#bc8500" },
  { id: "cyan", label: "CYAN", hex: "#008ca1" },
] as const;

export type Color = (typeof COLORS)[number];
export type Target = { x: number; y: number; color: Color; word: string };
export const WIDTH = 900;
export const HEIGHT = 600;
export const TARGET_WIDTH = 184;
export const TARGET_HEIGHT = 100;
export const PLAYER_RADIUS = 17;
export const TOTAL_ROUNDS = 10;
export const DIFFICULTIES = { chill: 10, classic: 7, rush: 4 } as const;
export type Difficulty = keyof typeof DIFFICULTIES;
export type Game = {
  status: "idle" | "playing" | "feedback" | "finished";
  difficulty: Difficulty;
  round: number;
  score: number;
  lives: number;
  correct: number;
  remaining: number;
  feedbackRemaining: number;
  feedback: "correct" | "wrong" | "timeout" | null;
  lastPoints: number;
  player: { x: number; y: number };
  cue: Color;
  targets: Target[];
};

function shuffle<T>(items: readonly T[], rng: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function makeRound(rng: () => number = Math.random) {
  const inks = shuffle(COLORS, rng);
  // A non-zero cyclic shift guarantees that every word conflicts with its ink.
  const shift = 1 + Math.floor(rng() * (COLORS.length - 1));
  const positions = [
    [175, 143], [450, 143], [725, 143],
    [175, 457], [450, 457], [725, 457],
  ];
  return {
    cue: inks[Math.floor(rng() * inks.length)],
    targets: positions.map(([x, y], i) => ({
      x, y, color: inks[i], word: inks[(i + shift) % inks.length].label,
    })),
  };
}

export function createGame(difficulty: Difficulty = "classic", rng: () => number = Math.random): Game {
  return {
    status: "idle", difficulty, round: 1, score: 0, lives: 3, correct: 0,
    remaining: DIFFICULTIES[difficulty], feedbackRemaining: 0, feedback: null,
    lastPoints: 0, player: { x: WIDTH / 2, y: HEIGHT / 2 }, ...makeRound(rng),
  };
}

export function activeTarget(game: Game): number {
  return game.targets.findIndex((target) =>
    Math.abs(game.player.x - target.x) <= TARGET_WIDTH / 2 + PLAYER_RADIUS &&
    Math.abs(game.player.y - target.y) <= TARGET_HEIGHT / 2 + PLAYER_RADIUS,
  );
}

function resolveRound(game: Game, feedback: "correct" | "wrong" | "timeout"): Game {
  const correct = feedback === "correct";
  const points = correct ? 100 + Math.round(50 * game.remaining / DIFFICULTIES[game.difficulty]) : 0;
  return {
    ...game, status: "feedback", feedback, feedbackRemaining: 1.1,
    lastPoints: points, score: game.score + points,
    correct: game.correct + Number(correct), lives: game.lives - Number(!correct),
  };
}

export function selectTarget(game: Game): Game {
  if (game.status !== "playing") return game;
  const index = activeTarget(game);
  if (index < 0) return game;
  return resolveRound(game, game.targets[index].color.id === game.cue.id ? "correct" : "wrong");
}

export function movePlayer(game: Game, dx: number, dy: number, distance: number): Game {
  if (game.status !== "playing") return game;
  const length = Math.hypot(dx, dy) || 1;
  return {
    ...game,
    player: {
      x: Math.min(WIDTH - PLAYER_RADIUS - 12, Math.max(PLAYER_RADIUS + 12, game.player.x + dx / length * distance)),
      y: Math.min(HEIGHT - PLAYER_RADIUS - 12, Math.max(PLAYER_RADIUS + 12, game.player.y + dy / length * distance)),
    },
  };
}

export function tick(game: Game, elapsed: number, dx: number, dy: number, rng: () => number = Math.random): Game {
  if (game.status === "feedback") {
    const feedbackRemaining = game.feedbackRemaining - elapsed;
    if (feedbackRemaining > 0) return { ...game, feedbackRemaining };
    if (game.round >= TOTAL_ROUNDS || game.lives <= 0) return { ...game, status: "finished" };
    return {
      ...game, ...makeRound(rng), round: game.round + 1, status: "playing",
      player: { x: WIDTH / 2, y: HEIGHT / 2 }, remaining: DIFFICULTIES[game.difficulty],
      feedback: null, feedbackRemaining: 0,
    };
  }
  if (game.status !== "playing") return game;
  const remaining = Math.max(0, game.remaining - elapsed);
  if (remaining === 0) return resolveRound({ ...game, remaining }, "timeout");
  return movePlayer({ ...game, remaining }, dx, dy, 290 * elapsed);
}
