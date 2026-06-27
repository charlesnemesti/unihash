import * as THREE from 'three';

/** 10 fixed structures × 10 color patterns = 100 Chain NFT units. */
export const COLOR_PATTERN_COUNT = 10;

/**
 * @param {number} h 0–360
 * @param {number} s 0–1
 * @param {number} l 0–1
 */
function hsl(h, s, l) {
  const color = new THREE.Color();
  color.setHSL((((h % 360) + 360) % 360) / 360, s, l);
  return color;
}

/**
 * @typedef {Object} ColorPattern
 * @property {number} index
 * @property {string} name
 * @property {THREE.Color} C
 * @property {THREE.Color} O
 * @property {THREE.Color} N
 * @property {THREE.Color} H
 * @property {THREE.Color} fallback
 * @property {number} bond
 */

/** @type {ColorPattern[]} */
const PATTERNS = Array.from({ length: COLOR_PATTERN_COUNT }, (_, index) => {
  const baseHue = index * (360 / COLOR_PATTERN_COUNT);
  return {
    index,
    name: `pattern-${String(index + 1).padStart(2, '0')}`,
    C: hsl(baseHue, 0.85, 0.55),
    O: hsl(baseHue + 150, 0.95, 0.55),
    N: hsl(baseHue + 60, 0.9, 0.6),
    H: hsl(baseHue + 20, 0.35, 0.85),
    fallback: hsl(baseHue + 200, 0.8, 0.6),
    bond: hsl(baseHue, 0.18, 0.82).getHex(),
  };
});

const ELEMENT_KEYS = new Set(['C', 'O', 'N', 'H']);

/**
 * @param {number} patternIndex 0–9
 * @returns {ColorPattern}
 */
export function getColorPattern(patternIndex) {
  const i = ((patternIndex % COLOR_PATTERN_COUNT) + COLOR_PATTERN_COUNT) % COLOR_PATTERN_COUNT;
  return PATTERNS[i];
}

/**
 * @param {string} element capitalized element symbol (e.g. 'C', 'O')
 * @param {ColorPattern} pattern
 * @returns {THREE.Color}
 */
export function colorForElement(element, pattern) {
  const key = (element ?? 'C').toUpperCase();
  if (ELEMENT_KEYS.has(key)) {
    return pattern[key].clone();
  }
  return pattern.fallback.clone();
}

/**
 * Random pattern index for the randomizer.
 */
export function randomColorPatternIndex() {
  return Math.floor(Math.random() * COLOR_PATTERN_COUNT);
}
