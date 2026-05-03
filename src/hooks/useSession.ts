"use client";

import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type SessionShape = {
  wallet: string | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  setWallet: (w: string | null) => void;
};

const SessionContext = createContext<SessionShape | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [wallet, setWallet] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      // Respect browser Cache-Control on /api/auth/me so repeat mounts don't
      // hit the server. The route sets a short private cache.
      const r = await fetch("/api/auth/me");
      const data = (await r.json()) as { wallet: string | null };
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
    let settled = false;
    refresh().finally(() => {
      settled = true;
    });
    // Safety net: only flip loading if the fetch genuinely never returns
    // (truly hung). Don't race against a slow-but-eventually-good response.
    const safety = window.setTimeout(() => {
      if (!settled) setLoading(false);
    }, 8000);
    return () => window.clearTimeout(safety);
  }, [refresh]);

  const value = useMemo<SessionShape>(
    () => ({ wallet, loading, refresh, logout, setWallet }),
    [wallet, loading, refresh, logout],
  );

  return createElement(SessionContext.Provider, { value }, children);
}

export function useSession(): SessionShape {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    return {
      wallet: null,
      loading: false,
      refresh: async () => {},
      logout: async () => {},
      setWallet: () => {},
    };
  }
  return ctx;
}
