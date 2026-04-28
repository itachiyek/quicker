"use client";

import SideSheet from "./SideSheet";

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

const TIPS: { icon: string; title: string; body: string }[] = [
  {
    icon: "✓",
    title: "Fill the box",
    body: "Draw each digit big — make it span most of the canvas height.",
  },
  {
    icon: "✓",
    title: "Keep strokes connected",
    body: "Don't lift mid-stroke if you can help it. Single fluid motions read best.",
  },
  {
    icon: "✓",
    title: "Centre it",
    body: "Aim for the middle of the canvas. Edge-hugging digits get cropped.",
  },
  {
    icon: "✕",
    title: "Avoid tiny marks",
    body: "Stray dots or wisps confuse the classifier. Erase and retry with a confident stroke.",
  },
];

export default function RulesSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <SideSheet open={open} onClose={onClose} title="Rules">
      <div className="flex flex-col gap-4 pb-4">
        <section className="card-glass w-full p-5">
          <h2 className="display text-3xl font-black italic tracking-tight">
            PvP Rules
          </h2>
          <ol className="mt-4 space-y-3 text-sm text-stone-700">
            <RuleItem
              n={1}
              title="Create a lobby"
              body="Pick WLD or USDC and your stake (min 0.05). Stake is taken on confirm."
            />
            <RuleItem
              n={2}
              title="Play your round"
              body="60 seconds, score as many correct answers as possible. Your score is locked in."
            />
            <RuleItem
              n={3}
              title="Wait for a challenger"
              body="Anyone can pick up your lobby and try to beat you. They stake the same amount in the same token."
            />
            <RuleItem
              n={4}
              title="Higher score wins"
              body="Once the challenger finishes, the winner is decided automatically. Tied scores split the pool."
            />
            <RuleItem
              n={5}
              title="Claim your winnings"
              body="Winner takes the full pool minus the platform fee. Claim from the PvP page or match history."
            />
          </ol>
          <div className="mt-5 pt-4 border-t border-stone-200 text-xs text-stone-500 leading-relaxed">
            <p>
              <span className="font-semibold text-stone-700">Fee:</span> 10% of
              each deposit goes to the platform immediately.
            </p>
            <p className="mt-2">
              <span className="font-semibold text-stone-700">Both players</span>{" "}
              face the exact same equations in the same order.
            </p>
          </div>
        </section>

        {/* Handwriting guide */}
        <section className="card-glass w-full p-5">
          <h2 className="display text-2xl font-black italic tracking-tight">
            How to write
          </h2>
          <p className="text-sm text-stone-600 mt-1 leading-snug">
            The classifier was trained on MNIST-style digits. Draw them like
            this:
          </p>

          {/* Digit grid */}
          <div className="grid grid-cols-5 gap-2 mt-4">
            {DIGITS.map((d) => (
              <div
                key={d}
                className="paper aspect-square flex items-center justify-center"
              >
                <span className="handwriting text-5xl text-stone-900 leading-none">
                  {d}
                </span>
              </div>
            ))}
          </div>

          <ul className="mt-5 space-y-2.5">
            {TIPS.map((t) => (
              <li key={t.title} className="flex gap-3 text-sm">
                <span
                  className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    t.icon === "✓"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-rose-100 text-rose-700"
                  }`}
                >
                  {t.icon}
                </span>
                <div>
                  <div className="font-semibold text-stone-900">{t.title}</div>
                  <div className="text-stone-600 text-[13px] leading-snug">
                    {t.body}
                  </div>
                </div>
              </li>
            ))}
          </ul>

          {/* Two-digit guide */}
          <div className="mt-5 pt-5 border-t border-stone-200/70">
            <div className="text-[10px] uppercase tracking-wider text-stone-500 mb-1">
              Two-digit answers
            </div>
            <p className="text-sm text-stone-700 leading-snug">
              For results 10–99 the canvas shows a dotted divider — write the
              tens digit on the left, the ones digit on the right.
            </p>
            <div className="paper relative h-32 mt-3 overflow-hidden">
              {/* dotted divider matching DrawCanvas */}
              <div
                aria-hidden
                className="pointer-events-none absolute top-3 bottom-3 left-1/2 w-px"
                style={{
                  background:
                    "repeating-linear-gradient(180deg, rgba(120,113,108,0.55) 0 6px, transparent 6px 12px)",
                }}
              />
              <div className="absolute inset-0 grid grid-cols-2">
                <div className="flex items-center justify-center handwriting text-6xl text-stone-900">
                  4
                </div>
                <div className="flex items-center justify-center handwriting text-6xl text-stone-900">
                  2
                </div>
              </div>
              <span className="absolute top-2 left-3 text-[10px] uppercase tracking-wider text-stone-500">
                Tens
              </span>
              <span className="absolute top-2 right-3 text-[10px] uppercase tracking-wider text-stone-500">
                Ones
              </span>
              <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[11px] text-stone-500">
                Example: 42
              </span>
            </div>
          </div>
        </section>
      </div>
    </SideSheet>
  );
}

function RuleItem({
  n,
  title,
  body,
}: {
  n: number;
  title: string;
  body: string;
}) {
  return (
    <li className="flex gap-3">
      <span className="shrink-0 w-7 h-7 rounded-full bg-stone-900 text-white text-xs font-bold flex items-center justify-center mt-0.5">
        {n}
      </span>
      <div>
        <div className="font-semibold text-stone-900">{title}</div>
        <div className="text-stone-600 text-[13px] leading-snug">{body}</div>
      </div>
    </li>
  );
}
