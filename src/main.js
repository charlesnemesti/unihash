import './style.css';
import * as THREE from 'three';
import {
  connect,
  tryAutoConnect,
  refresh,
  claim,
  initWalletListeners,
  contractsConfigured,
} from './web3/index.js';

// ═══════════════════════════════════════════════════════════════════════════
// THREE.JS — HERO LANDING (animation groups)
// Based on: three.js/examples/misc_animation_groups.html
// ═══════════════════════════════════════════════════════════════════════════

/** @type {THREE.Scene} */
let heroScene;
/** @type {THREE.PerspectiveCamera} */
let heroCamera;
/** @type {THREE.WebGLRenderer} */
let heroRenderer;
/** @type {THREE.AnimationMixer} */
let heroMixer;
/** @type {THREE.Clock} */
let heroClock;
/** @type {HTMLElement | null} */
let heroContainer = null;
/** @type {number | null} */
let heroAnimationId = null;

function initHeroAnimationGroups() {
  heroContainer = document.getElementById('hero-canvas');
  if (!heroContainer) return;

  heroScene = new THREE.Scene();
  heroScene.background = new THREE.Color(0x000000);

  heroCamera = new THREE.PerspectiveCamera(40, 1, 1, 1000);
  heroCamera.position.set(50, 50, 100);
  heroCamera.lookAt(heroScene.position);

  heroRenderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  });
  heroRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  heroContainer.appendChild(heroRenderer.domElement);

  // All meshes share one animation state via AnimationObjectGroup
  const animationGroup = new THREE.AnimationObjectGroup();
  const geometry = new THREE.BoxGeometry(5, 5, 5);
  const material = new THREE.MeshBasicMaterial({
    transparent: true,
    color: 0x000000,
    opacity: 0.85,
  });

  for (let i = 0; i < 5; i++) {
    for (let j = 0; j < 5; j++) {
      const mesh = new THREE.Mesh(geometry, material.clone());
      mesh.position.x = 32 - 16 * i;
      mesh.position.y = 0;
      mesh.position.z = 32 - 16 * j;
      heroScene.add(mesh);
      animationGroup.add(mesh);
    }
  }

  const xAxis = new THREE.Vector3(1, 0, 0);
  const qInitial = new THREE.Quaternion().setFromAxisAngle(xAxis, 0);
  const qFinal = new THREE.Quaternion().setFromAxisAngle(xAxis, Math.PI);

  const quaternionKF = new THREE.QuaternionKeyframeTrack(
    '.quaternion',
    [0, 1, 2],
    [
      qInitial.x, qInitial.y, qInitial.z, qInitial.w,
      qFinal.x, qFinal.y, qFinal.z, qFinal.w,
      qInitial.x, qInitial.y, qInitial.z, qInitial.w,
    ],
  );

  // Fluor yellow → white → black (UniHash palette)
  const colorKF = new THREE.ColorKeyframeTrack(
    '.material.color',
    [0, 1, 2],
    [
      0.875, 1, 0,   // #DFFF00 fluor
      1, 1, 1,       // white
      0.05, 0.05, 0, // near-black
    ],
    THREE.InterpolateDiscrete,
  );

  const opacityKF = new THREE.NumberKeyframeTrack(
    '.material.opacity',
    [0, 1, 2],
    [0.95, 0.35, 0.9],
  );

  const clip = new THREE.AnimationClip('unihash-hero', 3, [quaternionKF, colorKF, opacityKF]);

  heroMixer = new THREE.AnimationMixer(animationGroup);
  heroMixer.clipAction(clip).play();

  heroClock = new THREE.Clock();

  window.addEventListener('resize', onHeroResize);
  onHeroResize();
  animateHero();
}

function onHeroResize() {
  if (!heroContainer || !heroCamera || !heroRenderer) return;

  const width = heroContainer.clientWidth;
  const height = heroContainer.clientHeight;

  heroCamera.aspect = width / height;
  heroCamera.updateProjectionMatrix();
  heroRenderer.setSize(width, height, false);
}

function animateHero() {
  heroAnimationId = requestAnimationFrame(animateHero);

  const delta = heroClock.getDelta();
  heroMixer?.update(delta);
  heroRenderer?.render(heroScene, heroCamera);
}

function disposeHeroAnimation() {
  if (heroAnimationId !== null) cancelAnimationFrame(heroAnimationId);
  window.removeEventListener('resize', onHeroResize);

  heroMixer?.stopAllAction();
  heroRenderer?.dispose();

  heroScene?.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.geometry?.dispose();
      object.material?.dispose();
    }
  });

  heroRenderer?.domElement?.remove();
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
const btnConnectWallet = $('btn-connect-wallet');
const btnClaim = $('btn-claim');
const statusText = $('status-text');
const walletTerminalLine = $('wallet-terminal-line');
const walletStatus = $('wallet-status');
const statBalance = $('stat-balance');
const statOwned = $('stat-owned');
const statClaimable = $('stat-claimable');

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
}

function updateUI() {
  const busy = state.claiming || state.refreshing;
  const connectLabel = state.connected && state.address
    ? truncateAddress(state.address)
    : 'Connect';

  btnConnectHeader.textContent = connectLabel;
  btnConnectWallet.textContent = state.connected ? 'Connected' : 'Connect';

  btnConnectHeader.disabled = busy;
  btnConnectWallet.disabled = busy || state.connected;
  btnClaim.disabled = !state.connected || busy || state.claimableEth <= 0;

  if (state.connected) {
    walletTerminalLine.textContent = `> connected: ${state.address}`;
    walletTerminalLine.className = 'mb-8 font-mono text-sm text-fluor';
    statBalance.textContent = formatNumber(state.hashBalance);
    statOwned.textContent = String(state.hashesOwned);
    statClaimable.textContent = formatEth(state.claimableEth);
    walletStatus.textContent = busy ? 'Processing' : 'Active';
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

async function connectWallet() {
  if (state.connected || state.claiming) return;

  setStatus('Requesting wallet connection...', 'warn');
  walletStatus.textContent = 'Connecting';

  try {
    const { address, balances } = await connect();
    applyConnection(address, balances);

    if (!contractsConfigured()) {
      setStatus('Connected. Set contract addresses in .env to read balances.', 'warn');
    } else if (balances.claimableEth > 0) {
      setStatus('Connected. Rewards ready to claim.', 'success');
    } else {
      setStatus('Connected. Wallet synced on-chain.', 'success');
    }

    updateUI();
  } catch (error) {
    console.error('[UniHash] Wallet connection failed:', error);
    setStatus(error?.message ?? 'Connection rejected. Retry when ready.', 'error');
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
    console.error('[UniHash] Claim failed:', error);
    setStatus(error?.shortMessage ?? error?.message ?? 'Claim failed. Retry when ready.', 'error');
  } finally {
    state.claiming = false;
    updateUI();
  }
}

async function handleAccountChange(address) {
  if (!address) {
    clearConnection();
    setStatus('Wallet disconnected.', 'neutral');
    updateUI();
    return;
  }

  state.refreshing = true;
  updateUI();

  try {
    const balances = await refresh(address);
    applyConnection(address, balances);
    setStatus('Account switched. Balances updated.', 'success');
  } catch (error) {
    console.error('[UniHash] Refresh failed:', error);
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

function initHeroStats() {
  const targets = {
    'stat-hashes': 1284,
    'stat-holders': 412,
    'stat-spawned': 89_204,
  };

  Object.entries(targets).forEach(([id, target]) => {
    const el = $(id);
    if (!el) return;

    let current = 0;
    const step = Math.ceil(target / 60);

    const tick = () => {
      current = Math.min(current + step, target);
      el.textContent = formatNumber(current);
      if (current < target) requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  });
}

function initWeb3UI() {
  btnConnectHeader.addEventListener('click', connectWallet);
  btnConnectWallet.addEventListener('click', connectWallet);
  btnClaim.addEventListener('click', claimRewards);

  initWalletListeners(handleAccountChange);
  tryRestoreSession();

  initHeroStats();
  updateUI();
}

// ═══════════════════════════════════════════════════════════════════════════
// BOOT
// ═══════════════════════════════════════════════════════════════════════════

initHeroAnimationGroups();
initWeb3UI();

// Optional cleanup if hot-reloaded in dev
if (import.meta.hot) {
  import.meta.hot.dispose(() => disposeHeroAnimation());
}
