export type Equation = {
  id: number;
  text: string; // includes the trailing "= "
  answer: number;
};

const rand = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

type Raw = { text: string; answer: number };

function warmup(): Raw {
  if (Math.random() < 0.55) {
    const a = rand(1, 5);
    const b = rand(1, 9 - a);
    return { text: `${a}+${b}`, answer: a + b };
  }
  const a = rand(3, 9);
  const b = rand(1, a);
  return { text: `${a}-${b}`, answer: a - b };
}

function easyAddSub(): Raw {
  if (Math.random() < 0.5) {
    const a = rand(2, 9);
    const b = rand(2, 9);
    return { text: `${a}+${b}`, answer: a + b };
  }
  const a = rand(8, 18);
  const b = rand(1, a);
  return { text: `${a}-${b}`, answer: a - b };
}

function basicMul(): Raw {
  const a = rand(2, 5);
  const b = rand(2, 5);
  return { text: `${a}×${b}`, answer: a * b };
}

function fullMul(): Raw {
  const a = rand(2, 9);
  const b = rand(2, 9);
  return { text: `${a}×${b}`, answer: a * b };
}

function biggerAddSub(): Raw {
  if (Math.random() < 0.5) {
    const a = rand(10, 49);
    const b = rand(5, Math.min(50, 99 - a));
    return { text: `${a}+${b}`, answer: a + b };
  }
  const big = rand(20, 90);
  const small = rand(5, big - 1);
  return { text: `${big}-${small}`, answer: big - small };
}

function chain(operandCount: number): Raw {
  let value = rand(2, 9);
  let text = String(value);
  for (let i = 1; i < operandCount; i++) {
    type C = { op: "+" | "-"; n: number; next: number };
    const cs: C[] = [];
    for (let n = 1; n <= 9; n++) {
      if (value + n <= 99) cs.push({ op: "+", n, next: value + n });
      if (value - n >= 0) cs.push({ op: "-", n, next: value - n });
    }
    const c = cs[rand(0, cs.length - 1)];
    value = c.next;
    text += `${c.op}${c.n}`;
  }
  return { text, answer: value };
}

// Score-driven ramp; answers may be one or two digits.
export function makeEquation(id: number): Equation {
  let raw: Raw;
  if (id < 3) raw = warmup();
  else if (id < 8) raw = easyAddSub();
  else if (id < 13) raw = Math.random() < 0.6 ? basicMul() : easyAddSub();
  else if (id < 18) raw = Math.random() < 0.5 ? fullMul() : biggerAddSub();
  else if (id < 24) raw = Math.random() < 0.7 ? chain(3) : biggerAddSub();
  else raw = chain(4);
  return { id, text: `${raw.text}=`, answer: raw.answer };
}

export function makeEquations(count: number): Equation[] {
  return Array.from({ length: count }, (_, i) => makeEquation(i));
}
