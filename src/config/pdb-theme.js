/** Visual tuning for PDB scenes — edit here to reshape the lab experience. */

export const pdbTheme = {
  background: 0x04060d,
  molecule: 'caffeine.pdb',
  atomScale: 22,
  bondThickness: 4,
  positionScale: 72,
  rotationSpeed: 0.00035,
  autoRotate: true,
  interactive: true,
  showLabels: false,
  enableBloom: false,

  palette: {
    elementC: 0x00e5ff,
    elementO: 0xff1a4b,
    elementN: 0x7b2fff,
    elementH: 0xc8e8ff,
    bondActive: 0x00e5ff,
    bondInactive: 0x1a2840,
    bondBurn: 0xff1a4b,
  },

  camera: {
    fov: 52,
    minDistance: 380,
    maxDistance: 1600,
    z: 900,
  },

  lights: {
    ambient: 0x223355,
    ambientIntensity: 0.45,
    key: 0xffffff,
    keyIntensity: 2.2,
    fill: 0x00e5ff,
    fillIntensity: 0.9,
  },
};
