"use client";

import { useState } from "react";
import { shareInvite } from "@/lib/worldApp";

type Props = {
  wallet: string;
};

export default function InviteCard({ wallet }: Props) {
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const onShare = async () => {
    setBusy(true);
    setFeedback(null);
    try {
      const channel = await shareInvite(wallet);
      setFeedback(
        channel === "clipboard"
          ? "Link copied — paste it anywhere."
          : "Shared — you'll get 1 credit per friend who joins.",
      );
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
