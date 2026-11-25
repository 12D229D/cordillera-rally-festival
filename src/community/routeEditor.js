/**
 * Community Route Editor
 * Permite al jugador crear trazados en vivo mientras conduce, colocando checkpoints interactivos.
 */

import { RouteSerializer } from './routeSerializer.js';

export class RouteEditor {
  constructor(THREE, scene, raceManager) {
    this.THREE = THREE;
    this.scene = scene;
    this.raceManager = raceManager;

    this.isRecording = false;
    this.recordedCheckpoints = [];
    this.previewMeshes = [];

    this.routeTitle = "Mi Trazado del Páramo";
    this.creatorName = "Piloto Andino";
  }

  startRecording(title = "Ruta Personalizada", creator = "Piloto Andino") {
    this.isRecording = true;
    this.routeTitle = title;
    this.creatorName = creator;
    this.recordedCheckpoints = [];
    this._clearPreview();
  }

  addCheckpointAt(position, yaw = 0) {
    if (!this.isRecording) return null;

    const idx = this.recordedCheckpoints.length;
    const cp = {
      x: Math.round(position.x * 10) / 10,
      y: Math.round(position.y * 10) / 10,
      z: Math.round(position.z * 10) / 10,
      yaw: Math.round(yaw * 100) / 100,
      radius: 15,
      name: idx === 0 ? "Salida" : `Punto ${idx}`
    };

    this.recordedCheckpoints.push(cp);
    this._addPreviewMarker(cp, idx === 0);
    return cp;
  }

  _addPreviewMarker(cp, isStart) {
    const geom = new this.THREE.TorusGeometry(12, 0.35, 8, 20);
    const mat = new this.THREE.MeshBasicMaterial({
      color: isStart ? 0x00e5ff : 0x76ff03,
      wireframe: true
    });
    const mesh = new this.THREE.Mesh(geom, mat);
    mesh.position.set(cp.x, cp.y + 3, cp.z);
    mesh.rotation.y = cp.yaw || 0;
    this.scene.add(mesh);
    this.previewMeshes.push(mesh);
  }

  _clearPreview() {
    this.previewMeshes.forEach(mesh => {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      mesh.material.dispose();
    });
    this.previewMeshes = [];
  }

  finishRecording() {
    if (!this.isRecording) return null;
    this.isRecording = false;

    if (this.recordedCheckpoints.length < 2) {
      this._clearPreview();
      return null;
    }

    // Renombrar último como Meta
    this.recordedCheckpoints[this.recordedCheckpoints.length - 1].name = "Meta";

    const lengthKm = RouteSerializer.calculateLengthKm(this.recordedCheckpoints);
    const routeData = {
      id: 'comm_' + Date.now().toString(36),
      title: this.routeTitle,
      creator: this.creatorName,
      difficulty: lengthKm > 2.5 ? 'Experto' : 'Medio',
      weatherPreset: 'sunny',
      lengthKm,
      checkpoints: this.recordedCheckpoints
    };

    const base64Code = RouteSerializer.serializeToBase64(routeData);
    this._clearPreview();

    return { routeData, base64Code };
  }

  cancelRecording() {
    this.isRecording = false;
    this.recordedCheckpoints = [];
    this._clearPreview();
  }
}
