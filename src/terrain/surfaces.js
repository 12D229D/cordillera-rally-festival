/**
 * Surfaces & Friction System
 * Modela las propiedades físicas de superficies andinas: Asfalto, Grava, Barro, Roca y Pastizal.
 */

export const SURFACE_TYPES = {
  ASPHALT: 'asphalt',
  GRAVEL: 'gravel',
  MUD: 'mud',
  ROCK: 'rock',
  GRASS: 'grass'
};

export const SURFACE_PROPERTIES = {
  [SURFACE_TYPES.ASPHALT]: {
    name: 'Asfalto Festival',
    color: 0x24272c,
    gripBase: 1.05,
    rollingResistance: 0.015,
    dustColor: 0xcccccc,
    skidAudioPitch: 1.2,
    deformsSoil: false,
    wetGripPenalty: 0.18
  },
  [SURFACE_TYPES.GRAVEL]: {
    name: 'Grava Andina Suelta',
    color: 0x8a7b68,
    gripBase: 0.78,
    rollingResistance: 0.035,
    dustColor: 0xc8b89e,
    skidAudioPitch: 0.85,
    deformsSoil: true,
    wetGripPenalty: 0.12
  },
  [SURFACE_TYPES.MUD]: {
    name: 'Fango / Barro Volcánico',
    color: 0x3d2919,
    gripBase: 0.52,
    rollingResistance: 0.075,
    dustColor: 0x5a3e26,
    skidAudioPitch: 0.65,
    deformsSoil: true,
    wetGripPenalty: 0.30
  },
  [SURFACE_TYPES.ROCK]: {
    name: 'Roca / Páramo Pétreo',
    color: 0x545759,
    gripBase: 0.88,
    rollingResistance: 0.025,
    dustColor: 0x999999,
    skidAudioPitch: 1.05,
    deformsSoil: false,
    wetGripPenalty: 0.25
  },
  [SURFACE_TYPES.GRASS]: {
    name: 'Pasto de Montaña',
    color: 0x344f24,
    gripBase: 0.68,
    rollingResistance: 0.040,
    dustColor: 0x6e8a4a,
    skidAudioPitch: 0.75,
    deformsSoil: true,
    wetGripPenalty: 0.22
  }
};

/**
 * Determina el tipo de superficie según coordenadas (x, z) y pendiente
 */
export function getSurfaceAt(x, z, slopeAngle = 0, isRoad = false, roadSurface = SURFACE_TYPES.ASPHALT) {
  if (isRoad) {
    return roadSurface;
  }
  // Pendientes muy escarpadas son pura roca
  if (slopeAngle > 0.45) {
    return SURFACE_TYPES.ROCK;
  }
  // Valles bajos o cuencas cerca del río / humedad
  const distFromCenter = Math.sqrt(x * x + z * z);
  const mudNoise = Math.sin(x * 0.02) * Math.cos(z * 0.02);
  if (mudNoise > 0.45 && distFromCenter < 1200) {
    return SURFACE_TYPES.MUD;
  }
  // Caminos de grava secundaria
  const gravelNoise = Math.cos(x * 0.015 + z * 0.015);
  if (gravelNoise > 0.6) {
    return SURFACE_TYPES.GRAVEL;
  }
  return SURFACE_TYPES.GRASS;
}
