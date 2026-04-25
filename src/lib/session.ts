import type { SessionOptions } from "iron-session";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";

export type AppSession = {
  nonce?: string;
  wallet?: string;
};

const password =
  process.env.SESSION_SECRET ??
  // Fallback for local dev only; production must set a real secret.
  "dev-only-please-set-SESSION_SECRET-in-production-32chars+";

export const sessionOptions: SessionOptions = {
  password,
  cookieName: "quicker_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  },
};

export async function getSession() {
  const store = await cookies();
  return getIronSession<AppSession>(store, sessionOptions);
}
