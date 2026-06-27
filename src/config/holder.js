import { formatUnits } from 'viem';
import { unihashAbi } from '../abis/unihash.js';
import { CONTRACTS, isDeployed } from './contracts.js';
import { getPublicClient } from '../web3/provider.js';

/** Fallback when UNIT() cannot be read (200 whole tokens = 1 NFT). */
export const HOLDER_THRESHOLD_FALLBACK = 200;
export const HOLDER_THRESHOLD_LABEL = '200';

/** @type {number | null} */
let cachedUnitTokens = null;

/**
 * Read UNIT from chain and convert to whole-token threshold.
 * @returns {Promise<number>}
 */
export async function readUnitFromChain() {
  if (cachedUnitTokens !== null) return cachedUnitTokens;

  if (!isDeployed(CONTRACTS.hashToken) && !isDeployed(CONTRACTS.unihash)) {
    return HOLDER_THRESHOLD_FALLBACK;
  }

  const address = isDeployed(CONTRACTS.hashToken) ? CONTRACTS.hashToken : CONTRACTS.unihash;

  try {
    const client = getPublicClient();
    const [unitRaw, decimals] = await Promise.all([
      client.readContract({
        address,
        abi: unihashAbi,
        functionName: 'UNIT',
      }),
      client.readContract({
        address,
        abi: unihashAbi,
        functionName: 'decimals',
      }).catch(() => 18),
    ]);

    const unitTokens = Number.parseFloat(formatUnits(unitRaw, Number(decimals)));
    cachedUnitTokens = unitTokens > 0 ? unitTokens : HOLDER_THRESHOLD_FALLBACK;
    return cachedUnitTokens;
  } catch {
    return HOLDER_THRESHOLD_FALLBACK;
  }
}

/**
 * @param {number} balance
 * @param {number} [threshold]
 */
export function computeHoldProgress(balance, threshold = HOLDER_THRESHOLD_FALLBACK) {
  if (!Number.isFinite(balance) || threshold <= 0) return 0;
  return Math.min(1, Math.max(0, balance / threshold));
}

/**
 * @param {number} balance
 * @param {number} [threshold]
 */
export function countEligibleNfts(balance, threshold = HOLDER_THRESHOLD_FALLBACK) {
  if (!Number.isFinite(balance) || threshold <= 0) return 0;
  return Math.floor(balance / threshold);
}

/**
 * @param {number} balance
 * @param {number} [threshold]
 */
export function isHoldEligible(balance, threshold = HOLDER_THRESHOLD_FALLBACK) {
  return balance >= threshold;
}
