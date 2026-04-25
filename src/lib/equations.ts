export type Equation = {
  id: number;
  text: string;
  answer: number;
};

const rand = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

// Tier 1 (0-2): warm-up. Single-digit add/sub with single-digit result.
// 2+3, 5-1, 7-4 — barely-think problems.
function makeWarmup(id: number): Equation {
  if (Math.random() < 0.55) {
    const a = rand(1, 5);
    const b = rand(1, 9 - a);
    return { id, text: `${a}+${b}=`, answer: a + b };
  }
  const a = rand(3, 9);
  const b = rand(1, a - 1);
  return { id, text: `${a}-${b}=`, answer: a - b };
}

// Tier 2 (3-5): single-digit + and -, two-digit results OK.
// 7+8=15, 12-7=5
function makeEasyAddSub(id: number): Equation {
  if (Math.random() < 0.55) {
    const a = rand(2, 9);
    const b = rand(2, 9);
    return { id, text: `${a}+${b}=`, answer: a + b };
  }
  const a = rand(8, 18);
  const b = rand(1, a);
  return { id, text: `${a}-${b}=`, answer: a - b };
}

// Tier 3 (6-9): introduce small multiplication tables (2×2 - 5×5).
function makeBasicMixed(id: number): Equation {
  const r = Math.random();
  if (r < 0.45) {
    const a = rand(2, 5);
    const b = rand(2, 5);
    return { id, text: `${a}×${b}=`, answer: a * b };
  }
  return makeEasyAddSub(id);
}

// Tier 4 (10-14): two-digit operands and the full multiplication tables.
function makeHarder2Op(id: number): Equation {
  const r = Math.random();
  if (r < 0.35) {
    // 2-digit add/sub
    if (Math.random() < 0.5) {
      const a = rand(10, 49);
      const b = rand(5, Math.min(50, 99 - a));
      return { id, text: `${a}+${b}=`, answer: a + b };
    }
    const big = rand(20, 80);
    const small = rand(5, big - 1);
    return { id, text: `${big}-${small}=`, answer: big - small };
  }
  if (r < 0.7) {
    const a = rand(2, 9);
    const b = rand(2, 9);
    return { id, text: `${a}×${b}=`, answer: a * b };
  }
  return makeEasyAddSub(id);
}

// Build an N-operand additive chain that stays in 0..99.
function makeChain(operandCount: number, id: number): Equation {
  let value = rand(2, 9);
  let text = String(value);
  for (let i = 1; i < operandCount; i++) {
    type Candidate = { op: "+" | "-"; operand: number; next: number };
    const candidates: Candidate[] = [];
    for (let t = 0; t < 40; t++) {
      const op: "+" | "-" = Math.random() < 0.5 ? "+" : "-";
      const operand = rand(1, 9);
      const next = op === "+" ? value + operand : value - operand;
      if (next >= 0 && next <= 99) candidates.push({ op, operand, next });
    }
    if (candidates.length === 0) {
      value += 1;
      text += "+1";
    } else {
      const c = candidates[rand(0, candidates.length - 1)];
      value = c.next;
      text += `${c.op}${c.operand}`;
    }
  }
  return { id, text: `${text}=`, answer: value };
}

// Score-driven ramp. The pool index equals the number of correct answers,
// so problem N becomes available exactly when the player has earned it.
//
//   0..2   warm-up   (single-digit, single-digit ans)
//   3..5   easy      (single-digit, two-digit ans)
//   6..9   mixed     (small × tables)
//   10..14 harder    (full × tables, 2-digit operands)
//   15..21 chains    (3-term + / -)
//   22+    long      (4-term + / -)
export function makeEquation(id: number): Equation {
  if (id < 3) return makeWarmup(id);
  if (id < 6) return makeEasyAddSub(id);
  if (id < 10) return makeBasicMixed(id);
  if (id < 15) return makeHarder2Op(id);
  if (id < 22) return makeChain(3, id);
  return makeChain(4, id);
}

export function makeEquations(count: number): Equation[] {
  return Array.from({ length: count }, (_, i) => makeEquation(i));
}
