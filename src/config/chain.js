import { defineChain } from 'viem';
import { mainnet, sepolia, base, baseSepolia } from 'viem/chains';

const CHAIN_BY_ID = {
  [mainnet.id]: mainnet,
  [sepolia.id]: sepolia,
  [base.id]: base,
  [baseSepolia.id]: baseSepolia,
};

const envChainId = Number(import.meta.env.VITE_CHAIN_ID ?? mainnet.id);

/** @type {import('viem').Chain} */
export const targetChain =
  CHAIN_BY_ID[envChainId] ??
  defineChain({
    id: envChainId,
    name: `Chain ${envChainId}`,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: {
      default: { http: [import.meta.env.VITE_RPC_URL ?? 'https://eth.llamarpc.com'] },
    },
  });

export const chainId = targetChain.id;

export const rpcUrl = import.meta.env.VITE_RPC_URL ?? targetChain.rpcUrls.default.http[0];

export const explorerUrl = import.meta.env.VITE_EXPLORER_URL ?? 'https://etherscan.io';
