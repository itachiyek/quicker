export type Equation = {
  id: number;
  text: string;
  answer: number;
};

const rand = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

// Standard 2-operand equation. Mix of single- and two-digit results,
// with a smaller share of multiplication.
function makeEquation2(id: number): Equation {
  const ops = ["+", "+", "-", "-", "×"] as const;
  const op = ops[rand(0, ops.length - 1)];

  let a: number;
  let b: number;
  let answer: number;
  let text: string;

  if (op === "+") {
    if (Math.random() < 0.5) {
      a = rand(5, 39);
      b = rand(5, 39);
    } else {
      a = rand(1, 9);
      b = rand(1, 9);
    }
    answer = a + b;
    text = `${a}+${b}`;
  } else if (op === "-") {
    if (Math.random() < 0.4) {
      a = rand(20, 80);
      b = rand(5, 30);
    } else {
      a = rand(2, 19);
      b = rand(1, a);
    }
    answer = a - b;
    text = `${a}-${b}`;
  } else {
    a = rand(2, 9);
    b = rand(2, 9);
    answer = a * b;
    text = `${a}×${b}`;
  }
  return { id, text: `${text}=`, answer };
}

// Build an N-operand additive chain that always stays in 0..99 and uses
// only + and -. Each operand is single-digit so the equation stays
// readable and finger-paintable in the time given.
function makeEquationChain(operandCount: number, id: number): Equation {
  let value = rand(2, 9);
  let text = String(value);

  for (let i = 1; i < operandCount; i++) {
    type Candidate = { op: "+" | "-"; operand: number; next: number };
    const candidates: Candidate[] = [];
    for (let t = 0; t < 40; t++) {
      const op: "+" | "-" = Math.random() < 0.5 ? "+" : "-";
      const operand = rand(1, 9);
      const next = op === "+" ? value + operand : value - operand;
      if (next >= 0 && next <= 99) {
        candidates.push({ op, operand, next });
      }
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

// Build a single equation for the given index in the round. The index
// equals the number of correctly-answered problems so we ramp difficulty
// directly off score: 2 numbers up to 9 correct, 3 numbers up to 19, then
// 4 numbers afterwards.
export function makeEquation(id: number): Equation {
  if (id >= 20) return makeEquationChain(4, id);
  if (id >= 10) return makeEquationChain(3, id);
  return makeEquation2(id);
}

export function makeEquations(count: number): Equation[] {
  return Array.from({ length: count }, (_, i) => makeEquation(i));
}
