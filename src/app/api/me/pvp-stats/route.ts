import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase";

type LobbyRow = {
  creator_wallet: string;
  challenger_wallet: string | null;
  winner_wallet: string | null;
  is_tie: boolean;
  status: string;
};

export async function GET() {
  const session = await getSession();
  if (!session.wallet) {
    return NextResponse.json({
      played: 0,
      won: 0,
      lost: 0,
      tied: 0,
      open: 0,
    });
  }
  const sb = getSupabaseAdmin();
  if (!sb) return NextResponse.json({ played: 0, won: 0, lost: 0, tied: 0, open: 0 });

  const me = session.wallet.toLowerCase();
  const { data } = await sb
    .from("quicker_lobbies")
    .select("creator_wallet, challenger_wallet, winner_wallet, is_tie, status")
    .or(`creator_wallet.eq.${me},challenger_wallet.eq.${me}`)
    .limit(500);

  const rows = (data ?? []) as LobbyRow[];
  let won = 0;
  let lost = 0;
  let tied = 0;
  let open = 0;
  for (const r of rows) {
    if (r.status === "resolved") {
      if (r.is_tie) tied++;
      else if (r.winner_wallet?.toLowerCase() === me) won++;
      else lost++;
    } else if (r.status === "open" || r.status === "creator_playing") {
      if (r.creator_wallet.toLowerCase() === me) open++;
    }
  }
  const played = won + lost + tied;
  return NextResponse.json({ played, won, lost, tied, open });
}
