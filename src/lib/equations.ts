export type Equation = {
  id: number;
  text: string; // includes the trailing "= ?"
  answer: number;
  choices: number[]; // 4 numbers, randomized order, contains answer
};

const rand = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Plausible distractors: small offsets, then an off-by-table neighbour for
// multiplication-shaped answers, then random fillers if we still need any.
function makeChoices(answer: number, op?: "+" | "-" | "×"): number[] {
  const set = new Set<number>([answer]);
  const offsets = [-1, 1, -2, 2, -10, 10, -3, 3];
  for (const off of shuffle(offsets)) {
    const c = answer + off;
    if (c >= 0 && c <= 99) set.add(c);
    if (set.size >= 4) break;
  }

  if (op === "×" && set.size < 4) {
    // sprinkle some "wrong table" looking values
    const candidates = [answer + 7, answer - 7, answer + 9, answer - 9];
    for (const c of shuffle(candidates)) {
      if (c >= 0 && c <= 99) set.add(c);
      if (set.size >= 4) break;
    }
  }

  while (set.size < 4) {
    const c = rand(0, 99);
    if (c !== answer) set.add(c);
  }
  return shuffle([...set]);
}

// ---- Tier generators (return raw text + answer + op) ------------------

type Raw = { text: string; answer: number; op?: "+" | "-" | "×" };

function warmup(): Raw {
  if (Math.random() < 0.55) {
    const a = rand(1, 5);
    const b = rand(1, 9 - a);
    return { text: `${a} + ${b}`, answer: a + b, op: "+" };
  }
  const a = rand(3, 9);
  const b = rand(1, a);
  return { text: `${a} − ${b}`, answer: a - b, op: "-" };
}

function easyAddSub(): Raw {
  if (Math.random() < 0.5) {
    const a = rand(2, 9);
    const b = rand(2, 9);
    return { text: `${a} + ${b}`, answer: a + b, op: "+" };
  }
  const a = rand(8, 18);
  const b = rand(1, a);
  return { text: `${a} − ${b}`, answer: a - b, op: "-" };
}

function basicMul(): Raw {
  const a = rand(2, 5);
  const b = rand(2, 5);
  return { text: `${a} × ${b}`, answer: a * b, op: "×" };
}

function fullMul(): Raw {
  const a = rand(2, 9);
  const b = rand(2, 9);
  return { text: `${a} × ${b}`, answer: a * b, op: "×" };
}

function biggerAddSub(): Raw {
  if (Math.random() < 0.5) {
    const a = rand(10, 49);
    const b = rand(5, 50);
    const sum = a + b;
    if (sum > 99) {
      // back off into safe range
      const x = rand(10, 49);
      const y = rand(5, 99 - x);
      return { text: `${x} + ${y}`, answer: x + y, op: "+" };
    }
    return { text: `${a} + ${b}`, answer: sum, op: "+" };
  }
  const a = rand(20, 90);
  const b = rand(5, a - 1);
  return { text: `${a} − ${b}`, answer: a - b, op: "-" };
}

function chain(operandCount: number): Raw {
  let value = rand(2, 9);
  let text = String(value);
  for (let i = 1; i < operandCount; i++) {
    type C = { op: "+" | "−"; n: number; next: number };
    const cs: C[] = [];
    for (let n = 1; n <= 9; n++) {
      const upPlus = value + n;
      if (upPlus <= 99) cs.push({ op: "+", n, next: upPlus });
      const upMinus = value - n;
      if (upMinus >= 0) cs.push({ op: "−", n, next: upMinus });
    }
    const c = cs[rand(0, cs.length - 1)];
    value = c.next;
    text += ` ${c.op} ${c.n}`;
  }
  return { text, answer: value, op: "+" };
}

// Score-driven ramp.
//
//   0..2   warm-up                  (a+b ≤ 9, single-digit)
//   3..7   easy add/sub             (results up to ~18)
//   8..12  + multiplication tables  (full 2x..9x, results up to 81)
//   13..17 + 2-digit add/sub        (operands 10..90, result 0..99)
//   18..23 3-term + / − chain
//   24+    4-term + / − chain
export function makeEquation(id: number): Equation {
  let raw: Raw;
  if (id < 3) raw = warmup();
  else if (id < 8) raw = easyAddSub();
  else if (id < 13) raw = Math.random() < 0.6 ? basicMul() : easyAddSub();
  else if (id < 18) raw = Math.random() < 0.5 ? fullMul() : biggerAddSub();
  else if (id < 24) raw = Math.random() < 0.7 ? chain(3) : biggerAddSub();
  else raw = chain(4);

  return {
    id,
    text: `${raw.text} = ?`,
    answer: raw.answer,
    choices: makeChoices(raw.answer, raw.op),
  };
}

export function makeEquations(count: number): Equation[] {
  return Array.from({ length: count }, (_, i) => makeEquation(i));
}
