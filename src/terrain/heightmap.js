/**
 * Heightmap Generator - Cordillera Andina Ficticia
 * Combina ruido fractal Simplex-like, crestas montañosas, valles de río y terrazas de páramo.
 */

// Ruido pseudo-aleatorio basado en gradiente rápido (sin dependencias externas pesadas)
function pseudoNoise(x, y) {
  const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453123;
  return n - Math.floor(n);
}

function smoothNoise(x, y) {
  const i = Math.floor(x);
  const j = Math.floor(y);
  const fx = x - i;
  const fy = y - j;

  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);

  const n00 = pseudoNoise(i, j);
  const n10 = pseudoNoise(i + 1, j);
  const n01 = pseudoNoise(i, j + 1);
  const n11 = pseudoNoise(i + 1, j + 1);

  const nx0 = n00 * (1 - u) + n10 * u;
  const nx1 = n01 * (1 - u) + n11 * u;

  return nx0 * (1 - v) + nx1 * v;
}

function fbm(x, y, octaves = 5, lacunarity = 2.0, gain = 0.5) {
  let total = 0;
  let frequency = 1;
  let amplitude = 1;
  let maxVal = 0;

  for (let i = 0; i < octaves; i++) {
    total += smoothNoise(x * frequency, y * frequency) * amplitude;
    maxVal += amplitude;
    frequency *= lacunarity;
    amplitude *= gain;
  }
  return total / maxVal;
}

export class Heightmap {
  constructor(seed = 42) {
    this.seed = seed;
    this.maxAltitude = 160; // Altitud máxima en metros
    this.baseElevation = 10;
  }

  /**
   * Obtiene la elevación Y para una coordenada X, Z en el mundo
   */
  getHeight(x, z) {
    const s = 0.0018; // Escala regional
    const nx = x * s + this.seed * 0.1;
    const nz = z * s + this.seed * 0.1;

    // Valle central plano para el festival principal
    const centerDist = Math.hypot(x, z);
    const valleyMask = Math.min(1.0, Math.max(0.0, (centerDist - 80) / 450));

    // Capa 1: Macro-relieve de cordillera andina (crestas afiladas)
    const macro = fbm(nx, nz, 4, 2.1, 0.48);
    // Ridge noise para cordillera escarpada
    const ridge = 1.0 - Math.abs(macro * 2.0 - 1.0);
    const mountainElevation = Math.pow(ridge, 1.8) * this.maxAltitude;

    // Capa 2: Meseta / Páramo y ondulaciones
    const paramo = fbm(nx * 3.5, nz * 3.5, 3, 2.0, 0.5) * 25.0;

    // Capa 3: Micro-rugosidad de grava y baches
    const micro = fbm(x * 0.04, z * 0.04, 2, 2.0, 0.5) * 1.8;

    // Aplanamiento gradual en la zona de meta / paddock central
    const rawElevation = (mountainElevation + paramo + micro) * valleyMask + this.baseElevation;

    // Trazado de carretera asfaltada principal aplanada si está cerca de la pista principal
    const roadTrackDist = this.getDistanceFromMainHighway(x, z);
    if (roadTrackDist < 16) {
      const roadInfluence = 1.0 - (roadTrackDist / 16);
      const bankedRoadHeight = this.getRoadReferenceHeight(x, z);
      return rawElevation * (1.0 - roadInfluence * 0.85) + bankedRoadHeight * (roadInfluence * 0.85);
    }

    return rawElevation;
  }

  /**
   * Ruta principal asfaltada que rodea el valle andino
   */
  getDistanceFromMainHighway(x, z) {
    // Curva de Bezier / elíptica que serpentea por el mapa
    const radius = 260 + Math.sin(Math.atan2(z, x) * 4) * 80;
    const currentDist = Math.hypot(x, z);
    return Math.abs(currentDist - radius);
  }

  getRoadReferenceHeight(x, z) {
    const angle = Math.atan2(z, x);
    return this.baseElevation + 12 + Math.sin(angle * 2) * 8;
  }

  /**
   * Calcula el vector normal y la pendiente en radianes
   */
  getNormalAndSlope(x, z, step = 0.8) {
    const hL = this.getHeight(x - step, z);
    const hR = this.getHeight(x + step, z);
    const hD = this.getHeight(x, z - step);
    const hU = this.getHeight(x, z + step);

    const dx = (hR - hL) / (2 * step);
    const dz = (hU - hD) / (2 * step);

    // Vector normal no normalizado (-dx, 1, -dz)
    const len = Math.hypot(dx, 1.0, dz);
    const normal = {
      x: -dx / len,
      y: 1.0 / len,
      z: -dz / len
    };

    // Pendiente en radianes (0 = plano, pi/2 = vertical)
    const slope = Math.acos(Math.max(-1.0, Math.min(1.0, normal.y)));

    return { normal, slope };
  }
}
