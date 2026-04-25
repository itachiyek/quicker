import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { generateNonce } from "@/lib/siwe";

export async function GET() {
  const session = await getSession();
  const nonce = generateNonce();
  session.nonce = nonce;
  await session.save();
  return NextResponse.json({ nonce });
}
