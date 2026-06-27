/**
 * Procedural molecular chain generator for UniChain NFT presentation.
 * Each seed yields a unique topology (layout, elements, branches).
 */

/** @typedef {'C' | 'O' | 'N' | 'H'} ElementSymbol */

/**
 * @typedef {Object} AtomSpec
 * @property {[number, number, number]} position
 * @property {ElementSymbol} element
 */

/**
 * @typedef {Object} BondSpec
 * @property {number} start
 * @property {number} end
 */

/**
 * @typedef {Object} MoleculeConfig
 * @property {number} seed
 * @property {string} chainId
 * @property {AtomSpec[]} atoms
 * @property {BondSpec[]} bonds
 * @property {'linear' | 'zigzag' | 'helix' | 'branch'} layout
 */

/**
 * @param {number} seed
 */
export function seededRandom(seed) {
  let t = (seed >>> 0) + 0x6d2b79f5;

  return () => {
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * @param {number} seed
 * @returns {MoleculeConfig}
 */
export function generateMoleculeConfig(seed) {
  const rand = seededRandom(seed);
  const layouts = /** @type {const} */ (['linear', 'zigzag', 'helix', 'branch']);
  const layout = layouts[Math.floor(rand() * layouts.length)];
  const atomCount = 8 + Math.floor(rand() * 9);
  /** @type {AtomSpec[]} */
  const atoms = [];
  /** @type {BondSpec[]} */
  const bonds = [];

  const step = 1.6 + rand() * 0.8;
  let x = 0;
  let y = 0;
  let z = 0;
  let angle = rand() * Math.PI * 2;

  for (let i = 0; i < atomCount; i += 1) {
    if (i > 0) {
      if (layout === 'linear') {
        x += step;
      } else if (layout === 'zigzag') {
        x += step;
        y += (i % 2 === 0 ? 1 : -1) * (0.65 + rand() * 0.35);
        z += (rand() - 0.5) * 0.25;
      } else if (layout === 'helix') {
        angle += 0.72 + rand() * 0.18;
        x += Math.cos(angle) * step * 0.85;
        y += Math.sin(angle) * step * 0.55;
        z += 0.38 + rand() * 0.12;
      } else {
        x += step * (0.7 + rand() * 0.5);
        y += (rand() - 0.5) * 1.1;
        z += (rand() - 0.5) * 0.9;
      }
    }

    const roll = rand();
    const element = roll > 0.88 ? 'O' : roll > 0.74 ? 'N' : 'C';

    atoms.push({
      position: [x, y, z],
      element,
    });

    if (i > 0) bonds.push({ start: i - 1, end: i });
  }

  if (layout === 'branch' && atoms.length > 5) {
    const anchor = 2 + Math.floor(rand() * (atoms.length - 4));
    const branchIdx = atoms.length;
    const [ax, ay, az] = atoms[anchor].position;
    atoms.push({
      position: [ax + (rand() - 0.5) * 2.2, ay + 1.4 + rand(), az + (rand() - 0.5) * 1.6],
      element: rand() > 0.5 ? 'O' : 'N',
    });
    bonds.push({ start: anchor, end: branchIdx });

    if (rand() > 0.55 && atoms.length < 18) {
      const leafIdx = atoms.length;
      const [bx, by, bz] = atoms[branchIdx].position;
      atoms.push({
        position: [bx + 0.9, by + 0.8, bz + (rand() - 0.5)],
        element: 'C',
      });
      bonds.push({ start: branchIdx, end: leafIdx });
    }
  }

  return {
    seed,
    chainId: `mol_${(seed >>> 0).toString(16).padStart(6, '0')}`,
    atoms,
    bonds,
    layout,
  };
}

/**
 * Random config — new topology every call.
 * @param {number} [tokenId] optional NFT id to mix into seed
 */
export function generateRandomMoleculeConfig(tokenId = 0) {
  const entropy =
    (Date.now() ^ (Math.random() * 0xffffffff)) >>> 0 ^
    ((tokenId * 2654435761) >>> 0);
  return generateMoleculeConfig(entropy);
}

/**
 * Stable config for a given NFT (reproducible per token).
 * @param {number} tokenId
 * @param {number} [salt]
 */
export function generateNftMoleculeConfig(tokenId, salt = 0) {
  const seed = ((tokenId * 7919 + 104729 + salt * 15485863) >>> 0);
  return generateMoleculeConfig(seed);
}

/**
 * Center and scale molecule positions to unit ball.
 * @param {MoleculeConfig} config
 */
export function normalizeMoleculeConfig(config) {
  const atoms = config.atoms.map((a) => ({ ...a, position: [...a.position] }));
  if (atoms.length === 0) return { ...config, atoms };

  let cx = 0;
  let cy = 0;
  let cz = 0;
  atoms.forEach((a) => {
    cx += a.position[0];
    cy += a.position[1];
    cz += a.position[2];
  });
  cx /= atoms.length;
  cy /= atoms.length;
  cz /= atoms.length;

  let maxDist = 0.001;
  atoms.forEach((a) => {
    a.position[0] -= cx;
    a.position[1] -= cy;
    a.position[2] -= cz;
    const d = Math.hypot(a.position[0], a.position[1], a.position[2]);
    if (d > maxDist) maxDist = d;
  });

  const scale = 1 / maxDist;
  atoms.forEach((a) => {
    a.position[0] *= scale;
    a.position[1] *= scale;
    a.position[2] *= scale;
  });

  return { ...config, atoms };
}
