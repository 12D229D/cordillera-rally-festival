/**
 * Dynamic Mud Formation Model
 * Modela la formación dinámica de barro a partir de lluvia, saturación del suelo y erosión de ruedas.
 */

export class MudModel {
  constructor(rainSystem, erosionMemory) {
    this.rain = rainSystem;
    this.erosion = erosionMemory;
    this.dryingRate = 0.005; // Tasa de evaporación
    this.mudPools = new Map(); // Sectores con lodazal crítico
  }

  /**
   * Evalúa la profundidad de lodo y viscosidad en una posición
   * @returns {{ depthMeters: number, dragResistance: number, slipHazard: number }}
   */
  evaluateMudAt(x, z, surfaceType) {
    const wetness = this.rain.wetness;
    const erosion = this.erosion.getErosionAt(x, z);

    let baseMudPotential = 0.0;
    if (surfaceType === 'mud') baseMudPotential = 0.7;
    else if (surfaceType === 'gravel' || surfaceType === 'grass') baseMudPotential = 0.35;
    else baseMudPotential = 0.05; // En asfalto es mínimo

    // Profundidad de lodo calculada
    const mudIndex = (baseMudPotential * 0.5 + wetness * 0.5) * (1.0 + erosion * 0.8);
    const depthMeters = Math.min(0.25, mudIndex * 0.20); // Hasta 20-25 cm de fango
    const dragResistance = mudIndex * 1.8; // Frena el vehículo
    const slipHazard = Math.min(1.0, mudIndex * 1.4); // Desestabiliza la trayectoria

    return {
      mudIndex,
      depthMeters,
      dragResistance,
      slipHazard
    };
  }

  /**
   * Obtiene la descripción visual para el HUD
   */
  getConditionLabel(wetness) {
    if (wetness > 0.75) return 'Pista Inundada / Lodo Profundo';
    if (wetness > 0.40) return 'Superficie Húmeda / Lodazales';
    if (wetness > 0.15) return 'Suelo Resbaladizo / Rocio';
    return 'Pista Seca / Firme';
  }
}
