/**
 * Chunks Manager - Cordillera Rally Festival
 * Administra el terreno 3D en cuadrículas (chunks) modulares cargadas por distancia.
 * Optimiza geometría, colores de bioma según altura/pendiente y renderizado de carreteras.
 */

import { getSurfaceAt, SURFACE_PROPERTIES, SURFACE_TYPES } from './surfaces.js';

export class ChunkManager {
  /**
   * @param {THREE.Scene} scene
   * @param {Heightmap} heightmap
   * @param {ErosionMemory} erosionMemory
   */
  constructor(THREE, scene, heightmap, erosionMemory) {
    this.THREE = THREE;
    this.scene = scene;
    this.heightmap = heightmap;
    this.erosionMemory = erosionMemory;

    this.chunkSize = 120; // Tamaño de cada chunk en metros
    this.segments = 24;   // Segmentos de malla por chunk
    this.viewDistance = 3; // Radio de chunks activos alrededor del jugador

    this.activeChunks = new Map(); // key "cx,cz" => { mesh, cx, cz }
    this.trackMeshes = [];
  }

  getChunkCoord(worldX, worldZ) {
    return {
      cx: Math.floor((worldX + this.chunkSize / 2) / this.chunkSize),
      cz: Math.floor((worldZ + this.chunkSize / 2) / this.chunkSize)
    };
  }

  update(playerX, playerZ) {
    const { cx: pCx, cz: pCz } = this.getChunkCoord(playerX, playerZ);
    const neededKeys = new Set();

    // Determinar chunks dentro del radio
    for (let dx = -this.viewDistance; dx <= this.viewDistance; dx++) {
      for (let dz = -this.viewDistance; dz <= this.viewDistance; dz++) {
        const cx = pCx + dx;
        const cz = pCz + dz;
        const key = `${cx},${cz}`;
        neededKeys.add(key);

        if (!this.activeChunks.has(key)) {
          const chunkMesh = this.buildChunk(cx, cz);
          this.activeChunks.set(key, { mesh: chunkMesh, cx, cz });
          this.scene.add(chunkMesh);
        }
      }
    }

    // Retirar chunks fuera de rango
    for (const [key, data] of this.activeChunks.entries()) {
      if (!neededKeys.has(key)) {
        this.scene.remove(data.mesh);
        if (data.mesh.geometry) data.mesh.geometry.dispose();
        if (data.mesh.material) data.mesh.material.dispose();
        this.activeChunks.delete(key);
      }
    }
  }

  buildChunk(cx, cz) {
    const originX = cx * this.chunkSize;
    const originZ = cz * this.chunkSize;

    const geom = new this.THREE.PlaneGeometry(
      this.chunkSize,
      this.chunkSize,
      this.segments,
      this.segments
    );
    geom.rotateX(-Math.PI / 2);

    const posAttr = geom.attributes.position;
    const vertexCount = posAttr.count;

    const colors = new Float32Array(vertexCount * 3);
    const tempColor = new this.THREE.Color();

    for (let i = 0; i < vertexCount; i++) {
      const vx = posAttr.getX(i) + originX;
      const vz = posAttr.getZ(i) + originZ;

      const vy = this.heightmap.getHeight(vx, vz);
      posAttr.setY(i, vy);

      // Determinación de color por superficie, altitud y pendiente
      const { slope } = this.heightmap.getNormalAndSlope(vx, vz);
      const roadDist = this.heightmap.getDistanceFromMainHighway(vx, vz);
      const isRoad = roadDist < 7.5;
      const surfaceType = getSurfaceAt(vx, vz, slope, isRoad, isRoad ? SURFACE_TYPES.ASPHALT : undefined);
      const surfProp = SURFACE_PROPERTIES[surfaceType];

      tempColor.setHex(surfProp.color);

      // Efecto de nieve en las cimas más altas (> 90m)
      if (vy > 85 && slope < 0.6) {
        const snowBlend = Math.min(1.0, (vy - 85) / 25);
        tempColor.lerp(new this.THREE.Color(0xeef2f7), snowBlend);
      }

      // Variación sutil de color para romper monotonía
      const variation = (Math.sin(vx * 0.1) * Math.cos(vz * 0.1)) * 0.05;
      tempColor.r = Math.min(1, Math.max(0, tempColor.r + variation));
      tempColor.g = Math.min(1, Math.max(0, tempColor.g + variation));
      tempColor.b = Math.min(1, Math.max(0, tempColor.b + variation));

      colors[i * 3] = tempColor.r;
      colors[i * 3 + 1] = tempColor.g;
      colors[i * 3 + 2] = tempColor.b;
    }

    geom.setAttribute('color', new this.THREE.BufferAttribute(colors, 3));
    geom.computeVertexNormals();

    const mat = new this.THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.88,
      metalness: 0.08,
      flatShading: false
    });

    const mesh = new this.THREE.Mesh(geom, mat);
    mesh.position.set(originX, 0, originZ);
    mesh.receiveShadow = true;

    return mesh;
  }

  disposeAll() {
    for (const [, data] of this.activeChunks.entries()) {
      this.scene.remove(data.mesh);
      if (data.mesh.geometry) data.mesh.geometry.dispose();
      if (data.mesh.material) data.mesh.material.dispose();
    }
    this.activeChunks.clear();
  }
}
