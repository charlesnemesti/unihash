import { isAddress, zeroAddress } from 'viem';

const zero = zeroAddress;

function parseAddress(value, fallback = zero) {
  if (!value || !isAddress(value) || value === zero) return fallback;
  return value;
}

export const CONTRACTS = {
  hashToken: parseAddress(import.meta.env.VITE_HASH_TOKEN),
  hashRegistry: parseAddress(import.meta.env.VITE_HASH_REGISTRY),
  rewardDistributor: parseAddress(import.meta.env.VITE_REWARD_DISTRIBUTOR),
  uniswapPool: parseAddress(import.meta.env.VITE_UNISWAP_POOL),
};

export const DISTRIBUTOR_CLAIM_READ_FN =
  import.meta.env.VITE_DISTRIBUTOR_CLAIM_READ_FN ?? 'claimable';

/** True when at least the core token contract is configured. */
export function contractsConfigured() {
  return CONTRACTS.hashToken !== zero;
}

export function isDeployed(address) {
  return Boolean(address && isAddress(address) && address !== zero);
}
