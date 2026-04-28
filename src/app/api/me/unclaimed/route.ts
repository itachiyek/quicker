import { NextResponse } from "next/server";
import { formatUnits } from "viem";
import { getSession } from "@/lib/session";
import {
  ESCROW_ABI,
  WLD_TOKEN_ADDRESS,
  decimalsFor,
  getEscrowAddress,
  publicClient,
  tokenAddressFor,
  usdcAddress,
} from "@/lib/pvp";

// Reads claimable[user][token] on-chain for both WLD and USDC.
export async function GET() {
  const session = await getSession();
  if (!session.wallet) {
    return NextResponse.json({ wld: "0", usdc: "0", configured: false });
  }
  const escrow = getEscrowAddress();
  if (!escrow) {
    return NextResponse.json({ wld: "0", usdc: "0", configured: false });
  }

  const client = publicClient();
  // claimable is the public mapping; viem auto-derives the getter from ABI.
  const wallet = session.wallet as `0x${string}`;
  const wldAddr = tokenAddressFor("WLD");
  const usdcAddr = tokenAddressFor("USDC");

  // viem can't read arbitrary mapping from parseAbi; we re-declare an ABI
  // entry inline so it picks up the auto-generated getter signature.
  const claimableAbi = [
    {
      inputs: [
        { name: "user", type: "address" },
        { name: "token", type: "address" },
      ],
      name: "claimable",
      outputs: [{ type: "uint256" }],
      stateMutability: "view",
      type: "function",
    },
  ] as const;

  try {
    const [wldRaw, usdcRaw] = await Promise.all([
      client.readContract({
        address: escrow,
        abi: claimableAbi,
        functionName: "claimable",
        args: [wallet, wldAddr],
      }),
      client.readContract({
        address: escrow,
        abi: claimableAbi,
        functionName: "claimable",
        args: [wallet, usdcAddr],
      }),
    ]);

    return NextResponse.json({
      wld: formatUnits(wldRaw as bigint, decimalsFor("WLD")),
      usdc: formatUnits(usdcRaw as bigint, decimalsFor("USDC")),
      configured: true,
      tokens: {
        WLD: WLD_TOKEN_ADDRESS,
        USDC: usdcAddress(),
      },
      escrow,
    });
  } catch (e) {
    return NextResponse.json(
      {
        wld: "0",
        usdc: "0",
        configured: true,
        error: e instanceof Error ? e.message : "read failed",
      },
      { status: 200 },
    );
  }

  // unused, for type-narrowing happiness with strict mode:
  void ESCROW_ABI;
}
