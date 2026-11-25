/**
 * Erosion Memory System ("Terreno Memoria")
 * Registra el paso reiterado de vehículos, derrapes y frenadas.
 * Crea roderas, ahondamiento de barro y pérdida progresiva de tracción en las curvas.
 */

export class ErosionMemory {
  constructor(gridResolution = 2.0) {
    this.res = gridResolution; // Tamaño de celda en metros
    // Map con clave "cx,cz" donde se guarda desgaste [0.0 - 1.0]
    this.deformationMap = new Map();
    // Puntos de huellas dinámicas recientes para renderizado visual de skidmarks / surcos
    this.tireTracks = [];
    this.maxTireTracks = 600;
  }

  _getKey(x, z) {
    const gx = Math.round(x / this.res);
    const gz = Math.round(z / this.res);
    return `${gx},${gz}`;
  }

  /**
   * Aplica desgaste / deformación sobre el suelo
   * @param {number} x - Posición X del neumático
   * @param {number} z - Posición Z del neumático
   * @param {number} slipRatio - Deslizamiento (0 = rodadura pura, >0.2 derrape intenso)
   * @param {number} weightOnWheel - Carga en Newtons
   * @param {boolean} isMuddy - Si el suelo está empapado
   */
  recordTirePass(x, z, slipRatio, weightOnWheel, isMuddy = false) {
    const key = this._getKey(x, z);
    const current = this.deformationMap.get(key) || 0.0;

    // Mayor desgaste si hay deslizamiento de neumáticos o suelo blando
    const wearRate = (0.015 + slipRatio * 0.08) * (isMuddy ? 2.2 : 1.0) * (weightOnWheel / 3000);
    const nextVal = Math.min(1.0, current + wearRate);
    this.deformationMap.set(key, nextVal);

    // Registro de huella visual para renderizado de decals / malla
    if (slipRatio > 0.12 || isMuddy) {
      this.tireTracks.push({
        x,
        z,
        depth: nextVal * 0.15, // Hundimiento de hasta 15 cm
        slip: slipRatio,
        muddy: isMuddy,
        timestamp: Date.now()
      });

      if (this.tireTracks.length > this.maxTireTracks) {
        this.tireTracks.shift();
      }
    }

    return nextVal;
  }

  /**
   * Obtiene la erosión acumulada en una coordenada dada (0 = virgen, 1 = surco profundo desgastado)
   */
  getErosionAt(x, z) {
    const key = this._getKey(x, z);
    return this.deformationMap.get(key) || 0.0;
  }

  /**
   * Modificador de agarre por erosión:
   * En asfalto apenas cambia; en grava/barro una pasada suave da agarre pero el exceso crea surcos que frenan y desestabilizan.
   */
  getGripModifier(x, z, surfaceType) {
    const erosion = this.getErosionAt(x, z);
    if (erosion === 0) return 1.0;

    if (surfaceType === 'asphalt') {
      // Goma quemada depositada en la pista da algo más de tracción hasta saturar
      return 1.0 + Math.min(0.08, erosion * 0.1);
    } else if (surfaceType === 'mud') {
      // El barro erosionado se vuelve pantanoso y reduce tracción radicalmente
      return Math.max(0.45, 1.0 - erosion * 0.45);
    } else {
      // Grava: la huella compacta mejora tracción ligera, pero surco profundo atrapa la rueda
      if (erosion < 0.4) {
        return 1.0 + erosion * 0.15; // Línea trazada compactada
      } else {
        return Math.max(0.70, 1.06 - (erosion - 0.4) * 0.5); // Piedras sueltas en los bordes
      }
    }
  }

  /**
   * Exporta estado de erosión para serialización
   */
  exportState() {
    const obj = {};
    for (const [k, v] of this.deformationMap.entries()) {
      if (v > 0.05) obj[k] = Math.round(v * 100) / 100;
    }
    return JSON.stringify(obj);
  }

  /**
   * Carga estado desde JSON guardado
   */
  importState(jsonStr) {
    try {
      const parsed = JSON.parse(jsonStr);
      this.deformationMap.clear();
      for (const [k, v] of Object.entries(parsed)) {
        this.deformationMap.set(k, v);
      }
    } catch (e) {
      console.warn("Fallo al importar mapa de erosión:", e);
    }
  }
}
