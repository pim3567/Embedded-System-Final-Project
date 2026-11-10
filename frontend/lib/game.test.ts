import { test } from "node:test";
import assert from "node:assert/strict";
import { COLORS, createGame, DIFFICULTIES, makeRound, selectTarget, tick, TOTAL_ROUNDS } from "./game.ts";

test("each round has six unique inks, six unique words, no matching words, and exactly one answer", () => {
  for (let i = 0; i < 200; i++) {
    const round = makeRound();
    assert.equal(new Set(round.targets.map((target) => target.color.id)).size, COLORS.length);
    assert.equal(new Set(round.targets.map((target) => target.word)).size, COLORS.length);
    assert.ok(round.targets.every((target) => target.word !== target.color.label));
    assert.equal(round.targets.filter((target) => target.color.id === round.cue.id).length, 1);
  }
});

test("selection uses ink, not word, and cannot score twice during feedback", () => {
  const base = { ...createGame(), status: "playing" as const };
  const correct = base.targets.find((target) => target.color.id === base.cue.id)!;
  const result = selectTarget({ ...base, player: { x: correct.x, y: correct.y } });
  assert.equal(result.score, 150);
  assert.equal(result.correct, 1);
  assert.equal(selectTarget(result), result);
  const trap = base.targets.find((target) => target.word === base.cue.label)!;
  const wrong = selectTarget({ ...base, player: { x: trap.x, y: trap.y } });
  assert.equal(wrong.score, 0);
  assert.equal(wrong.lives, 2);
});

test("empty-space selections do nothing; timeout costs one life and resets the next round", () => {
  const base = { ...createGame(), status: "playing" as const };
  assert.equal(selectTarget(base), base);
  const expired = tick(base, DIFFICULTIES.classic + 1, 0, 0);
  assert.equal(expired.remaining, 0);
  assert.equal(expired.feedback, "timeout");
  assert.equal(expired.lives, 2);
  const next = tick(expired, 2, 0, 0);
  assert.equal(next.round, 2);
  assert.equal(next.remaining, DIFFICULTIES.classic);
  assert.deepEqual(next.player, { x: 450, y: 300 });
});

test("movement stays inside the board and diagonal speed equals straight speed", () => {
  const base = { ...createGame(), status: "playing" as const };
  const straight = tick(base, 0.1, 1, 0);
  const diagonal = tick(base, 0.1, 1, 1);
  assert.ok(Math.abs(Math.hypot(diagonal.player.x - 450, diagonal.player.y - 300) - (straight.player.x - 450)) < 0.001);
  const edge = tick({ ...base, player: { x: 870, y: 570 } }, 1, 1, 1);
  assert.ok(edge.player.x <= 871 && edge.player.y <= 571);
});

test("the tenth round and the last life both finish the game", () => {
  for (const overrides of [{ round: TOTAL_ROUNDS, lives: 3 }, { round: 3, lives: 1 }]) {
    const base = { ...createGame(), ...overrides, status: "playing" as const };
    const expired = tick(base, 20, 0, 0);
    assert.equal(tick(expired, 2, 0, 0).status, "finished");
  }
});
