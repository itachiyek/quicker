"use client";

import { useCallback, useEffect, useState } from "react";

type Me = { wallet: string | null };

export function useSession() {
  const [wallet, setWallet] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/auth/me", { cache: "no-store" });
      const data = (await r.json()) as Me;
      setWallet(data.wallet);
    } catch {
      setWallet(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setWallet(null);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { wallet, loading, refresh, logout };
}
