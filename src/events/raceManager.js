/**
 * Race Manager - Cordillera Rally Festival
 * Administra el cronometraje, detección de checkpoints, sectores y validación de vueltas.
 */

export class RaceManager {
  constructor(THREE, scene) {
    this.THREE = THREE;
    this.scene = scene;

    this.currentEvent = null;
    this.checkpoints = [];
    this.checkpointMeshes = [];
    this.currentCheckpointIndex = 0;

    this.isActive = false;
    this.isFinished = false;
    this.startTime = 0;
    this.currentTime = 0;
    this.splitTimes = [];

    this.onRaceFinished = null;
    this.onCheckpointPassed = null;
  }

  loadEvent(eventConfig) {
    this.reset();
    this.currentEvent = eventConfig;
    this.checkpoints = eventConfig.checkpoints || [];
    this._createCheckpointMarkers();
  }

  _createCheckpointMarkers() {
    // Limpiar anteriores
    this._clearMarkers();

    this.checkpoints.forEach((cp, idx) => {
      // Anillo portal 3D fluorescente
      const geom = new this.THREE.TorusGeometry(cp.radius || 12, 0.4, 8, 24);
      const isStartFinish = idx === 0 || idx === this.checkpoints.length - 1;
      const mat = new this.THREE.MeshBasicMaterial({
        color: isStartFinish ? 0x00e5ff : 0xff9100,
        wireframe: true,
        transparent: true,
        opacity: idx === 0 ? 0.9 : 0.4
      });

      const mesh = new this.THREE.Mesh(geom, mat);
      mesh.position.set(cp.x, cp.y + 4, cp.z);
      mesh.rotation.y = cp.yaw || 0;

      // Columna de luz indicadora
      const beamGeom = new this.THREE.CylinderGeometry(0.2, 0.2, 40, 8);
      const beamMat = new this.THREE.MeshBasicMaterial({
        color: isStartFinish ? 0x00e5ff : 0xff9100,
        transparent: true,
        opacity: 0.35
      });
      const beam = new this.THREE.Mesh(beamGeom, beamMat);
      beam.position.y = 20;
      mesh.add(beam);

      this.scene.add(mesh);
      this.checkpointMeshes.push(mesh);
    });
  }

  _clearMarkers() {
    this.checkpointMeshes.forEach(mesh => {
      this.scene.remove(mesh);
      mesh.traverse(obj => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) obj.material.dispose();
      });
    });
    this.checkpointMeshes = [];
  }

  startRace() {
    this.isActive = true;
    this.isFinished = false;
    this.startTime = performance.now();
    this.currentTime = 0;
    this.currentCheckpointIndex = 0;
    this.splitTimes = [];
    this._updateActiveMarkerGlow();
  }

  update(playerPos) {
    if (!this.isActive || this.isFinished || this.checkpoints.length === 0) return;

    this.currentTime = performance.now() - this.startTime;

    const targetCp = this.checkpoints[this.currentCheckpointIndex];
    if (!targetCp) return;

    const dist = Math.hypot(playerPos.x - targetCp.x, playerPos.z - targetCp.z);
    const radius = targetCp.radius || 14;

    if (dist <= radius) {
      // Checkpoint superado
      this.splitTimes.push(this.currentTime);
      if (this.onCheckpointPassed) {
        this.onCheckpointPassed(this.currentCheckpointIndex, this.checkpoints.length, this.currentTime);
      }

      this.currentCheckpointIndex++;
      this._updateActiveMarkerGlow();

      // ¿Llegada a meta?
      if (this.currentCheckpointIndex >= this.checkpoints.length) {
        this.finishRace();
      }
    }
  }

  _updateActiveMarkerGlow() {
    this.checkpointMeshes.forEach((mesh, idx) => {
      if (idx === this.currentCheckpointIndex) {
        mesh.material.opacity = 1.0;
        mesh.scale.set(1.2, 1.2, 1.2);
      } else if (idx < this.currentCheckpointIndex) {
        mesh.material.opacity = 0.15;
        mesh.scale.set(0.9, 0.9, 0.9);
      } else {
        mesh.material.opacity = 0.45;
        mesh.scale.set(1.0, 1.0, 1.0);
      }
    });
  }

  finishRace() {
    this.isActive = false;
    this.isFinished = true;
    if (this.onRaceFinished) {
      this.onRaceFinished({
        event: this.currentEvent,
        totalTimeMs: this.currentTime,
        splitTimes: this.splitTimes
      });
    }
  }

  reset() {
    this.isActive = false;
    this.isFinished = false;
    this.currentTime = 0;
    this.currentCheckpointIndex = 0;
    this._clearMarkers();
  }
}
