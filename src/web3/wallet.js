import { chainId, targetChain } from '../config/chain.js';
import { contractsConfigured } from '../config/contracts.js';
import { getWalletClient, hasWalletProvider } from './provider.js';
import { readWalletBalances } from './reads.js';
import { claimRewards as claimOnChain } from './writes.js';

/** @type {`0x${string}` | null} */
let connectedAddress = null;

/** @type {((address: `0x${string}` | null) => void) | null} */
let onAccountsChanged = null;

let listenersBound = false;

export function getConnectedAddress() {
  return connectedAddress;
}

export function isConnected() {
  return connectedAddress !== null;
}

/**
 * @returns {Promise<{ address: `0x${string}`, balances: import('./reads.js').WalletBalances }>}
 */
export async function connect() {
  if (!hasWalletProvider()) {
    throw new Error('No wallet detected. Install MetaMask or another Web3 wallet.');
  }

  await ensureCorrectChain();

  const walletClient = getWalletClient();
  const [address] = await walletClient.requestAddresses();

  if (!address) throw new Error('No account returned from wallet');

  connectedAddress = address;
  const balances = await readWalletBalances(address);

  return { address, balances };
}

/**
 * Silent reconnect via eth_accounts (no popup).
 * @returns {Promise<{ address: `0x${string}`, balances: import('./reads.js').WalletBalances } | null>}
 */
export async function tryAutoConnect() {
  if (!hasWalletProvider()) return null;

  try {
    const walletClient = getWalletClient();
    const [address] = await walletClient.getAddresses();

    if (!address) return null;

    const walletChainId = await walletClient.getChainId();
    if (walletChainId !== chainId) return null;

    connectedAddress = address;
    const balances = await readWalletBalances(address);
    return { address, balances };
  } catch {
    return null;
  }
}

export async function disconnect() {
  connectedAddress = null;
}

/**
 * @param {`0x${string}`} address
 */
export async function refresh(address = connectedAddress) {
  if (!address) {
    return {
      hashBalance: 0,
      hashesOwned: 0,
      claimableEth: 0,
      contractsReady: contractsConfigured(),
    };
  }

  return readWalletBalances(address);
}

/**
 * @param {`0x${string}`} address
 */
export async function claim(address = connectedAddress) {
  if (!address) throw new Error('Wallet not connected');
  return claimOnChain(address);
}

async function ensureCorrectChain() {
  const walletClient = getWalletClient();
  const currentChainId = await walletClient.getChainId();

  if (currentChainId === chainId) return;

  if (!window.ethereum) throw new Error('No wallet provider');

  const hexChainId = `0x${chainId.toString(16)}`;

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: hexChainId }],
    });
  } catch (error) {
    if (error?.code === 4902) {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: hexChainId,
            chainName: targetChain.name,
            nativeCurrency: targetChain.nativeCurrency,
            rpcUrls: [targetChain.rpcUrls.default.http[0]],
            blockExplorerUrls: targetChain.blockExplorers
              ? [targetChain.blockExplorers.default.url]
              : undefined,
          },
        ],
      });
      return;
    }

    throw new Error(`Wrong network. Switch to ${targetChain.name} (chain ${chainId}).`);
  }
}

/**
 * @param {(address: `0x${string}` | null) => void | Promise<void>} onChange
 */
export function initWalletListeners(onChange) {
  if (!window.ethereum || listenersBound) return;

  onAccountsChanged = onChange;
  listenersBound = true;

  window.ethereum.on('accountsChanged', async (accounts) => {
    const next = accounts[0] ?? null;
    connectedAddress = next;
    await onAccountsChanged?.(next);
  });

  window.ethereum.on('chainChanged', () => {
    window.location.reload();
  });
}

export { contractsConfigured };
