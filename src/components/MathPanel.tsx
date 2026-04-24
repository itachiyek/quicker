"use client";

import type { Equation } from "@/lib/equations";

type Status = "pending" | "current" | "correct";

type Row = { eq: Equation; status: Status };

export default function MathPanel({
  rows,
  feedback,
}: {
  rows: Row[];
  feedback: { kind: "correct" | "wrong"; digit: number } | null;
}) {
  return (
    <div className="w-full h-full bg-white rounded-md border border-stone-300 shadow-inner p-4 flex flex-col justify-around overflow-hidden">
      {rows.map(({ eq, status }, i) => (
        <div
          key={eq.id}
          className={`flex items-center justify-center text-3xl sm:text-4xl font-serif tabular-nums px-2 py-1 ${
            status === "current"
              ? "border-2 border-stone-800 rounded-md"
              : ""
          } ${i > 0 ? "border-t border-stone-200" : ""}`}
        >
          <span>{eq.text}</span>
          <span className="ml-1 min-w-[2ch] text-left">
            {status === "correct" ? (
              <span className="text-emerald-600 font-bold">{eq.answer}</span>
            ) : status === "current" && feedback ? (
              <span
                className={
                  feedback.kind === "correct"
                    ? "text-emerald-600 font-bold"
                    : "text-rose-600 font-bold animate-pulse"
                }
              >
                {feedback.digit}
              </span>
            ) : null}
          </span>
          {status === "correct" && (
            <span className="ml-2 text-emerald-600 text-2xl">✓</span>
          )}
        </div>
      ))}
    </div>
  );
}
