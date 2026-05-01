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
    "Join me on Quicker — 60 seconds of mental math with handwriting recognition. We both get a bonus 🎁";

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
        await m.share({ title: "Play Quicker with me", text, url });
        setFeedback("Shared — you'll get 1 credit for every friend who joins.");
        return;
      }
      // Web fallback: native share, then clipboard.
      if (typeof navigator !== "undefined" && "share" in navigator) {
        try {
          await (navigator as Navigator & {
            share: (data: { title?: string; text?: string; url?: string }) => Promise<void>;
          }).share({ title: "Quicker", text, url });
          setFeedback("Link shared.");
          return;
        } catch {
          /* fall through to clipboard */
        }
      }
      await navigator.clipboard.writeText(url);
      setFeedback("Link copied.");
    } catch (e) {
      setFeedback(e instanceof Error ? e.message : "Couldn't share");
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
            Invite friends
          </div>
          <div className="text-sm font-semibold leading-snug">
            +1 Solo credit for every friend who joins
          </div>
        </div>
      </div>
      <button
        onClick={onShare}
        disabled={busy}
        className="btn-primary w-full text-sm"
      >
        {busy ? "Sharing…" : "Share invite link"}
      </button>
      {feedback && (
        <p className="text-[11px] text-stone-600 text-center">{feedback}</p>
      )}
    </section>
  );
}
