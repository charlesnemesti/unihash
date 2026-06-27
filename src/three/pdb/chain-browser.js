import { liveDataEnabled } from '../../config/launch.js';
import { loadMintedHashes, readMintedCount } from '../../web3/protocol.js';
import { ChainMorphPresenter } from './ChainMorphPresenter.js';
import { PDB_MOLECULE_LIST, STRUCTURE_COUNT } from './pdb-registry.js';
import { getColorPattern, COLOR_PATTERN_COUNT } from './color-patterns.js';

/** 10 structures × 10 color patterns = 100 Chain NFT units. */
export const UNIT_COUNT = STRUCTURE_COUNT * COLOR_PATTERN_COUNT;

const DEFAULT_IDS = {
  title: 'mol-title',
  sub: 'mol-sub',
  chainId: 'mol-chain-id',
  molecule: 'mol-layout',
  atoms: 'mol-atoms',
  owner: 'mol-owner',
  rewards: 'mol-rewards',
  pattern: 'mol-seed',
  progressText: 'mol-progress-text',
  progressFill: 'mol-progress-fill',
  kicker: 'mol-kicker',
  hint: 'mol-hint',
  prev: 'mol-prev',
  next: 'mol-next',
  shuffle: 'mol-shuffle',
  loader: 'mol-loader',
  loaderFill: 'mol-loader-fill',
};

function seededRandom(seed) {
  let t = seed + 0x6d2b79f5;
  return () => {
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * @param {number} unit 0–99
 */
function decodeUnit(unit) {
  const u = ((unit % UNIT_COUNT) + UNIT_COUNT) % UNIT_COUNT;
  return {
    structureIndex: u % STRUCTURE_COUNT,
    patternIndex: Math.floor(u / STRUCTURE_COUNT) % COLOR_PATTERN_COUNT,
  };
}

/**
 * @param {number} unit 0–99
 * @param {string} [owner]
 * @param {string} [rewards]
 */
function makeEntry(unit, owner, rewards) {
  const { structureIndex, patternIndex } = decodeUnit(unit);
  const tokenId = unit + 1;
  return {
    tokenId,
    chainId: `#${String(tokenId).padStart(4, '0')}`,
    owner: owner ?? '0x0000…0000',
    rewardsLabel: rewards ?? 'Accruing…',
    structureIndex,
    patternIndex,
  };
}

function buildPlaceholderEntries() {
  return Array.from({ length: UNIT_COUNT }, (_, unit) => {
    const rand = seededRandom((unit + 1) * 7919 + 104729);
    const hexChar = () => Math.floor(rand() * 16).toString(16);
    let wallet = '0x';
    for (let i = 0; i < 40; i += 1) wallet += hexChar();
    const rewards = `${(0.0008 + rand() * 0.048).toFixed(4)} ETH`;
    return makeEntry(unit, `${wallet.slice(0, 6)}…${wallet.slice(-4)}`, rewards);
  });
}

/**
 * @param {import('../../web3/protocol.js').MintedHash[]} hashes
 */
function buildLiveEntries(hashes) {
  return hashes.map((hash) => {
    const { structureIndex, patternIndex } = decodeUnit(hash.tokenId - 1);
    return {
      tokenId: hash.tokenId,
      chainId: hash.hashId,
      owner: hash.ownerShort,
      rewardsLabel: hash.claimableEth > 0 ? `${hash.claimableEth.toFixed(4)} ETH` : 'Accruing…',
      structureIndex,
      patternIndex,
    };
  });
}

/**
 * Sets up the interactive 100-unit Chain NFT browser on a 3D stage.
 *
 * @param {{
 *   stageId: string,
 *   ids?: Partial<typeof DEFAULT_IDS>,
 *   panelSelector?: string,
 *   autoAdvanceMs?: number,
 *   brandName?: string,
 *   tokenSymbol?: string,
 *   nftPlural?: string,
 *   holdLabel?: string,
 * }} options
 */
export function createChainBrowser(options) {
  const ids = { ...DEFAULT_IDS, ...(options.ids ?? {}) };
  const panelSelector = options.panelSelector ?? '.mol-presenter';
  const autoAdvanceMs = options.autoAdvanceMs ?? 8000;
  const brandName = options.brandName ?? 'UniChain';

  const stage = document.getElementById(options.stageId);
  if (!stage) return { dispose() {} };

  const el = (key) => document.getElementById(ids[key]);

  /** @type {ReturnType<typeof buildPlaceholderEntries>} */
  let entries = [];
  let currentIndex = 0;
  let busy = false;
  /** @type {number | null} */
  let autoAdvanceId = null;

  const presenter = new ChainMorphPresenter(stage, { interactive: true });

  function setLoader(visible, progress = 0) {
    const loader = el('loader');
    const fill = el('loaderFill');
    if (!loader) return;
    loader.classList.toggle('is-hidden', !visible);
    loader.setAttribute('aria-hidden', visible ? 'false' : 'true');
    if (fill) fill.style.width = `${Math.round(progress * 100)}%`;
  }

  function setText(key, value) {
    const node = el(key);
    if (node) node.textContent = value;
  }

  function updateMeta(entry, snapshot) {
    setText('title', `Chain ${entry.chainId}`);
    setText('sub', `${snapshot.name} · ${snapshot.atoms.length} atoms · ${snapshot.bonds.length} bonds`);
    setText('chainId', entry.chainId);
    setText('molecule', `${snapshot.name} · structure ${entry.structureIndex + 1}/${STRUCTURE_COUNT}`);
    setText('atoms', String(snapshot.atoms.length));
    setText('owner', entry.owner);
    setText('rewards', entry.rewardsLabel);
    setText('pattern', `pattern ${entry.patternIndex + 1}/${COLOR_PATTERN_COUNT}`);
    setText('kicker', liveDataEnabled ? 'Live on-chain Chain NFT' : 'Preview Chain NFT');
    setText('progressText', `${currentIndex + 1} / ${entries.length}`);

    const progressFill = el('progressFill');
    if (progressFill) {
      progressFill.style.width = entries.length > 1
        ? `${((currentIndex + 1) / entries.length) * 100}%`
        : '100%';
    }
  }

  async function presentAt(index) {
    if (entries.length === 0 || busy) return;

    const safeIndex = ((index % entries.length) + entries.length) % entries.length;
    currentIndex = safeIndex;
    const entry = entries[safeIndex];

    const molecule = PDB_MOLECULE_LIST[entry.structureIndex];
    const colorPattern = getColorPattern(entry.patternIndex);

    busy = true;
    document.querySelector(panelSelector)?.classList.add('is-transitioning');

    try {
      const snapshot = await presenter.present({
        name: molecule.name,
        file: molecule.file,
        colorPattern,
      });
      if (snapshot) updateMeta(entry, snapshot);
    } catch (error) {
      console.error(`[${brandName}] Could not render ${molecule.name} (${molecule.file}):`, error);
    } finally {
      busy = false;
      document.querySelector(panelSelector)?.classList.remove('is-transitioning');
    }
  }

  function scheduleAutoAdvance() {
    if (autoAdvanceId !== null) clearInterval(autoAdvanceId);
    autoAdvanceId = window.setInterval(() => {
      if (!busy) presentAt(currentIndex + 1);
    }, autoAdvanceMs);
  }

  function bindControls() {
    el('prev')?.addEventListener('click', () => {
      presentAt(currentIndex - 1);
      scheduleAutoAdvance();
    });
    el('next')?.addEventListener('click', () => {
      presentAt(currentIndex + 1);
      scheduleAutoAdvance();
    });
    el('shuffle')?.addEventListener('click', () => {
      presentAt(Math.floor(Math.random() * entries.length));
      scheduleAutoAdvance();
    });
  }

  async function boot() {
    setLoader(true, 0.4);

    if (!liveDataEnabled) {
      entries = buildPlaceholderEntries();
      setText('hint', `${STRUCTURE_COUNT} structures × ${COLOR_PATTERN_COUNT} color patterns = ${UNIT_COUNT} units · drag to orbit.`);
      setLoader(true, 0.9);
      await presentAt(0);
      setLoader(false);
      bindControls();
      scheduleAutoAdvance();
      return;
    }

    try {
      const minted = await readMintedCount();
      if (minted > 0) {
        const hashes = await loadMintedHashes({ sampleSize: minted });
        entries = buildLiveEntries(hashes);
      }
      if (entries.length === 0) entries = buildPlaceholderEntries();

      setLoader(true, 0.9);
      await presentAt(0);
      setLoader(false);
      bindControls();
      scheduleAutoAdvance();
    } catch (error) {
      console.error(`[${brandName}] Chain browser boot failed:`, error);
      entries = buildPlaceholderEntries();
      await presentAt(0);
      setLoader(false);
      bindControls();
      scheduleAutoAdvance();
    }
  }

  boot();

  return {
    presentAt,
    dispose() {
      if (autoAdvanceId !== null) clearInterval(autoAdvanceId);
      presenter.dispose();
    },
  };
}
