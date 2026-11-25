/**
 * Tire Physics & Compound Dynamics
 * Modela el contacto neumático-suelo, ángulo de deslizamiento (slip angle) y curva de Pacejka simplificada.
 */

export const TIRE_COMPOUNDS = {
  ASPHALT_SLICK: {
    id: 'asphalt_slick',
    name: 'Slicks de Pista',
    gripMultiplier: { asphalt: 1.25, gravel: 0.55, mud: 0.35, rock: 0.85, grass: 0.50 },
    wearResistance: 1.0,
    optimalSlip: 0.08
  },
  RALLY_GRAVEL: {
    id: 'rally_gravel',
    name: 'Neumático Mixto de Rally',
    gripMultiplier: { asphalt: 0.95, gravel: 1.20, mud: 0.85, rock: 1.05, grass: 0.90 },
    wearResistance: 1.3,
    optimalSlip: 0.14
  },
  MUD_TERRAIN: {
    id: 'mud_terrain',
    name: 'Tacos Profundos Mud & Snow',
    gripMultiplier: { asphalt: 0.80, gravel: 1.05, mud: 1.40, rock: 0.95, grass: 1.10 },
    wearResistance: 1.5,
    optimalSlip: 0.20
  }
};

export class TireModel {
  constructor(compound = TIRE_COMPOUNDS.RALLY_GRAVEL) {
    this.compound = compound;
    this.radius = 0.36; // metros
    this.width = 0.225; // metros
  }

  setCompound(compoundKey) {
    if (TIRE_COMPOUNDS[compoundKey]) {
      this.compound = TIRE_COMPOUNDS[compoundKey];
    }
  }

  /**
   * Calcula fuerza lateral de agarre usando aproximación Magic Formula (Pacejka)
   * Fy = D * sin(C * atan(B * alpha - E * (B * alpha - atan(B * alpha))))
   */
  calculateLateralForce(slipAngle, normalForceN, surfaceType, wetness = 0.0) {
    // Coeficiente según compuesto y superficie
    const baseMult = this.compound.gripMultiplier[surfaceType] || 0.85;
    const wetPenalty = (surfaceType === 'asphalt') ? (wetness * 0.2) : (wetness * 0.12);
    const peakFriction = Math.max(0.2, (baseMult - wetPenalty));

    // Pacejka simplificada
    const B = 10.0; // Rigidez de curva
    const C = 1.3;  // Factor de forma
    const D = normalForceN * peakFriction; // Fuerza máxima
    const E = -0.9; // Curvatura

    const Bx = B * slipAngle;
    const force = D * Math.sin(C * Math.atan(Bx - E * (Bx - Math.atan(Bx))));

    return force;
  }

  /**
   * Calcula fuerza longitudinal (aceleración / frenada)
   */
  calculateLongitudinalForce(slipRatio, normalForceN, surfaceType, wetness = 0.0) {
    const baseMult = this.compound.gripMultiplier[surfaceType] || 0.85;
    const wetPenalty = wetness * 0.15;
    const peakFriction = Math.max(0.25, (baseMult - wetPenalty));

    // Saturation curve
    const force = normalForceN * peakFriction * (2 * slipRatio / (1 + slipRatio * slipRatio));
    return force;
  }
}
