/**
 * Rain & Weather Effects
 * Simula partículas de lluvia 3D, salpicaduras en parabrisas y acumulación de humedad ambiental.
 */

export class RainSystem {
  constructor(THREE, scene) {
    this.THREE = THREE;
    this.scene = scene;

    this.dropCount = 3500;
    this.intensity = 0.0; // 0.0 (despejado) a 1.0 (tormenta andina)
    this.wetness = 0.0;

    this.particles = null;
    this.positions = null;
    this._initRainParticles();
  }

  _initRainParticles() {
    const geom = new this.THREE.BufferGeometry();
    const pos = new Float32Array(this.dropCount * 3);

    for (let i = 0; i < this.dropCount; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 80;
      pos[i * 3 + 1] = Math.random() * 45;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 80;
    }

    geom.setAttribute('position', new this.THREE.BufferAttribute(pos, 3));

    const mat = new this.THREE.PointsMaterial({
      color: 0x90caf9,
      size: 0.18,
      transparent: true,
      opacity: 0.0,
      blending: this.THREE.AdditiveBlending,
      depthWrite: false
    });

    this.particles = new this.THREE.Points(geom, mat);
    this.scene.add(this.particles);
    this.positions = pos;
  }

  setIntensity(level) {
    this.intensity = Math.max(0, Math.min(1.0, level));
    if (this.particles && this.particles.material) {
      this.particles.material.opacity = this.intensity * 0.75;
    }
  }

  update(dt, playerPos) {
    // Evolución de la humedad del suelo
    if (this.intensity > 0.1) {
      this.wetness = Math.min(1.0, this.wetness + dt * 0.08 * this.intensity);
    } else {
      this.wetness = Math.max(0.0, this.wetness - dt * 0.03); // Secado progresivo
    }

    if (this.intensity <= 0.01 || !this.particles) return;

    // Centrar la caja de lluvia alrededor del jugador
    this.particles.position.x = playerPos.x;
    this.particles.position.z = playerPos.z;

    const posAttr = this.particles.geometry.attributes.position;
    const fallSpeed = 38 + this.intensity * 25;

    for (let i = 0; i < this.dropCount; i++) {
      let y = posAttr.getY(i) - fallSpeed * dt;
      if (y < 0) {
        y = 40 + Math.random() * 5;
      }
      posAttr.setY(i, y);
    }

    posAttr.needsUpdate = true;
  }

  dispose() {
    if (this.particles) {
      this.scene.remove(this.particles);
      this.particles.geometry.dispose();
      this.particles.material.dispose();
    }
  }
}
