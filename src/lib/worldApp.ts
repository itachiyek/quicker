// World App / mini-app constants and helpers.

import { MiniKit } from "@worldcoin/minikit-js";

export const WORLD_APP_ID =
  process.env.NEXT_PUBLIC_WORLD_APP_ID ??
  "app_74e18540b30578beddbd0510cd795040";

/**
 * Build a universal share link that opens the mini app inside World App.
 * The `ref` parameter is forwarded to our root path so the new user's first
 * sign-in can credit the inviter.
 */
export function buildInviteUrl(referrerWallet: string): string {
  const path = encodeURIComponent(`/?ref=${referrerWallet.toLowerCase()}`);
  return `https://world.org/mini-app?app_id=${WORLD_APP_ID}&path=${path}`;
}

export const REF_STORAGE_KEY = "quicker:ref";

/** Lower-cased Ethereum address regex — used to validate referral codes. */
export function isLikelyWallet(s: string): boolean {
  return /^0x[a-f0-9]{40}$/i.test(s);
}

/**
 * One-call invite share: tries MiniKit (inside World App), then native
 * navigator.share, then falls back to copying the link to the clipboard.
 * Returns the channel that actually fired so the caller can show feedback.
 */
export type InviteShareResult = "minikit" | "native" | "clipboard";

export async function shareInvite(referrerWallet: string): Promise<InviteShareResult> {
  const url = buildInviteUrl(referrerWallet);
  const text =
    "Join me on Quicker — 60 seconds of mental math with handwriting recognition. We both get a bonus 🎁";

  const m = MiniKit as unknown as {
    isInWorldApp?: () => boolean;
    share?: (opts: { title?: string; text?: string; url?: string }) => Promise<unknown>;
  };
  const inWorldApp =
    typeof m.isInWorldApp === "function" ? !!m.isInWorldApp() : false;
  if (inWorldApp && typeof m.share === "function") {
    await m.share({ title: "Play Quicker with me", text, url });
    return "minikit";
  }

  if (typeof navigator !== "undefined" && "share" in navigator) {
    try {
      await (navigator as Navigator & {
        share: (data: { title?: string; text?: string; url?: string }) => Promise<void>;
      }).share({ title: "Quicker", text, url });
      return "native";
    } catch {
      /* fall through to clipboard */
    }
  }

  await navigator.clipboard.writeText(url);
  return "clipboard";
}
