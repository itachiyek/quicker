"use client";

import { useState } from "react";
import { MiniKit } from "@worldcoin/minikit-js";
import { buildInviteUrl } from "@/lib/worldApp";

type Props = {
  wallet: string;
};

export default function InviteCard({ wallet }: Props) {
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const url = buildInviteUrl(wallet);
  const text =
    "Komm zu Quicker — 60 Sekunden Kopfrechnen mit Handschrift-Erkennung. Wir kriegen beide einen Bonus 🎁";

  const onShare = async () => {
    setBusy(true);
    setFeedback(null);
    try {
      const m = MiniKit as unknown as {
        isInWorldApp?: () => boolean;
        share?: (opts: {
          title?: string;
          text?: string;
          url?: string;
        }) => Promise<unknown>;
      };
      const inWorldApp =
        typeof m.isInWorldApp === "function" ? !!m.isInWorldApp() : false;
      if (inWorldApp && typeof m.share === "function") {
        await m.share({ title: "Spiel mit mir Quicker", text, url });
        setFeedback("Geteilt — du bekommst 1 Credit pro Freund, der einsteigt.");
        return;
      }
      // Web fallback: native share, then clipboard.
      if (typeof navigator !== "undefined" && "share" in navigator) {
        try {
          await (navigator as Navigator & {
            share: (data: { title?: string; text?: string; url?: string }) => Promise<void>;
          }).share({ title: "Quicker", text, url });
          setFeedback("Link geteilt.");
          return;
        } catch {
          /* fall through to clipboard */
        }
      }
      await navigator.clipboard.writeText(url);
      setFeedback("Link kopiert.");
    } catch (e) {
      setFeedback(e instanceof Error ? e.message : "Konnte nicht teilen");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card-glass w-full p-5 flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="w-11 h-11 rounded-xl bg-stone-900 text-amber-200 flex items-center justify-center text-xl shrink-0">
          🎁
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-stone-500">
            Freunde einladen
          </div>
          <div className="text-sm font-semibold leading-snug">
            +1 Solo-Credit pro Freund, der einsteigt
          </div>
        </div>
      </div>
      <button
        onClick={onShare}
        disabled={busy}
        className="btn-primary w-full text-sm"
      >
        {busy ? "Teilen…" : "Einladungslink teilen"}
      </button>
      {feedback && (
        <p className="text-[11px] text-stone-600 text-center">{feedback}</p>
      )}
    </section>
  );
}
