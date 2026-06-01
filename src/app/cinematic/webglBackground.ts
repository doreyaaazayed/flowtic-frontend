import * as THREE from 'three';

/**
 * Fullscreen WebGL layer (particles + wire/wash meshes). Disposes on destroy.
 * Scroll 0–1 rotates field + nudges camera (spec).
 */
export class WebGLBackground {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private particles: THREE.Points | null = null;
  private floatingMeshes: THREE.Mesh[] = [];
  private time = 0;
  private scrollRotateY = 0;
  private driftY = 0;
  private disposed = false;
  private resizeHandler = () => this.onResize();
  private rafId = 0;

  constructor(particleCount: number) {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });

    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.domElement.style.cssText =
      'position:fixed;top:0;left:0;width:100%;height:100%;z-index:0;pointer-events:none';

    document.body.prepend(this.renderer.domElement);

    this.camera.position.z = 5;

    this.buildParticles(particleCount);
    this.addFloatingGeometries();
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.35));
    const p1 = new THREE.PointLight(0xf953c6, 1.8, 24);
    p1.position.set(3, 3, 3);
    this.scene.add(p1);
    const p2 = new THREE.PointLight(0x4776e6, 1.8, 24);
    p2.position.set(-3, -3, 3);
    this.scene.add(p2);

    window.addEventListener('resize', this.resizeHandler);
    this.animate();
  }

  private buildParticles(particleCount: number) {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    const palette: [number, number, number][] = [
      [1.0, 0.2, 0.6],
      [0.4, 0.2, 0.9],
      [1.0, 0.8, 0.1],
      [0.2, 0.6, 1.0],
    ];

    for (let i = 0; i < particleCount; i++) {
      const phi = Math.acos(-1 + (2 * i) / particleCount);
      const theta = Math.sqrt(particleCount * Math.PI) * phi;
      const radius = 8 + Math.random() * 12;

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      const c = palette[Math.floor(Math.random() * palette.length)]!;
      colors[i * 3] = c[0];
      colors[i * 3 + 1] = c[1];
      colors[i * 3 + 2] = c[2];
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    /* PointsMaterial uses built-in GLSL (WebGL2-safe); custom ShaderMaterial broke on some GPUs. */
    const material = new THREE.PointsMaterial({
      size: 0.09,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.particles = new THREE.Points(geometry, material);
    this.scene.add(this.particles);
  }

  private addFloatingGeometries() {
    const shapes = [
      new THREE.IcosahedronGeometry(0.6, 1),
      new THREE.OctahedronGeometry(0.5, 0),
      new THREE.TetrahedronGeometry(0.7, 0),
      new THREE.TorusGeometry(0.5, 0.15, 8, 24),
      new THREE.BoxGeometry(0.7, 0.7, 0.7),
    ];
    const cols = [0xf953c6, 0x4776e6, 0xffd200, 0x8e54e9];

    for (let i = 0; i < 8; i++) {
      const geo = shapes[i % shapes.length]!;
      const mat = new THREE.MeshPhongMaterial({
        color: cols[i % cols.length],
        wireframe: Math.random() > 0.5,
        transparent: true,
        opacity: 0.12 + Math.random() * 0.18,
        shininess: 100,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set((Math.random() - 0.5) * 16, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 6 - 2);
      mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      mesh.userData = {
        rotationSpeed: {
          x: (Math.random() - 0.5) * 0.008,
          y: (Math.random() - 0.5) * 0.008,
          z: (Math.random() - 0.5) * 0.004,
        },
        floatOffset: Math.random() * Math.PI * 2,
        floatSpeed: 0.3 + Math.random() * 0.4,
      };
      this.scene.add(mesh);
      this.floatingMeshes.push(mesh);
    }
  }

  updateScroll(progress: number) {
    const p = Math.max(0, Math.min(1, progress));
    this.scrollRotateY = p * Math.PI * 0.55;
    this.camera.position.y = -p * 3;
    this.camera.rotation.z = p * 0.12;
  }

  private onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private animate = () => {
    if (this.disposed) return;
    this.rafId = requestAnimationFrame(this.animate);
    this.time += 0.01;
    if (this.particles) {
      const pm = this.particles.material as THREE.PointsMaterial;
      pm.size = 0.075 + Math.sin(this.time * 0.45) * 0.028;
      this.driftY += 0.0008;
      this.particles.rotation.y = this.scrollRotateY + this.driftY;
    }

    for (const mesh of this.floatingMeshes) {
      const d = mesh.userData as {
        rotationSpeed: { x: number; y: number; z: number };
        floatOffset: number;
        floatSpeed: number;
      };
      mesh.rotation.x += d.rotationSpeed.x;
      mesh.rotation.y += d.rotationSpeed.y;
      mesh.rotation.z += d.rotationSpeed.z;
      mesh.position.y += Math.sin(this.time * d.floatSpeed + d.floatOffset) * 0.003;
    }
    this.renderer.render(this.scene, this.camera);
  };

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.rafId);
    window.removeEventListener('resize', this.resizeHandler);

    if (this.particles) {
      this.particles.geometry.dispose();
      (this.particles.material as THREE.Material).dispose();
      this.scene.remove(this.particles);
      this.particles = null;
    }
    for (const mesh of this.floatingMeshes) {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
      this.scene.remove(mesh);
    }
    this.floatingMeshes = [];

    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
