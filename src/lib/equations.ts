export type Equation = {
  id: number;
  text: string;
  answer: number;
};

const rand = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

// All generators below return equations whose answer is in [0, 9] so the
// recognizer only ever has to read a single digit.

// Tier 1 (0-2): warm-up. Tiny add/sub.
function makeWarmup(id: number): Equation {
  if (Math.random() < 0.55) {
    const a = rand(1, 5);
    const b = rand(1, 9 - a);
    return { id, text: `${a}+${b}=`, answer: a + b };
  }
  const a = rand(3, 9);
  const b = rand(1, a);
  return { id, text: `${a}-${b}=`, answer: a - b };
}

// Tier 2 (3-5): wider single-digit add/sub, still 0..9 result.
function makeEasyAddSub(id: number): Equation {
  if (Math.random() < 0.5) {
    const sum = rand(2, 9);
    const a = rand(1, sum - 1);
    const b = sum - a;
    return { id, text: `${a}+${b}=`, answer: sum };
  }
  const a = rand(2, 9);
  const b = rand(0, a);
  return { id, text: `${a}-${b}=`, answer: a - b };
}

// Tier 3 (6-9): introduce small multiplication tables that fit in 0..9.
function makeBasicMixed(id: number): Equation {
  if (Math.random() < 0.4) {
    const pairs: Array<[number, number]> = [
      [2, 2],
      [2, 3],
      [3, 2],
      [2, 4],
      [4, 2],
      [3, 3],
      [1, 5],
      [5, 1],
      [1, 7],
      [7, 1],
      [1, 9],
      [9, 1],
      [1, 8],
      [8, 1],
    ];
    const [a, b] = pairs[rand(0, pairs.length - 1)];
    return { id, text: `${a}×${b}=`, answer: a * b };
  }
  return makeEasyAddSub(id);
}

// Tier 4 (10-14): two-digit operands but the answer is still 0..9 — these
// force borrowing in your head (e.g. 23 - 17 = 6).
function makeHarderSingle(id: number): Equation {
  const r = Math.random();
  if (r < 0.55) {
    const ans = rand(0, 9);
    const a = rand(10, 35);
    const b = a - ans;
    return { id, text: `${a}-${b}=`, answer: ans };
  }
  if (r < 0.85) {
    return makeBasicMixed(id);
  }
  return makeEasyAddSub(id);
}

// Tier 5+: additive chains. Each step keeps the running value in [0..9] so
// the final answer is also 0..9.
function makeChain(operandCount: number, id: number): Equation {
  let value = rand(2, 9);
  let text = String(value);
  for (let i = 1; i < operandCount; i++) {
    type C = { op: "+" | "-"; operand: number; next: number };
    const cs: C[] = [];
    for (const op of ["+", "-"] as const) {
      for (let n = 1; n <= 9; n++) {
        const next = op === "+" ? value + n : value - n;
        if (next >= 0 && next <= 9) cs.push({ op, operand: n, next });
      }
    }
    if (cs.length === 0) {
      value = Math.max(0, value - 1);
      text += "-1";
    } else {
      const c = cs[rand(0, cs.length - 1)];
      value = c.next;
      text += `${c.op}${c.operand}`;
    }
  }
  return { id, text: `${text}=`, answer: value };
}

// Score-driven ramp; every tier still resolves to a single digit.
//
//   0..2   warm-up                       (single-digit add/sub, small)
//   3..5   easy                          (full single-digit add/sub)
//   6..9   + small ×                     (multiplication that fits in 0..9)
//   10..14 + 2-digit operand subtraction (e.g. 23 - 17 = 6)
//   15..21 3-term + / - chains (clamped) (3+5-2 = 6)
//   22+    4-term + / - chains (clamped) (7+5-9+1 = 4)
export function makeEquation(id: number): Equation {
  if (id < 3) return makeWarmup(id);
  if (id < 6) return makeEasyAddSub(id);
  if (id < 10) return makeBasicMixed(id);
  if (id < 15) return makeHarderSingle(id);
  if (id < 22) return makeChain(3, id);
  return makeChain(4, id);
}

export function makeEquations(count: number): Equation[] {
  return Array.from({ length: count }, (_, i) => makeEquation(i));
}
