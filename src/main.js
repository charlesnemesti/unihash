import './style.css';
import { createHackedTypewriter, HERO_TYPEWRITER_TEXT } from './hacked-typewriter.js';
import { liveDataEnabled, LAUNCH_TERMINAL_MESSAGE } from './config/launch.js';
import { initLaunchHeroStats } from './launch-terminal-stats.js';
import { initCaStrip } from './ca-strip.js';
import {
  BRAND_NAME,
  TOKEN_SYMBOL,
  NFT_NAME_PLURAL,
} from './config/brand.js';
import {
  readUnitFromChain,
  computeHoldProgress,
  isHoldEligible,
  HOLDER_THRESHOLD_FALLBACK,
  HOLDER_THRESHOLD_LABEL,
} from './config/holder.js';
import { createChainBrowser } from './three/pdb/chain-browser.js';
import {
  connect,
  tryAutoConnect,
  refresh,
  claim,
  disconnect,
  initWalletListeners,
  contractsConfigured,
  initWalletModal,
  openWalletModal,
  closeWalletDropdowns,
  initWalletDropdown,
  readProtocolStats,
  readTokenMetadata,
  UNISWAP_BUY_URL,
  ETHERSCAN_TOKEN_URL,
} from './web3/index.js';

// ═══════════════════════════════════════════════════════════════════════════
// THREE.JS — INTERACTIVE MOLECULAR CHAIN NFT BROWSER (hero focal point)
// ═══════════════════════════════════════════════════════════════════════════

/** @type {ReturnType<typeof createChainBrowser> | null} */
let chainBrowser = null;

/** @type {number} */
let holdThreshold = HOLDER_THRESHOLD_FALLBACK;

/** @type {ReturnType<typeof createHackedTypewriter> | null} */
let heroTypewriter = null;

function initHeroTypewriter() {
  const element = document.getElementById('hero-typewriter');
  if (!element) return;

  heroTypewriter?.dispose();
  heroTypewriter = createHackedTypewriter(element, {
    text: HERO_TYPEWRITER_TEXT,
    cycleMs: 10000,
    scrambleTicks: 4,
  });
  heroTypewriter.start();
}

function disposeHeroTypewriter() {
  heroTypewriter?.dispose();
  heroTypewriter = null;
}

function initChainBrowser() {
  const container = document.getElementById('hero-canvas');
  if (!container) return;

  container.classList.add('site-bg-canvas--interactive');
  chainBrowser = createChainBrowser({
    stageId: 'hero-canvas',
    panelSelector: '.lab-card',
    ids: {
      title: 'lab-title',
      sub: 'lab-sub',
      chainId: 'lab-chain-id',
      molecule: 'lab-molecule',
      atoms: 'lab-atoms',
      owner: 'lab-owner',
      rewards: 'lab-rewards',
      pattern: 'lab-pattern',
      progressText: 'lab-progress-text',
      progressFill: 'lab-progress-fill',
      kicker: 'lab-kicker',
      hint: 'lab-hint',
      prev: 'lab-prev',
      next: 'lab-next',
      shuffle: 'lab-shuffle',
      loader: 'lab-loader',
      loaderFill: 'lab-loader-fill',
    },
    brandName: BRAND_NAME,
    tokenSymbol: TOKEN_SYMBOL,
    holdLabel: HOLDER_THRESHOLD_LABEL,
  });
}

function disposeChainBrowser() {
  chainBrowser?.dispose();
  chainBrowser = null;
  document.getElementById('hero-canvas')?.classList.remove('site-bg-canvas--interactive');
}

function updateHoldVisuals(balance) {
  const progress = computeHoldProgress(balance, holdThreshold);
  const eligible = isHoldEligible(balance, holdThreshold);

  const fill = document.getElementById('hold-progress-fill');
  const value = document.getElementById('hold-progress-value');
  const note = document.getElementById('hold-progress-note');

  if (fill) fill.style.width = `${Math.round(progress * 100)}%`;

  const held = Math.min(balance, holdThreshold);
  if (value) {
    value.textContent = liveDataEnabled && state.connected
      ? `${formatNumber(held)} / ${HOLDER_THRESHOLD_LABEL}`
      : `0 / ${HOLDER_THRESHOLD_LABEL}`;
  }

  if (note) {
    note.classList.remove('is-stable', 'is-burning');
    if (eligible) {
      note.textContent = `Chain stable — ${NFT_NAME_PLURAL} forging on-chain`;
      note.classList.add('is-stable');
    } else if (balance > 0 && balance < holdThreshold) {
      note.textContent = `Unstable — drop below ${HOLDER_THRESHOLD_LABEL} burns your Chain`;
      note.classList.add('is-burning');
    } else {
      note.textContent = `Hold ${HOLDER_THRESHOLD_LABEL} ${TOKEN_SYMBOL} to forge a molecular Chain`;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// WEB3 UI — WALLET PANEL (viem + contract reads/writes)
// ═══════════════════════════════════════════════════════════════════════════

const state = {
  connected: false,
  address: null,
  claiming: false,
  refreshing: false,
  hashBalance: 0,
  hashesOwned: 0,
  claimableEth: 0,
};

const $ = (id) => document.getElementById(id);

const btnConnectHeader = $('btn-connect-header');
const btnConnectHeaderLabel = $('btn-connect-header-label');
const btnConnectWallet = $('btn-connect-wallet');
const btnConnectWalletLabel = $('btn-connect-wallet-label');
const walletDropdownHeader = $('wallet-dropdown-header');
const walletDropdownPanel = $('wallet-dropdown-panel');
const btnClaim = $('btn-claim');
const statusText = $('status-text');
const walletTerminalLine = $('wallet-terminal-line');
const walletStatus = $('wallet-status');
const statBalance = $('stat-balance');
const statOwned = $('stat-owned');
const statClaimable = $('stat-claimable');

function formatWalletError(error) {
  const message = error?.shortMessage ?? error?.message ?? 'Connection failed.';

  if (message.includes('Failed to fetch') || message.includes('HTTP request failed')) {
    return 'RPC unreachable. Retrying with public endpoints — check your network and try again.';
  }

  if (message.length > 160) {
    return `${message.slice(0, 157)}…`;
  }

  return message;
}

function setStatus(message, tone = 'neutral') {
  const tones = {
    neutral: 'text-white',
    success: 'text-fluor',
    error: 'text-fluor',
    warn: 'text-fluor',
  };

  statusText.className = tones[tone] ?? tones.neutral;
  statusText.textContent = message;
}

function truncateAddress(address) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatNumber(n) {
  if (!Number.isFinite(n)) return '0';
  if (Number.isInteger(n)) return n.toLocaleString('en-US');
  return n.toLocaleString('en-US', { maximumFractionDigits: 4 });
}

function formatEth(n) {
  if (!Number.isFinite(n) || n <= 0) return '0 ETH';
  return `${n.toFixed(4)} ETH`;
}

function applyBalances(balances) {
  state.hashBalance = balances.hashBalance;
  state.hashesOwned = balances.hashesOwned;
  state.claimableEth = balances.claimableEth;
  updateHoldVisuals(state.hashBalance);
}

function applyConnection(address, balances) {
  state.connected = true;
  state.address = address;
  applyBalances(balances);
}

function clearConnection() {
  state.connected = false;
  state.address = null;
  state.hashBalance = 0;
  state.hashesOwned = 0;
  state.claimableEth = 0;
  updateHoldVisuals(0);
}

/** @type {ReturnType<typeof initWalletDropdown> | null} */
let headerDropdown = null;

/** @type {ReturnType<typeof initWalletDropdown> | null} */
let panelDropdown = null;

function updateUI() {
  const busy = state.claiming || state.refreshing;
  const connectLabel = state.connected && state.address
    ? truncateAddress(state.address)
    : 'Connect';

  headerDropdown?.setLabel(connectLabel);
  panelDropdown?.setLabel(connectLabel);
  headerDropdown?.setConnected(state.connected);
  panelDropdown?.setConnected(state.connected);

  btnConnectHeader.disabled = busy;
  btnConnectWallet.disabled = busy;
  btnClaim.disabled = !state.connected || busy || state.claimableEth <= 0;

  if (state.connected) {
    walletTerminalLine.textContent = `> connected: ${state.address}`;
    walletTerminalLine.className = 'mb-8 font-mono text-sm text-fluor';

    if (liveDataEnabled) {
      statBalance.textContent = formatNumber(state.hashBalance);
      statOwned.textContent = String(state.hashesOwned);
      statClaimable.textContent = formatEth(state.claimableEth);
      walletStatus.textContent = busy ? 'Processing' : 'Active';
    } else {
      statBalance.textContent = '·';
      statOwned.textContent = '·';
      statClaimable.textContent = '·';
      walletStatus.textContent = 'Ready after launch';
    }

    walletStatus.className = 'text-fluor';
  } else {
    walletTerminalLine.textContent = '> awaiting connection…';
    walletTerminalLine.className = 'mb-8 font-mono text-sm text-white';
    statBalance.textContent = '·';
    statOwned.textContent = '·';
    statClaimable.textContent = '·';
    walletStatus.textContent = 'Idle';
    walletStatus.className = 'text-white';
  }
}

function openConnectModal() {
  if (state.claiming) return;
  closeWalletDropdowns();
  openWalletModal();
}

function changeWallet() {
  if (state.claiming) return;
  closeWalletDropdowns();
  openWalletModal();
}

async function handleDisconnect() {
  if (state.claiming) return;

  disconnect();
  clearConnection();
  closeWalletDropdowns();
  setStatus('Wallet disconnected.', 'neutral');
  updateUI();
}

async function connectWithProvider(provider, rdns) {
  setStatus('Requesting wallet connection...', 'warn');
  walletStatus.textContent = 'Connecting';

  try {
    const { address, balances } = await connect(provider, rdns);
    applyConnection(address, balances);

    if (!contractsConfigured()) {
      setStatus('Connected. Set contract addresses in .env to read balances.', 'warn');
    } else if (!liveDataEnabled) {
      setStatus(`Connected. ${LAUNCH_TERMINAL_MESSAGE}.`, 'warn');
    } else if (balances.claimableEth > 0) {
      setStatus('Connected. Rewards ready to claim.', 'success');
    } else {
      setStatus('Connected. Wallet synced on-chain.', 'success');
    }

    updateUI();
  } catch (error) {
    console.error(`[${BRAND_NAME}] Wallet connection failed:`, error);
    setStatus(formatWalletError(error), 'error');
    walletStatus.textContent = 'Idle';
  }
}

async function claimRewards() {
  if (!state.connected || state.claiming || state.claimableEth <= 0) return;

  state.claiming = true;
  updateUI();
  setStatus('Claiming protocol rewards...', 'warn');

  try {
    const claimed = state.claimableEth;
    await claim(state.address);
    const balances = await refresh(state.address);
    applyBalances(balances);
    setStatus(`Claimed ${formatEth(claimed)} from treasury.`, 'success');
  } catch (error) {
    console.error(`[${BRAND_NAME}] Claim failed:`, error);
    setStatus(error?.shortMessage ?? error?.message ?? 'Claim failed. Retry when ready.', 'error');
  } finally {
    state.claiming = false;
    updateUI();
  }
}

async function handleAccountChange(address) {
  if (!address) {
    await handleDisconnect();
    return;
  }

  state.refreshing = true;
  updateUI();

  try {
    const balances = await refresh(address);
    applyConnection(address, balances);
    setStatus('Account switched. Balances updated.', 'success');
  } catch (error) {
    console.error(`[${BRAND_NAME}] Refresh failed:`, error);
    setStatus('Could not refresh balances.', 'error');
  } finally {
    state.refreshing = false;
    updateUI();
  }
}

async function tryRestoreSession() {
  const session = await tryAutoConnect();
  if (!session) return;

  applyConnection(session.address, session.balances);
  setStatus('Wallet reconnected.', 'success');
  updateUI();
}

async function initHeroStats() {
  const ids = ['stat-hashes', 'stat-holders', 'stat-spawned'];

  if (!liveDataEnabled) {
    initLaunchHeroStats(ids, 'hero-stats-launch');
    return;
  }

  ids.forEach((id) => {
    const el = $(id);
    if (el) el.textContent = '·';
  });

  if (!contractsConfigured()) return;

  try {
    const stats = await readProtocolStats();
    if (!stats) return;

    animateStat('stat-hashes', stats.hashesAlive);
    animateStat('stat-holders', stats.holders);
    animateStat('stat-spawned', stats.blocksSpawned);
  } catch (error) {
    console.error(`[${BRAND_NAME}] Could not load protocol stats:`, error);
    ids.forEach((id) => {
      const el = $(id);
      if (el) el.textContent = '—';
    });
  }
}

function animateStat(id, target) {
  const el = $(id);
  if (!el) return;

  const safeTarget = Number.isFinite(target) ? Math.max(0, target) : 0;
  if (safeTarget === 0) {
    el.textContent = '0';
    return;
  }

  let current = 0;
  const step = Math.max(1, Math.ceil(safeTarget / 60));

  const tick = () => {
    current = Math.min(current + step, safeTarget);
    el.textContent = formatNumber(current);
    if (current < safeTarget) requestAnimationFrame(tick);
  };

  requestAnimationFrame(tick);
}

function initBuyLinks() {
  document.querySelectorAll('.buy-hash-link').forEach((link) => {
    link.href = UNISWAP_BUY_URL;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
  });
}

async function initTokenomics() {
  if (!liveDataEnabled) return;

  const supplyEl = $('token-total-supply');
  const symbolEl = $('token-symbol');
  if (!supplyEl) return;

  if (!contractsConfigured()) {
    supplyEl.textContent = '—';
    return;
  }

  try {
    const meta = await readTokenMetadata();
    if (!meta) return;

    supplyEl.textContent = formatNumber(meta.totalSupply);
    if (symbolEl) symbolEl.textContent = `$${meta.symbol}`;
  } catch (error) {
    console.error(`[${BRAND_NAME}] Could not load token metadata:`, error);
    supplyEl.textContent = '—';
  }
}

async function initLandingOnChainContent() {
  // The landing page now uses static 3D molecular collection graphics.
  // Live owned Chains are surfaced by the hero Chain browser and wallet panel.
}

function initWeb3UI() {
  const dropdownOptions = {
    isConnected: () => state.connected,
    onConnect: openConnectModal,
    onChangeWallet: changeWallet,
    onDisconnect: handleDisconnect,
  };

  if (walletDropdownHeader && btnConnectHeader && btnConnectHeaderLabel) {
    headerDropdown = initWalletDropdown({
      root: walletDropdownHeader,
      trigger: btnConnectHeader,
      label: btnConnectHeaderLabel,
      menu: walletDropdownHeader.querySelector('.wallet-dropdown-menu'),
      ...dropdownOptions,
    });
  }

  if (walletDropdownPanel && btnConnectWallet && btnConnectWalletLabel) {
    panelDropdown = initWalletDropdown({
      root: walletDropdownPanel,
      trigger: btnConnectWallet,
      label: btnConnectWalletLabel,
      menu: walletDropdownPanel.querySelector('.wallet-dropdown-menu'),
      ...dropdownOptions,
    });
  }

  btnClaim.addEventListener('click', claimRewards);

  initWalletModal(connectWithProvider);
  initWalletListeners(handleAccountChange);
  tryRestoreSession();

  initHeroStats();
  initBuyLinks();
  initTokenomics();
  initLandingOnChainContent();
  updateUI();
}

async function initHoldThreshold() {
  if (contractsConfigured() && liveDataEnabled) {
    holdThreshold = await readUnitFromChain();
  }
  updateHoldVisuals(state.hashBalance);
}

// ═══════════════════════════════════════════════════════════════════════════
// BOOT
// ═══════════════════════════════════════════════════════════════════════════

initChainBrowser();
initHeroTypewriter();
initCaStrip();
initHoldThreshold();
initWeb3UI();

// Optional cleanup if hot-reloaded in dev
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    disposeChainBrowser();
    disposeHeroTypewriter();
  });
}
