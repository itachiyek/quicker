export type Equation = {
  id: number;
  text: string;
  answer: number;
};

const rand = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

// Mix of single- and two-digit answers (0–99). Mostly arithmetic,
// occasionally a small multiplication.
export function makeEquation(id: number): Equation {
  const ops = ["+", "+", "-", "-", "×"] as const; // weight + and - over ×
  const op = ops[rand(0, ops.length - 1)];

  let a: number;
  let b: number;
  let answer: number;
  let text: string;

  if (op === "+") {
    // 50% chance of a 2-digit result
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
    // small × small, ranging from single-digit up to ~81
    a = rand(2, 9);
    b = rand(2, 9);
    answer = a * b;
    text = `${a}×${b}`;
  }

  return { id, text: `${text}=`, answer };
}

export function makeEquations(count: number): Equation[] {
  return Array.from({ length: count }, (_, i) => makeEquation(i));
}
