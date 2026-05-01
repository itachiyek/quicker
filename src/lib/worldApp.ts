// World App / mini-app constants and helpers.

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
