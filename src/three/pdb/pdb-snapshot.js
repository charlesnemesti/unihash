import * as THREE from 'three';
import { colorForElement } from './color-patterns.js';

/** Same scale factors as three.js webgl_loader_pdb.html */
export const PDB_POSITION_SCALE = 75;
export const PDB_ATOM_RADIUS = 25;
export const PDB_BOND_RADIUS = 5;

/**
 * Every molecule is uniformly scaled so its bounding sphere reaches this radius
 * (world units). Because positions, atom radius and bond radius are all scaled
 * by the SAME factor, the ball-stick proportions stay identical to the three.js
 * example — it just frames each preset consistently regardless of real size.
 */
export const PDB_FIT_RADIUS = 380;

/**
 * @typedef {Object} AtomSnapshot
 * @property {THREE.Vector3} position
 * @property {THREE.Color} color
 * @property {string} element
 */

/**
 * @typedef {Object} BondSnapshot
 * @property {THREE.Vector3} start
 * @property {THREE.Vector3} end
 */

/**
 * @typedef {Object} MoleculeSnapshot
 * @property {string} name
 * @property {string} file
 * @property {AtomSnapshot[]} atoms
 * @property {BondSnapshot[]} bonds
 * @property {number} atomRadius
 * @property {number} bondRadius
 * @property {number} bondColor
 */

/**
 * Build a render-ready snapshot from PDBLoader output, matching three.js
 * webgl_loader_pdb.html geometry. Atom colors come from the active color
 * pattern (so each structure can be recolored); bonds come straight from
 * geometryBonds (center-to-center).
 *
 * @param {import('three/addons/loaders/PDBLoader.js').PDB} pdb
 * @param {{ name: string, file: string, colorPattern?: import('./color-patterns.js').ColorPattern }} meta
 * @returns {MoleculeSnapshot}
 */
export function buildSnapshotFromPdb(pdb, meta) {
  const { geometryAtoms, geometryBonds, json } = pdb;
  const offset = new THREE.Vector3();

  geometryAtoms.computeBoundingBox();
  geometryAtoms.boundingBox.getCenter(offset).negate();
  geometryAtoms.translate(offset.x, offset.y, offset.z);
  geometryBonds.translate(offset.x, offset.y, offset.z);

  const positions = geometryAtoms.getAttribute('position');
  const colors = geometryAtoms.getAttribute('color');
  const position = new THREE.Vector3();
  const pattern = meta.colorPattern;

  /** @type {AtomSnapshot[]} */
  const atoms = [];

  for (let i = 0; i < positions.count; i += 1) {
    position.set(positions.getX(i), positions.getY(i), positions.getZ(i));

    const atom = json.atoms[i];
    const element = atom?.[4] ?? 'C';
    const color = pattern
      ? colorForElement(element, pattern)
      : new THREE.Color(colors.getX(i), colors.getY(i), colors.getZ(i));

    atoms.push({
      position: position.clone().multiplyScalar(PDB_POSITION_SCALE),
      color,
      element,
    });
  }

  /** @type {BondSnapshot[]} */
  const bonds = [];
  const bondPositions = geometryBonds.getAttribute('position');
  const start = new THREE.Vector3();
  const end = new THREE.Vector3();

  for (let i = 0; i < bondPositions.count; i += 2) {
    start.set(bondPositions.getX(i), bondPositions.getY(i), bondPositions.getZ(i));
    end.set(bondPositions.getX(i + 1), bondPositions.getY(i + 1), bondPositions.getZ(i + 1));
    start.multiplyScalar(PDB_POSITION_SCALE);
    end.multiplyScalar(PDB_POSITION_SCALE);

    bonds.push({ start: start.clone(), end: end.clone() });
  }

  // Uniform fit-to-view: scale the whole molecule to a consistent bounding radius.
  let boundingRadius = 0;
  atoms.forEach((atom) => {
    boundingRadius = Math.max(boundingRadius, atom.position.length());
  });
  const fit = boundingRadius > 1e-6 ? PDB_FIT_RADIUS / boundingRadius : 1;

  atoms.forEach((atom) => atom.position.multiplyScalar(fit));
  bonds.forEach((bond) => {
    bond.start.multiplyScalar(fit);
    bond.end.multiplyScalar(fit);
  });

  return {
    name: meta.name,
    file: meta.file,
    atoms,
    bonds,
    atomRadius: PDB_ATOM_RADIUS * fit,
    bondRadius: PDB_BOND_RADIUS * fit,
    bondColor: pattern ? pattern.bond : 0xffffff,
  };
}
