// WLD token contract on World Chain mainnet.
export const WLD_TOKEN_ADDRESS = "0x2cFc85d8E48F8EAB294be644d9E25C3030863003";

// Where players send WLD to buy a round. Hard-coded to avoid an env-var
// misconfiguration silently breaking purchases.
export const TREASURY_ADDRESS =
  "0xdf83c19919e1fac0bd1b16952d101af177c7da3a";

export function getTreasuryAddress(): string {
  return TREASURY_ADDRESS;
}

// Cost of one round in USDC (used as the unit for legacy single-round buys).
export const USDC_PER_ROUND = 0.1;

// Free plays granted per rolling 24h window.
export const FREE_PLAYS_PER_DAY = 3;

// Top-up packages. Order = display order.
export type Package = {
  id: number;
  rounds: number;
  usdcPrice: number;
  label: string;
};

export const PACKAGES: Package[] = [
  { id: 1, rounds: 1, usdcPrice: 0.1, label: "1 round" },
  { id: 2, rounds: 3, usdcPrice: 0.25, label: "3 rounds" },
  { id: 3, rounds: 10, usdcPrice: 0.7, label: "10 rounds" },
];

export function getPackage(id: number): Package | undefined {
  return PACKAGES.find((p) => p.id === id);
}
