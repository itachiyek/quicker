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

  const refresh = useCallback(
    async (opts?: { force?: boolean }) => {
      if (!enabled) return;
      setLoading(true);
      try {
        // Default mounts use the browser cache (server returns max-age=30).
        // Callers that just changed state (bought credits, started a round)
        // pass { force: true } to bypass it.
        const r = await fetch(
          "/api/play/status",
          opts?.force ? { cache: "no-store" } : undefined,
        );
        if (!r.ok) {
          setStatus(null);
          return;
        }
        setStatus((await r.json()) as PlayStatus);
      } finally {
        setLoading(false);
      }
    },
    [enabled],
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { status, loading, refresh };
}
