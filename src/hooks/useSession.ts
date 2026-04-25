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
      const r = await fetch("/api/auth/me", { cache: "no-store" });
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
    refresh();
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
    // Defensive default for any tree that forgot the provider; behaves like a
    // not-signed-in session and won't crash.
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
