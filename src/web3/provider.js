import { createPublicClient, createWalletClient, custom, http } from 'viem';
import { chainId, rpcUrl, targetChain } from '../config/chain.js';

/** @type {import('viem').PublicClient | null} */
let publicClient = null;

export function getPublicClient() {
  if (!publicClient) {
    publicClient = createPublicClient({
      chain: targetChain,
      transport: http(rpcUrl),
    });
  }
  return publicClient;
}

/**
 * @returns {import('viem').WalletClient | null}
 */
export function getWalletClient() {
  if (typeof window === 'undefined' || !window.ethereum) return null;

  return createWalletClient({
    chain: targetChain,
    transport: custom(window.ethereum),
  });
}

export function hasWalletProvider() {
  return typeof window !== 'undefined' && Boolean(window.ethereum);
}

export { chainId };
