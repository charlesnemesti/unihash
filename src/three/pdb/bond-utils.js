/**
 * Place a box mesh as a bond between two points, exactly like
 * three.js webgl_loader_pdb.html: centered at the midpoint, scaled to the
 * full center-to-center distance, oriented toward the end atom.
 *
 * @param {import('three').Mesh} mesh
 * @param {import('three').Vector3} start atom-center start point
 * @param {import('three').Vector3} end atom-center end point
 * @param {number} radius bond box thickness
 */
export function placeBondMesh(mesh, start, end, radius) {
  const length = Math.max(start.distanceTo(end), 0.001);

  mesh.position.copy(start).lerp(end, 0.5);
  mesh.scale.set(radius, radius, length);
  mesh.lookAt(end);
}
