import {
  createPublicClient,
  createWalletClient,
  http,
  keccak256,
  toBytes,
  toHex,
  parseAbi,
  parseAbiItem,
  decodeEventLog,
  isAddress,
  isHash,
  parseUnits,
  formatUnits,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { worldchain } from "viem/chains";

export const WLD_TOKEN_ADDRESS =
  "0x2cFc85d8E48F8EAB294be644d9E25C3030863003".toLowerCase();

export function usdcAddress(): string {
  return (
    process.env.USDC_TOKEN_ADDRESS ??
    "0x79A02482A880bCE3F13e09Da970dC34db4CD24d1"
  ).toLowerCase();
}

export function tokenAddressFor(symbol: "WLD" | "USDC"): `0x${string}` {
  return (symbol === "WLD" ? WLD_TOKEN_ADDRESS : usdcAddress()) as `0x${string}`;
}

// Both WLD and USDC on World Chain use 18 decimals (USDC.e on WC is 18 dp).
// If the canonical USDC ever flips to 6, set it here per token symbol.
export function decimalsFor(symbol: "WLD" | "USDC"): number {
  return symbol === "WLD" ? 18 : 6;
}

export const ESCROW_ABI = parseAbi([
  "function recordDeposit(address token, bytes32 lobbyId, address user, uint256 fullAmount) external",
  "function resolveChallenge(address token, bytes32 lobbyId, address winner) external",
  "function resolveTie(address token, bytes32 lobbyId, address a, address b) external",
  "function escrowed(address token, bytes32 lobbyId) external view returns (uint256)",
  "function feePercent() external view returns (uint8)",
  "function feeRecipient() external view returns (address)",
  "function owner() external view returns (address)",
]);

export const TRANSFER_EVENT = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 value)",
);

export function getEscrowAddress(): `0x${string}` | null {
  const a = process.env.ESCROW_CONTRACT;
  if (!a || !/^0x[0-9a-fA-F]{40}$/.test(a)) return null;
  return a.toLowerCase() as `0x${string}`;
}

export function getOwnerAccount() {
  const k = process.env.OWNER_PRIVATE_KEY;
  if (!k || k.length < 64) return null;
  const hex = (k.startsWith("0x") ? k.slice(2) : k).trim();
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) return null;
  return privateKeyToAccount(`0x${hex}` as `0x${string}`);
}

export function getRpcUrl(): string {
  return (
    process.env.WORLDCHAIN_RPC_URL ??
    "https://worldchain-mainnet.g.alchemy.com/public"
  );
}

export function publicClient() {
  return createPublicClient({ chain: worldchain, transport: http(getRpcUrl()) });
}

export function walletClient() {
  const account = getOwnerAccount();
  if (!account) return null;
  return createWalletClient({
    account,
    chain: worldchain,
    transport: http(getRpcUrl()),
  });
}

export function lobbyIdToBytes32(lobbyId: string): `0x${string}` {
  // Hash the lobby string id deterministically so the on-chain key is always
  // 32 bytes regardless of how short or long the string is.
  return keccak256(toBytes(lobbyId));
}

export function shortLobbyId(): string {
  // 16 lowercase hex chars (~64 bits) — collision-safe for our scale.
  const arr = new Uint8Array(8);
  crypto.getRandomValues(arr);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// -- On-chain verification --------------------------------------------------

export type DepositVerification =
  | { ok: true; amount: bigint; from: string; to: string }
  | { ok: false; reason: string };

/** Verify that the given tx is a Transfer of `expectedAmount` of `token`
 *  from `expectedFrom` to the escrow contract. */
export async function verifyDepositTx(opts: {
  txHash: `0x${string}`;
  token: `0x${string}`;
  expectedFrom: `0x${string}`;
  expectedAmount: bigint;
  toContract: `0x${string}`;
}): Promise<DepositVerification> {
  const c = publicClient();
  let receipt;
  try {
    receipt = await c.getTransactionReceipt({ hash: opts.txHash });
  } catch {
    return { ok: false, reason: "Transaction not found" };
  }
  if (receipt.status !== "success") {
    return { ok: false, reason: "Transaction failed on chain" };
  }

  let totalIn = 0n;
  let from = "";
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== opts.token.toLowerCase()) continue;
    let parsed;
    try {
      parsed = decodeEventLog({
        abi: [TRANSFER_EVENT],
        data: log.data,
        topics: log.topics,
      });
    } catch {
      continue;
    }
    if (parsed.eventName !== "Transfer") continue;
    const args = parsed.args as { from: string; to: string; value: bigint };
    if (
      isAddress(args.from) &&
      args.from.toLowerCase() === opts.expectedFrom.toLowerCase() &&
      isAddress(args.to) &&
      args.to.toLowerCase() === opts.toContract.toLowerCase()
    ) {
      totalIn += args.value;
      from = args.from;
    }
  }
  if (totalIn === 0n) {
    return { ok: false, reason: "No matching Transfer log" };
  }
  // Allow 0.1% slippage above (price-quoted) but reject below.
  if (totalIn < opts.expectedAmount) {
    return {
      ok: false,
      reason: `Amount too low (sent ${formatUnits(totalIn, 18)})`,
    };
  }
  return {
    ok: true,
    amount: totalIn,
    from,
    to: opts.toContract,
  };
}

// -- Helpers re-exported -----------------------------------------------------

export { isHash, isAddress, parseUnits, formatUnits, toHex };
