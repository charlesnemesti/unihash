import * as THREE from 'three';
import { TrackballControls } from 'three/addons/controls/TrackballControls.js';
import { PDBLoader } from 'three/addons/loaders/PDBLoader.js';
import { pdbTheme as defaultTheme } from '../../config/pdb-theme.js';
import { moleculeUrl } from './pdb-registry.js';
import { buildSnapshotFromPdb } from './pdb-snapshot.js';
import { placeBondMesh } from './bond-utils.js';

/**
 * Hero PDB viewer — real three.js preset molecules with hold-progress styling.
 */
export class PdbExperience {
  /**
   * @param {HTMLElement} container
   * @param {Partial<typeof defaultTheme> & { moleculeFile?: string, moleculeName?: string }} [options]
   */
  constructor(container, options = {}) {
    this.container = container;
    this.theme = { ...defaultTheme, ...options, palette: { ...defaultTheme.palette, ...options.palette } };
    this.moleculeFile = options.moleculeFile ?? 'caffeine.pdb';
    this.moleculeName = options.moleculeName ?? 'Caffeine';
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.state = 'unstable';
    this.holdProgress = 1;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.theme.background);

    this.camera = new THREE.PerspectiveCamera(52, 1, 1, 5000);
    this.camera.position.z = 1000;

    this.root = new THREE.Group();
    this.scene.add(this.root);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.container.appendChild(this.renderer.domElement);

    this.addLights();

    if (this.theme.interactive && !this.reducedMotion) {
      this.controls = new TrackballControls(this.camera, this.renderer.domElement);
      this.controls.minDistance = 500;
      this.controls.maxDistance = 2000;
      this.controls.rotateSpeed = 2.2;
    }

    this.loader = new PDBLoader();
    this.sphereGeometry = new THREE.IcosahedronGeometry(1, 3);
    this.boxGeometry = new THREE.BoxGeometry(1, 1, 1);
    this.atomMeshes = [];
    this.bondMeshes = [];
    this.disposed = false;
    this.animationId = null;

    this.onResize = this.onResize.bind(this);
    window.addEventListener('resize', this.onResize);
    this.onResize();

    this.loadMolecule(this.moleculeFile, this.moleculeName);

    if (!this.reducedMotion) {
      this.animate();
    }
  }

  addLights() {
    this.scene.add(new THREE.AmbientLight(0x334466, 0.5));
    const key = new THREE.DirectionalLight(0xffffff, 2.5);
    key.position.set(1, 1, 1);
    this.scene.add(key);
    const fill = new THREE.DirectionalLight(0x00e5ff, 1);
    fill.position.set(-1, -0.5, 1);
    this.scene.add(fill);
  }

  clearMolecule() {
    [...this.atomMeshes, ...this.bondMeshes].forEach((mesh) => {
      this.root.remove(mesh);
      mesh.geometry?.dispose();
      mesh.material?.dispose();
    });
    this.atomMeshes = [];
    this.bondMeshes = [];
  }

  loadMolecule(fileName, name) {
    this.loader.load(
      moleculeUrl(fileName),
      (pdb) => {
        if (this.disposed) return;
        this.clearMolecule();
        const snapshot = buildSnapshotFromPdb(pdb, { name, file: fileName });
        this.buildMeshes(snapshot);
        this.applyVisualState();
      },
      undefined,
      (err) => console.error('[UniChain PDB] load failed:', err),
    );
  }

  /**
   * @param {import('./pdb-snapshot.js').MoleculeSnapshot} snapshot
   */
  buildMeshes(snapshot) {
    snapshot.atoms.forEach((atom) => {
      const material = new THREE.MeshPhongMaterial({
        color: atom.color.clone(),
        emissive: atom.color.clone(),
        emissiveIntensity: 0.35,
        shininess: 80,
      });
      const mesh = new THREE.Mesh(this.sphereGeometry, material);
      mesh.position.copy(atom.position);
      mesh.scale.setScalar(snapshot.atomRadius);
      mesh.userData.element = atom.element;
      this.root.add(mesh);
      this.atomMeshes.push(mesh);
    });

    snapshot.bonds.forEach((bond) => {
      const material = new THREE.MeshPhongMaterial({ color: 0xffffff });
      const mesh = new THREE.Mesh(this.boxGeometry, material);
      placeBondMesh(mesh, bond.start, bond.end, snapshot.bondRadius);
      this.root.add(mesh);
      this.bondMeshes.push(mesh);
    });

    this.snapshot = snapshot;
  }

  setHoldProgress(progress) {
    this.holdProgress = Math.min(1, Math.max(0, progress));
    this.applyVisualState();
  }

  setState(nextState) {
    this.state = nextState;
    this.applyVisualState();
  }

  applyVisualState() {
    const atomCutoff = Math.ceil(this.holdProgress * this.atomMeshes.length);
    const bondCutoff = Math.ceil(this.holdProgress * this.bondMeshes.length);

    this.atomMeshes.forEach((mesh, index) => {
      const visible = index < atomCutoff || (this.holdProgress > 0 && index === 0);
      mesh.visible = visible;
      const material = /** @type {THREE.MeshPhongMaterial} */ (mesh.material);
      if (!visible) {
        material.opacity = 0.15;
        material.transparent = true;
        return;
      }
      material.opacity = 1;
      material.transparent = false;
      if (this.state === 'burning') {
        material.emissive.setHex(this.theme.palette.elementO);
        material.color.setHex(this.theme.palette.elementO);
        material.emissiveIntensity = 0.85;
      } else if (this.state === 'stable') {
        material.emissiveIntensity = 0.5;
      }
    });

    this.snapshot?.bonds.forEach((bond, index) => {
      const mesh = this.bondMeshes[index];
      if (!mesh) return;

      const active = index < bondCutoff;
      const material = /** @type {THREE.MeshPhongMaterial} */ (mesh.material);
      mesh.visible = active || this.holdProgress > 0;

      if (this.state === 'burning') {
        material.color.setHex(this.theme.palette.bondBurn);
        material.emissive?.setHex?.(this.theme.palette.bondBurn);
      }
      material.opacity = active ? 1 : 0.2;
      material.transparent = !active;
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
    if (this.theme.autoRotate) {
      this.root.rotation.y += this.theme.rotationSpeed * 2;
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
