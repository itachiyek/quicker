"use client";

import SideSheet from "./SideSheet";

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
              body="Pick WLD or USDC and your stake (min 0.05). Stake is taken from your wallet on confirm."
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
              body="Winner takes the full pool minus the platform fee. Claim from the lobby or match history."
            />
          </ol>
          <div className="mt-5 pt-4 border-t border-stone-200 text-xs text-stone-500 leading-relaxed">
            <p>
              <span className="font-semibold text-stone-700">Fee:</span> 10% of
              each deposit goes to the platform immediately. The rest stays in
              escrow until the lobby resolves.
            </p>
            <p className="mt-2">
              <span className="font-semibold text-stone-700">Both players</span>{" "}
              face the exact same equations in the same order.
            </p>
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
