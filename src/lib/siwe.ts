// Minimal Sign-In with Ethereum-style message helpers.
// We don't use the full EIP-4361 spec — only the parts we need: a stable
// message format the server can reproduce + a signature it can verify.

import { verifyMessage } from "viem";

export type SiweMessageParts = {
  domain: string;
  address: string;
  statement: string;
  uri: string;
  version: string;
  chainId: number;
  nonce: string;
  issuedAt: string;
};

export function buildSiweMessage(p: SiweMessageParts): string {
  return [
    `${p.domain} wants you to sign in with your Ethereum account:`,
    p.address,
    "",
    p.statement,
    "",
    `URI: ${p.uri}`,
    `Version: ${p.version}`,
    `Chain ID: ${p.chainId}`,
    `Nonce: ${p.nonce}`,
    `Issued At: ${p.issuedAt}`,
  ].join("\n");
}

export async function verifySiweSignature(
  message: string,
  signature: `0x${string}`,
  expectedAddress: `0x${string}`,
): Promise<boolean> {
  try {
    return await verifyMessage({
      address: expectedAddress,
      message,
      signature,
    });
  } catch {
    return false;
  }
}

export function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
