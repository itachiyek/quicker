export type Equation = {
  id: number;
  text: string;
  answer: number;
};

const rand = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

// All equations have a single-digit answer (0-9) so the canvas only needs
// to recognize one digit at a time.
export function makeEquation(id: number): Equation {
  const ops = ["+", "-", "×"] as const;
  const op = ops[rand(0, 2)];
  let a: number, b: number, answer: number, text: string;

  if (op === "+") {
    answer = rand(2, 9);
    a = rand(1, answer - 1);
    b = answer - a;
    text = `${a}+${b}`;
  } else if (op === "-") {
    a = rand(2, 9);
    b = rand(1, a);
    answer = a - b;
    text = `${a}-${b}`;
  } else {
    // multiplication with single-digit result: factors limited
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
      [2, 1],
      [1, 8],
    ];
    [a, b] = pairs[rand(0, pairs.length - 1)];
    answer = a * b;
    text = `${a}×${b}`;
  }

  return { id, text: `${text}=`, answer };
}

export function makeEquations(count: number): Equation[] {
  return Array.from({ length: count }, (_, i) => makeEquation(i));
}
