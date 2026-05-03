import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

// The wallet rarely changes within a session — let the browser hold this for
// a few minutes. On logout we already clear the in-memory state so a stale
// cached response can't keep the user "signed in".
const CACHE = "private, max-age=120, stale-while-revalidate=600";

export async function GET() {
  const session = await getSession();
  return NextResponse.json(
    { wallet: session.wallet ?? null },
    { headers: { "Cache-Control": CACHE } },
  );
}
