import { formatEther, zeroAddress } from 'viem';
import { unihashAbi } from '../abis/unihash.js';
import { generateHashSvg } from '../hash-svgs.js';
import { CONTRACTS, contractsConfigured, isDeployed } from '../config/contracts.js';
import { getPublicClient } from './provider.js';

const MULTICALL_CHUNK = 40;

function contractAddress() {
  return isDeployed(CONTRACTS.unihash)
    ? CONTRACTS.unihash
    : isDeployed(CONTRACTS.hashToken)
      ? CONTRACTS.hashToken
      : null;
}

function shortenAddress(address) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/**
 * @typedef {Object} ProtocolStats
 * @property {number} hashesAlive
 * @property {number} holders
 * @property {number} blocksSpawned
 */

/**
 * @typedef {Object} MintedHash
 * @property {number} tokenId
 * @property {string} hashId
 * @property {`0x${string}`} owner
 * @property {string} ownerShort
 * @property {string} svg
 * @property {number} claimableEth
 */

/**
 * @returns {Promise<number>}
 */
export async function readMintedCount() {
  const address = contractAddress();
  if (!address) return 0;

  const client = getPublicClient();
  const minted = await client.readContract({
    address,
    abi: unihashAbi,
    functionName: 'minted',
  });

  return Number(minted);
}

/**
 * @returns {Promise<ProtocolStats | null>}
 */
export async function readProtocolStats() {
  if (!contractsConfigured()) return null;

  const address = contractAddress();
  if (!address) return null;

  const client = getPublicClient();
  const mintedNum = await readMintedCount();

  if (mintedNum === 0) {
    return { hashesAlive: 0, holders: 0, blocksSpawned: 0 };
  }

  const ownerCalls = Array.from({ length: mintedNum }, (_, index) => ({
    address,
    abi: unihashAbi,
    functionName: 'ownerOf',
    args: [BigInt(index + 1)],
  }));

  const ownerResults = await client.multicall({ contracts: ownerCalls });
  const owners = ownerResults
    .map((result) => result.result)
    .filter((owner) => owner && owner !== zeroAddress);

  const holders = new Set(owners.map((owner) => owner.toLowerCase())).size;

  let blocksSpawned = 0;

  try {
    const fromBlock = import.meta.env.VITE_CONTRACT_FROM_BLOCK
      ? BigInt(import.meta.env.VITE_CONTRACT_FROM_BLOCK)
      : 'earliest';

    const logs = await client.getContractEvents({
      address,
      abi: unihashAbi,
      eventName: 'ERC721Transfer',
      fromBlock,
      toBlock: 'latest',
    });

    const spawnBlocks = new Set();
    for (const log of logs) {
      if (log.args.from === zeroAddress) spawnBlocks.add(log.blockNumber);
    }

    blocksSpawned = spawnBlocks.size;
  } catch (error) {
    console.warn('[UniHash] Could not read spawn blocks:', error);
    blocksSpawned = mintedNum;
  }

  return {
    hashesAlive: mintedNum,
    holders,
    blocksSpawned,
  };
}

/**
 * @returns {Promise<MintedHash[]>}
 */
export async function loadMintedHashes() {
  const address = contractAddress();
  if (!address) return [];

  const client = getPublicClient();
  const mintedNum = await readMintedCount();
  if (mintedNum === 0) return [];

  /** @type {{ tokenId: number, owner: `0x${string}`, seed: bigint }[]} */
  const raw = [];

  for (let start = 1; start <= mintedNum; start += MULTICALL_CHUNK) {
    const end = Math.min(start + MULTICALL_CHUNK - 1, mintedNum);
    const contracts = [];

    for (let tokenId = start; tokenId <= end; tokenId += 1) {
      contracts.push(
        {
          address,
          abi: unihashAbi,
          functionName: 'ownerOf',
          args: [BigInt(tokenId)],
        },
        {
          address,
          abi: unihashAbi,
          functionName: 'seedOf',
          args: [BigInt(tokenId)],
        },
      );
    }

    const results = await client.multicall({ contracts });

    for (let tokenId = start; tokenId <= end; tokenId += 1) {
      const offset = (tokenId - start) * 2;
      const owner = results[offset]?.result;
      const seed = results[offset + 1]?.result;

      if (!owner) continue;

      raw.push({
        tokenId,
        owner,
        seed: seed ?? BigInt(tokenId * 97 + 13),
      });
    }
  }

  const uniqueOwners = [...new Set(raw.map((entry) => entry.owner))];
  const dividendResults = await client.multicall({
    contracts: uniqueOwners.map((owner) => ({
      address,
      abi: unihashAbi,
      functionName: 'withdrawableDividend',
      args: [owner],
    })),
  });

  const claimableByOwner = new Map(
    uniqueOwners.map((owner, index) => [
      owner.toLowerCase(),
      dividendResults[index]?.result ?? 0n,
    ]),
  );

  return raw.map((entry) => ({
    tokenId: entry.tokenId,
    hashId: `#${String(entry.tokenId).padStart(4, '0')}`,
    owner: entry.owner,
    ownerShort: shortenAddress(entry.owner),
    svg: generateHashSvg(Number(entry.seed)),
    claimableEth: Number.parseFloat(
      formatEther(claimableByOwner.get(entry.owner.toLowerCase()) ?? 0n),
    ),
  }));
}

/**
 * @param {MintedHash[]} hashes
 * @param {number} tokenId
 */
export function findMintedHash(hashes, tokenId) {
  return hashes.find((entry) => entry.tokenId === tokenId) ?? null;
}
