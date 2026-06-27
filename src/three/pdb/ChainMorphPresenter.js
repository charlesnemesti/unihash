import * as THREE from 'three';
import { TrackballControls } from 'three/addons/controls/TrackballControls.js';
import { PDBLoader } from 'three/addons/loaders/PDBLoader.js';
import { pdbTheme as defaultTheme } from '../../config/pdb-theme.js';
import { moleculeUrl } from './pdb-registry.js';
import { buildSnapshotFromPdb } from './pdb-snapshot.js';
import { placeBondMesh } from './bond-utils.js';

/**
 * Faithful three.js webgl_loader_pdb.html renderer.
 * Rebuilds atom/bond meshes on every molecule change — no morphing, no pooling,
 * so bonds always stay glued to atoms exactly like the official example.
 */
export class ChainMorphPresenter {
  /**
   * @param {HTMLElement} container
   * @param {Partial<typeof defaultTheme>} [options]
   */
  constructor(container, options = {}) {
    this.container = container;
    this.theme = { ...defaultTheme, ...options };
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.autoRotate = options.autoRotate ?? true;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.theme.background ?? 0x050505);

    this.camera = new THREE.PerspectiveCamera(50, 1, 1, 5000);
    this.camera.position.z = options.cameraZ ?? 1000;

    this.root = new THREE.Group();
    this.scene.add(this.root);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.container.appendChild(this.renderer.domElement);

    this.loader = new PDBLoader();
    /** @type {Map<string, import('three/addons/loaders/PDBLoader.js').PDB>} */
    this.pdbCache = new Map();

    this.sphereGeometry = new THREE.IcosahedronGeometry(1, 3);
    this.boxGeometry = new THREE.BoxGeometry(1, 1, 1);

    /** @type {THREE.Mesh[]} */
    this.objects = [];

    this.addLights();

    this.controls = new TrackballControls(this.camera, this.renderer.domElement);
    this.controls.minDistance = 500;
    this.controls.maxDistance = 2000;
    this.controls.rotateSpeed = 2.2;
    this.controls.zoomSpeed = 1.1;

    this.disposed = false;
    this.animationId = null;

    this.onResize = this.onResize.bind(this);
    window.addEventListener('resize', this.onResize);
    this.onResize();
    this.animate();
  }

  addLights() {
    const light1 = new THREE.DirectionalLight(0xffffff, 2.5);
    light1.position.set(1, 1, 1);
    this.scene.add(light1);

    const light2 = new THREE.DirectionalLight(0xffffff, 1.5);
    light2.position.set(-1, -1, 1);
    this.scene.add(light2);
  }

  clearMolecule() {
    this.objects.forEach((mesh) => {
      this.root.remove(mesh);
      mesh.material?.dispose();
    });
    this.objects = [];
  }

  /**
   * @param {{ name: string, file: string }} request
   * @returns {Promise<import('three/addons/loaders/PDBLoader.js').PDB>}
   */
  async loadPdb(request) {
    if (this.pdbCache.has(request.file)) {
      return this.pdbCache.get(request.file);
    }
    const pdb = await new Promise((resolve, reject) => {
      this.loader.load(moleculeUrl(request.file), resolve, undefined, reject);
    });
    this.pdbCache.set(request.file, pdb);
    return pdb;
  }

  /**
   * @param {{ name: string, file: string, colorPattern?: import('./color-patterns.js').ColorPattern }} request
   * @returns {Promise<import('./pdb-snapshot.js').MoleculeSnapshot>}
   */
  async present(request) {
    const pdb = await this.loadPdb(request);
    if (this.disposed) return null;

    const snapshot = buildSnapshotFromPdb(pdb, request);
    this.buildMeshes(snapshot);
    return snapshot;
  }

  /**
   * @param {import('./pdb-snapshot.js').MoleculeSnapshot} snapshot
   */
  buildMeshes(snapshot) {
    this.clearMolecule();
    this.root.rotation.set(0, 0, 0);

    snapshot.atoms.forEach((atom) => {
      const material = new THREE.MeshPhongMaterial({ color: atom.color.clone() });
      const mesh = new THREE.Mesh(this.sphereGeometry, material);
      mesh.position.copy(atom.position);
      mesh.scale.setScalar(snapshot.atomRadius);
      this.root.add(mesh);
      this.objects.push(mesh);
    });

    snapshot.bonds.forEach((bond) => {
      const material = new THREE.MeshPhongMaterial({ color: snapshot.bondColor ?? 0xffffff });
      const mesh = new THREE.Mesh(this.boxGeometry, material);
      placeBondMesh(mesh, bond.start, bond.end, snapshot.bondRadius);
      this.root.add(mesh);
      this.objects.push(mesh);
    });
  }

  onResize() {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  animate() {
    this.animationId = requestAnimationFrame(() => this.animate());

    if (this.autoRotate) {
      const time = Date.now() * 0.0004;
      this.root.rotation.x = time;
      this.root.rotation.y = time * 0.7;
    }

    this.controls?.update();
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.disposed = true;
    if (this.animationId !== null) cancelAnimationFrame(this.animationId);
    window.removeEventListener('resize', this.onResize);
    this.controls?.dispose();
    this.clearMolecule();
    this.sphereGeometry.dispose();
    this.boxGeometry.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
