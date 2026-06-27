/**
 * The 10 three.js PDB presets that render cleanly as Chain NFT structures.
 * (Crystal/large lattices like Al2O3, Cu, NaCl, YBCO, Graphite and the very
 * long Lycopene chain were dropped because they don't frame well.)
 */

export const STRUCTURE_COUNT = 10;

/** @type {{ name: string, file: string }[]} */
export const PDB_MOLECULE_LIST = [
  { name: 'Ethanol', file: 'ethanol.pdb' },
  { name: 'Aspirin', file: 'aspirin.pdb' },
  { name: 'Caffeine', file: 'caffeine.pdb' },
  { name: 'Nicotine', file: 'nicotine.pdb' },
  { name: 'LSD', file: 'lsd.pdb' },
  { name: 'Cocaine', file: 'cocaine.pdb' },
  { name: 'Cholesterol', file: 'cholesterol.pdb' },
  { name: 'Glucose', file: 'glucose.pdb' },
  { name: 'Cubane', file: 'cubane.pdb' },
  { name: 'Buckyball', file: 'buckyball.pdb' },
];

export const PDB_MOLECULE_NAMES = PDB_MOLECULE_LIST.map((m) => m.name);

/**
 * @param {number} index
 */
export function pickMoleculeByIndex(index) {
  const safe = ((index % STRUCTURE_COUNT) + STRUCTURE_COUNT) % STRUCTURE_COUNT;
  return PDB_MOLECULE_LIST[safe];
}

/**
 * @param {string} fileName
 */
export function moleculeUrl(fileName) {
  return `/models/pdb/${fileName}`;
}
