"use client";

import { useEffect, useState } from "react";

type Payment = {
  tx_hash: string;
  wld_amount: number;
  usdc_value: number;
  block_number: number | null;
  verified_at: string;
};

export default function Payments({ enabled }: { enabled: boolean }) {
  const [payments, setPayments] = useState<Payment[] | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    fetch("/api/me/payments", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { payments?: Payment[] }) => {
        if (cancelled) return;
        setPayments(d.payments ?? []);
      })
      .catch(() => !cancelled && setPayments([]));
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  if (!enabled || !payments || payments.length === 0) return null;

  return (
    <section className="w-full">
      <div className="flex items-baseline justify-between px-1 mb-2">
        <h3 className="text-sm font-semibold text-stone-700 uppercase tracking-wider">
          Your purchases
        </h3>
        <span className="text-xs text-stone-500">{payments.length}</span>
      </div>
      <ol className="panel divide-y divide-stone-200 overflow-hidden">
        {payments.map((p) => {
          const txShort = `${p.tx_hash.slice(0, 8)}…${p.tx_hash.slice(-6)}`;
          const when = new Date(p.verified_at);
          return (
            <li
              key={p.tx_hash}
              className="flex items-center gap-3 px-3 py-2.5"
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-mono truncate">
                  <a
                    href={`https://worldscan.org/tx/${p.tx_hash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-stone-800 hover:underline"
                  >
                    {txShort}
                  </a>
                </div>
                <div className="text-[10px] text-stone-500">
                  {when.toLocaleString()}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold tabular-nums">
                  {Number(p.wld_amount).toFixed(3)} WLD
                </div>
                <div className="text-[10px] text-stone-500 tabular-nums">
                  ≈ ${Number(p.usdc_value).toFixed(2)}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
