"use client";

// sessionStorage-backed cache with a TTL. Falls back gracefully if storage
// is unavailable (private mode, server-side, etc).

type Entry<T> = { v: T; t: number };

export function getCached<T>(key: string, ttlMs: number): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Entry<T>;
    if (Date.now() - parsed.t > ttlMs) return null;
    return parsed.v;
  } catch {
    return null;
  }
}

export function setCached<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      key,
      JSON.stringify({ v: value, t: Date.now() }),
    );
  } catch {
    /* ignore quota / disabled */
  }
}

/** Fetch JSON with a session-scoped cache. The cached payload is returned
 *  immediately; a background refresh updates it if the cache is stale. */
export async function fetchCached<T>(
  url: string,
  ttlMs: number,
  init?: RequestInit,
): Promise<T> {
  const key = `qkr:${url}`;
  const hit = getCached<T>(key, ttlMs);
  if (hit !== null) return hit;
  const res = await fetch(url, { cache: "no-store", ...init });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as T;
  setCached(key, data);
  return data;
}
