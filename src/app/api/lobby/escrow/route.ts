import { NextResponse } from "next/server";
import { getEscrowAddress } from "@/lib/pvp";

export const revalidate = 60;

export async function GET() {
  return NextResponse.json({ escrow: getEscrowAddress() });
}
