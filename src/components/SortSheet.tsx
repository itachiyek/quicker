"use client";

import type { ReactNode } from "react";

export type SortValue = "newest" | "stake_desc" | "stake_asc";

const OPTIONS: { value: SortValue; label: string; hint: string }[] = [
  { value: "newest", label: "Newest first", hint: "Most recently created" },
  { value: "stake_desc", label: "Highest stake", hint: "Biggest pool first" },
  { value: "stake_asc", label: "Lowest stake", hint: "Smallest pool first" },
];

export default function SortSheet({
  open,
  value,
  onPick,
  onClose,
}: {
  open: boolean;
  value: SortValue;
  onPick: (v: SortValue) => void;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md bg-white rounded-t-3xl shadow-xl p-5 max-h-[60vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1.5 bg-stone-300 rounded-full mx-auto mb-4" />
        <h2 className="display text-2xl font-black italic tracking-tight">
          Sort by
        </h2>
        <ol className="mt-4 space-y-1">
          {OPTIONS.map((o) => {
            const active = o.value === value;
            return (
              <li key={o.value}>
                <button
                  onClick={() => {
                    onPick(o.value);
                    onClose();
                  }}
                  className={`w-full text-left rounded-xl px-3 py-3 flex items-center gap-3 ${
                    active ? "bg-stone-900 text-white" : "hover:bg-stone-50"
                  }`}
                >
                  <span
                    className={`shrink-0 w-5 h-5 rounded-full border-2 ${
                      active
                        ? "bg-white border-white"
                        : "border-stone-300"
                    } flex items-center justify-center`}
                  >
                    {active && (
                      <span className="w-2 h-2 rounded-full bg-stone-900" />
                    )}
                  </span>
                  <span className="flex-1">
                    <div
                      className={`font-semibold ${active ? "" : "text-stone-900"}`}
                    >
                      {o.label}
                    </div>
                    <div
                      className={`text-[11px] ${active ? "text-stone-300" : "text-stone-500"}`}
                    >
                      {o.hint}
                    </div>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

// Small inline sort icon — three lines of decreasing length.
export function SortIcon({ size = 16 }: { size?: number }): ReactNode {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="6" y1="12" x2="18" y2="12" />
      <line x1="9" y1="18" x2="15" y2="18" />
    </svg>
  );
}
