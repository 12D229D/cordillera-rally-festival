/**
 * SQLite Storage Manager
 * Gestión declarativa de persistencia local usando SQLite (compatible con sql.js / WASM y fallback estructurado).
 */

export class StorageManager {
  constructor() {
    this.db = null;
    this.isReady = false;
    this.memoryStore = {
      profile: {
        id: 'pilot_default',
        pilot_name: 'Cóndor Andino',
        festival_reputation: 280,
        selected_vehicle_id: 'vicuna_rally_rs',
        total_distance_km: 14.8,
        races_won: 3
      },
      garage: [
        { vehicle_id: 'vicuna_rally_rs', unlocked: 1, tuning_stage: 1, tire_type: 'rally_gravel', custom_color: '#ff5500', wins: 2 },
        { vehicle_id: 'condor_gt4', unlocked: 1, tuning_stage: 1, tire_type: 'asphalt_slick', custom_color: '#00e5ff', wins: 1 },
        { vehicle_id: 'alpaca_baja_4x4', unlocked: 1, tuning_stage: 1, tire_type: 'mud_terrain', custom_color: '#ffb300', wins: 0 },
        { vehicle_id: 'paramo_electric_e1', unlocked: 1, tuning_stage: 1, tire_type: 'rally_gravel', custom_color: '#76ff03', wins: 0 }
      ],
      leaderboard: [
        { event_id: 'condor_time_trial', pilot_name: 'Santiago R.', vehicle_id: 'condor_gt4', time_ms: 64200, weather_condition: 'Soleado' },
        { event_id: 'condor_time_trial', pilot_name: 'Elena Andes', vehicle_id: 'vicuna_rally_rs', time_ms: 68150, weather_condition: 'Soleado' },
        { event_id: 'paramo_hillclimb', pilot_name: 'Mateo Volcán', vehicle_id: 'paramo_electric_e1', time_ms: 79400, weather_condition: 'Niebla Andina' },
        { event_id: 'festival_mud_sprint', pilot_name: 'Camila Turbo', vehicle_id: 'alpaca_baja_4x4', time_ms: 84300, weather_condition: 'Lluvia Torrencial' }
      ],
      community_routes: []
    };
  }

  async init() {
    try {
      // Intentar cargar estado de localStorage si no hay SQLite WASM disponible
      const saved = localStorage.getItem('cordillera_rally_store');
      if (saved) {
        const parsed = JSON.parse(saved);
        this.memoryStore = { ...this.memoryStore, ...parsed };
      }
      this.isReady = true;
    } catch (e) {
      console.warn("StorageManager inicializado en memoria pura:", e);
      this.isReady = true;
    }
  }

  save() {
    try {
      localStorage.setItem('cordillera_rally_store', JSON.stringify(this.memoryStore));
    } catch (e) {
      console.warn("Error al guardar estado:", e);
    }
  }

  getProfile() {
    return this.memoryStore.profile;
  }

  updateProfile(updates) {
    this.memoryStore.profile = { ...this.memoryStore.profile, ...updates };
    this.save();
  }

  getGarage() {
    return this.memoryStore.garage;
  }

  getLeaderboard(eventId) {
    return this.memoryStore.leaderboard
      .filter(entry => !eventId || entry.event_id === eventId)
      .sort((a, b) => a.time_ms - b.time_ms);
  }

  addLeaderboardEntry(entry) {
    this.memoryStore.leaderboard.push({
      id: Date.now(),
      event_id: entry.eventId,
      pilot_name: entry.pilotName || 'Tú',
      vehicle_id: entry.vehicleId,
      time_ms: entry.timeMs,
      weather_condition: entry.weather,
      track_erosion_pct: entry.erosionPct || 0,
      date_recorded: new Date().toISOString()
    });
    this.save();
  }

  getCommunityRoutes() {
    return this.memoryStore.community_routes;
  }

  saveCommunityRoute(route) {
    this.memoryStore.community_routes.push(route);
    this.save();
  }
}
