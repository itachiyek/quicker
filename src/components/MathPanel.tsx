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
    <div
      className="paper relative w-full h-full p-4 flex flex-col justify-around overflow-hidden"
      style={{
        backgroundImage:
          "repeating-linear-gradient(180deg, transparent 0 38px, rgba(120,113,108,0.18) 38px 39px)",
      }}
    >
      {/* red margin line, classic notebook */}
      <div className="absolute left-9 top-0 bottom-0 w-px bg-rose-300/60" />

      {rows.map(({ eq, status }, i) => {
        const muted = status === "pending";
        const opacity = i === 0 ? 1 : i === 1 ? 0.65 : 0.4;
        return (
          <div
            key={eq.id}
            className="relative flex items-center justify-center text-4xl sm:text-5xl font-serif tabular-nums px-2 py-1"
            style={{ opacity }}
          >
            <div
              className={`flex items-center justify-center ${
                status === "current"
                  ? "ring-2 ring-stone-800 rounded-lg px-3 py-1 bg-white/40"
                  : ""
              }`}
            >
              <span className={muted ? "text-stone-500" : ""}>{eq.text}</span>
              <span className="ml-1 min-w-[2ch] text-left">
                {status === "correct" ? (
                  <span className="text-emerald-700 font-bold">
                    {eq.answer}
                  </span>
                ) : status === "current" && feedback ? (
                  <span
                    className={
                      feedback.kind === "correct"
                        ? "text-emerald-700 font-bold"
                        : "text-rose-600 font-bold animate-pulse"
                    }
                  >
                    {feedback.digit}
                  </span>
                ) : null}
              </span>
              {status === "correct" && (
                <span className="ml-2 text-emerald-700 text-2xl">✓</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
