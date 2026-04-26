"use client";

import { useCallback, useEffect, useState } from "react";

export type PlayStatus = {
  freeRemaining: number;
  freeCap: number;
  paidCredits: number;
  nextFreeAt: string | null;
  canPlay: boolean;
  wldPriceUsdc: number | null;
  wldPriceUpdatedAt: string | null;
  wldPerRound: number | null;
  usdcPerRound: number;
  treasury: string | null;
};

export function usePlayStatus(enabled: boolean) {
  const [status, setStatus] = useState<PlayStatus | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      const r = await fetch("/api/play/status", { cache: "no-store" });
      if (!r.ok) {
        setStatus(null);
        return;
      }
      setStatus((await r.json()) as PlayStatus);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { status, loading, refresh };
}
