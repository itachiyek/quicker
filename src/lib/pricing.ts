// WLD token contract on World Chain mainnet.
export const WLD_TOKEN_ADDRESS = "0x2cFc85d8E48F8EAB294be644d9E25C3030863003";

// Where players send WLD to buy a round. Set via env in production; we don't
// want a hard-coded fallback because a typo would route real funds to the
// wrong address.
export function getTreasuryAddress(): string | null {
  const addr = process.env.TREASURY_ADDRESS;
  if (!addr) return null;
  if (!/^0x[0-9a-fA-F]{40}$/.test(addr)) return null;
  return addr.toLowerCase();
}

// Cost of one round in USDC. WLD amount = USDC_PER_ROUND / WLD-USDC-price.
export const USDC_PER_ROUND = 0.1;

// Free plays granted per rolling 24h window.
export const FREE_PLAYS_PER_DAY = 3;
