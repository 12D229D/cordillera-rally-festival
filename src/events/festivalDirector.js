/**
 * Festival Director
 * Administra el calendario de eventos andinos, biomas de carrera y progresión de reputación del festival.
 */

export const FESTIVAL_EVENTS = [
  {
    id: 'condor_time_trial',
    name: 'Contrarreloj del Cóndor',
    category: 'Asfalto / Veloce',
    recommendedVehicle: 'condor_gt4',
    weatherPreset: 'sunny',
    laps: 1,
    description: 'Tramo sinuoso de alta velocidad bordeando los riscos del cañón con curvas de vértice rápido.',
    checkpoints: [
      { x: 0, y: 12, z: 0, radius: 14, name: 'Paddock Salida' },
      { x: 120, y: 15, z: 80, radius: 16, name: 'Curva del Cañón' },
      { x: 240, y: 18, z: 200, radius: 16, name: 'Horquilla del Cóndor' },
      { x: 180, y: 22, z: 340, radius: 16, name: 'Bajada de la Cascada' },
      { x: 40, y: 16, z: 260, radius: 16, name: 'Recta del Viaducto' },
      { x: 0, y: 12, z: 0, radius: 15, name: 'Meta del Festival' }
    ]
  },
  {
    id: 'paramo_hillclimb',
    name: 'Subida al Páramo',
    category: 'Escalada / Mixto Grava-Roca',
    recommendedVehicle: 'paramo_electric_e1',
    weatherPreset: 'mist',
    laps: 1,
    description: 'Ascenso vertiginoso entre niebla densa y horquillas empinadas hacia el páramo andino.',
    checkpoints: [
      { x: 0, y: 12, z: 0, radius: 14, name: 'Base del Valle' },
      { x: -100, y: 28, z: 120, radius: 16, name: 'Eslabón Uno' },
      { x: -190, y: 48, z: 240, radius: 18, name: 'Serranía Andina' },
      { x: -280, y: 72, z: 180, radius: 18, name: 'Mirador de Frailejones' },
      { x: -350, y: 92, z: 60, radius: 20, name: 'Cumbre Páramo E1' }
    ]
  },
  {
    id: 'festival_mud_sprint',
    name: 'Festival Mud Sprint',
    category: 'Rally / Lodo Extremo',
    recommendedVehicle: 'alpaca_baja_4x4',
    weatherPreset: 'rain',
    laps: 1,
    description: 'Circuito anegado de fango y lodazales traicioneros bajo un aguacero torrencial andino.',
    checkpoints: [
      { x: 0, y: 12, z: 0, radius: 14, name: 'Salida del Lodazal' },
      { x: -60, y: 10, z: -140, radius: 16, name: 'Vado de Lodo Norte' },
      { x: 80, y: 11, z: -260, radius: 18, name: 'Curva del Fango' },
      { x: 220, y: 14, z: -160, radius: 18, name: 'Cruce del Río Seco' },
      { x: 140, y: 12, z: -30, radius: 16, name: 'Recta Fangosa' },
      { x: 0, y: 12, z: 0, radius: 15, name: 'Meta Festival' }
    ]
  }
];

export class FestivalDirector {
  constructor(raceManager, weatherCallback) {
    this.raceManager = raceManager;
    this.setWeather = weatherCallback;
    this.events = FESTIVAL_EVENTS;
    this.activeEventIndex = 0;
    this.playerReputation = 150;
  }

  getEvent(index) {
    return this.events[index] || this.events[0];
  }

  selectEvent(index) {
    this.activeEventIndex = index;
    const ev = this.getEvent(index);

    // Ajustar meteorología según el evento
    if (this.setWeather) {
      this.setWeather(ev.weatherPreset);
    }

    this.raceManager.loadEvent(ev);
    return ev;
  }

  addReputation(points) {
    this.playerReputation += points;
    return this.playerReputation;
  }
}
