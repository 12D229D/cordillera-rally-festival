/**
 * Cordillera Rally Festival — Main Entrypoint
 * Inicializa Three.js, shaders, modelos 3D paramétricos de vehículos, audio sintetizado por Web Audio API,
 * controles de teclado/gamepad, director del festival y bucle principal a 60 FPS.
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { Heightmap } from './terrain/heightmap.js';
import { ErosionMemory } from './terrain/erosionMemory.js';
import { ChunkManager } from './terrain/chunks.js';
import { VehiclePhysics } from './vehicle/physics.js';
import { RainSystem } from './weather/rain.js';
import { MudModel } from './weather/mudModel.js';
import { RaceManager } from './events/raceManager.js';
import { FestivalDirector, FESTIVAL_EVENTS } from './events/festivalDirector.js';
import { RouteEditor } from './community/routeEditor.js';
import { RouteSerializer } from './community/routeSerializer.js';
import { StorageManager } from './storage/sqlite.js';
import { HUD } from './ui/hud.js';
import { GameLoop } from './loop.js';

class CordilleraRallyApp {
  constructor() {
    this.canvas = document.getElementById('canvas3d');
    this.storage = new StorageManager();
    this.hud = new HUD();

    // Estado meteorológico ('sunny', 'mist', 'rain')
    this.currentWeather = 'sunny';
    this.vehiclesCatalog = [];

    // Web Audio sintetizador
    this.audioCtx = null;
    this.engineOsc = null;
    this.engineGain = null;
    this.audioInitialized = false;

    // Entradas de teclado
    this.keys = {
      up: false,
      down: false,
      left: false,
      right: false,
      handbrake: false
    };

    this.init();
  }

  async init() {
    await this.storage.init();
    await this.loadVehiclesCatalog();

    // 1. Configuración de Three.js (Escena, Cámara y Renderer)
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);
    this.scene.fog = new THREE.FogExp2(0x87ceeb, 0.0025);

    this.camera = new THREE.PerspectiveCamera(
      65,
      window.innerWidth / window.innerHeight,
      0.2,
      2500
    );

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // 2. Iluminación ambiental y solar
    this.hemiLight = new THREE.HemisphereLight(0xffffff, 0x444455, 0.7);
    this.scene.add(this.hemiLight);

    this.dirLight = new THREE.DirectionalLight(0xfffaed, 1.4);
    this.dirLight.position.set(200, 350, 150);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 2048;
    this.dirLight.shadow.mapSize.height = 2048;
    this.dirLight.shadow.camera.near = 10;
    this.dirLight.shadow.camera.far = 800;
    const d = 120;
    this.dirLight.shadow.camera.left = -d;
    this.dirLight.shadow.camera.right = d;
    this.dirLight.shadow.camera.top = d;
    this.dirLight.shadow.camera.bottom = -d;
    this.scene.add(this.dirLight);

    // 3. Sistemas de terreno y física
    this.heightmap = new Heightmap(42);
    this.erosionMemory = new ErosionMemory();
    this.chunkManager = new ChunkManager(THREE, this.scene, this.heightmap, this.erosionMemory);

    const defaultVeh = this.vehiclesCatalog[0];
    this.vehiclePhysics = new VehiclePhysics(defaultVeh, this.heightmap, this.erosionMemory);
    this.vehiclePhysics.resetPosition(0, 0, 0);

    // 4. Modelo 3D del coche (mesh paramétrico)
    this.vehicleMesh = this.createVehicle3DMesh(defaultVeh);
    this.scene.add(this.vehicleMesh);

    // 5. Clima y barro
    this.rainSystem = new RainSystem(THREE, this.scene);
    this.mudModel = new MudModel(this.rainSystem, this.erosionMemory);

    // 6. Carrera y Festival
    this.raceManager = new RaceManager(THREE, this.scene);
    this.festivalDirector = new FestivalDirector(this.raceManager, (weather) => this.setWeather(weather));

    // Callback de llegada a meta
    this.raceManager.onRaceFinished = (results) => {
      this.handleRaceFinished(results);
    };

    // 7. Editor de rutas comunitarias
    this.routeEditor = new RouteEditor(THREE, this.scene, this.raceManager);

    // 8. Event listeners de control y UI
    this.setupControls();
    this.setupUIListeners();
    this.setWeather('sunny');

    // Cargar primer evento del festival por defecto
    this.festivalDirector.selectEvent(0);

    // 9. Bucle de juego a 60 FPS
    this.gameLoop = new GameLoop(
      (dt) => this.update(dt),
      (dt) => this.render(dt)
    );
    this.gameLoop.start();

    // Redimensionamiento de ventana
    window.addEventListener('resize', () => this.onWindowResize());

    console.log("Cordillera Rally Festival v1.0.0 inicializado con éxito.");
  }

  async loadVehiclesCatalog() {
    try {
      const resp = await fetch('./src/vehicle/garage.json');
      this.vehiclesCatalog = await resp.json();
    } catch (e) {
      console.warn("Fallo cargando garage.json, usando catálogo fallback:", e);
      this.vehiclesCatalog = [
        { id: "vicuna_rally_rs", name: "Vicuña RS Turbo", category: "Rally Clásico B", mass: 1050, topSpeedKmh: 210, acceleration: 0.95, brakeForce: 1.1, handling: 0.88, driftFactor: 0.75, color: "#ff5500" },
        { id: "condor_gt4", name: "Cóndor Apex GT", category: "Super GT Festival", mass: 1320, topSpeedKmh: 265, acceleration: 1.25, brakeForce: 1.35, handling: 0.96, driftFactor: 0.60, color: "#00e5ff" },
        { id: "alpaca_baja_4x4", name: "Alpaca Raid 4x4", category: "Cross Country / Mud", mass: 1750, topSpeedKmh: 175, acceleration: 0.82, brakeForce: 0.98, handling: 0.74, driftFactor: 0.45, color: "#ffb300" },
        { id: "paramo_electric_e1", name: "Páramo EV Mach-R", category: "Prototipo Eléctrico E-Rally", mass: 1420, topSpeedKmh: 235, acceleration: 1.45, brakeForce: 1.28, handling: 0.92, driftFactor: 0.70, color: "#76ff03" }
      ];
    }
  }

  createVehicle3DMesh(config) {
    const group = new THREE.Group();

    // Carrocería principal aerodinámica
    const bodyGeom = new THREE.BoxGeometry(1.8, 0.7, 4.2);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(config.color || 0xff5500),
      metalness: 0.6,
      roughness: 0.25
    });
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    body.position.y = 0.55;
    body.castShadow = true;
    group.add(body);

    // Cabina / Habitáculo con lunas polarizadas
    const cabinGeom = new THREE.BoxGeometry(1.4, 0.6, 2.2);
    const cabinMat = new THREE.MeshStandardMaterial({
      color: 0x111116,
      metalness: 0.9,
      roughness: 0.1
    });
    const cabin = new THREE.Mesh(cabinGeom, cabinMat);
    cabin.position.set(0, 1.1, -0.3);
    cabin.castShadow = true;
    group.add(cabin);

    // Alerón trasero de rally festival
    const wingGeom = new THREE.BoxGeometry(1.7, 0.08, 0.5);
    const wingMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    const wing = new THREE.Mesh(wingGeom, wingMat);
    wing.position.set(0, 1.35, -1.8);
    wing.castShadow = true;
    group.add(wing);

    // Faros LED de carrera delanteros
    const headlightGeom = new THREE.BoxGeometry(0.35, 0.15, 0.1);
    const headlightMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff });
    const hlLeft = new THREE.Mesh(headlightGeom, headlightMat);
    hlLeft.position.set(-0.6, 0.6, 2.11);
    const hlRight = new THREE.Mesh(headlightGeom, headlightMat);
    hlRight.position.set(0.6, 0.6, 2.11);
    group.add(hlLeft, hlRight);

    // Luces traseras LED
    const taillightMat = new THREE.MeshBasicMaterial({ color: 0xff1744 });
    const tlLeft = new THREE.Mesh(headlightGeom, taillightMat);
    tlLeft.position.set(-0.6, 0.65, -2.11);
    const tlRight = new THREE.Mesh(headlightGeom, taillightMat);
    tlRight.position.set(0.6, 0.65, -2.11);
    group.add(tlLeft, tlRight);

    // 4 Ruedas con llantas y neumáticos de competición
    const wheelGeom = new THREE.CylinderGeometry(0.38, 0.38, 0.3, 16);
    wheelGeom.rotateZ(Math.PI / 2);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 });

    const wheelPositions = [
      [-0.95, 0.38, 1.3],  // Delantera izquierda
      [0.95, 0.38, 1.3],   // Delantera derecha
      [-0.95, 0.38, -1.3], // Trasera izquierda
      [0.95, 0.38, -1.3]   // Trasera derecha
    ];

    group.wheels = [];
    wheelPositions.forEach((pos, idx) => {
      const wheel = new THREE.Mesh(wheelGeom, wheelMat);
      wheel.position.set(pos[0], pos[1], pos[2]);
      wheel.castShadow = true;
      group.add(wheel);
      group.wheels.push(wheel);
    });

    return group;
  }

  setWeather(preset) {
    this.currentWeather = preset;
    const descEl = document.getElementById('hud-weather-badge');

    if (preset === 'sunny') {
      this.scene.background = new THREE.Color(0x87ceeb);
      this.scene.fog = new THREE.FogExp2(0x87ceeb, 0.002);
      this.dirLight.intensity = 1.4;
      this.rainSystem.setIntensity(0.0);
      if (descEl) descEl.textContent = 'Soleado / Pista Seca';
    } else if (preset === 'mist') {
      this.scene.background = new THREE.Color(0xa0a8b2);
      this.scene.fog = new THREE.FogExp2(0xa0a8b2, 0.009); // Niebla densa
      this.dirLight.intensity = 0.8;
      this.rainSystem.setIntensity(0.15);
      if (descEl) descEl.textContent = 'Niebla Andina / Húmedo';
    } else if (preset === 'rain') {
      this.scene.background = new THREE.Color(0x4a5568);
      this.scene.fog = new THREE.FogExp2(0x4a5568, 0.006);
      this.dirLight.intensity = 0.5;
      this.rainSystem.setIntensity(0.9);
      if (descEl) descEl.textContent = 'Lluvia Torrencial / Lodo';
    }
  }

  setupControls() {
    window.addEventListener('keydown', (e) => {
      this._initAudioOnUserGesture();
      switch (e.code) {
        case 'ArrowUp':
        case 'KeyW':
          this.keys.up = true;
          break;
        case 'ArrowDown':
        case 'KeyS':
          this.keys.down = true;
          break;
        case 'ArrowLeft':
        case 'KeyA':
          this.keys.left = true;
          break;
        case 'ArrowRight':
        case 'KeyD':
          this.keys.right = true;
          break;
        case 'Space':
          this.keys.handbrake = true;
          e.preventDefault();
          break;
        case 'KeyR':
          this.vehiclePhysics.resetPosition(0, 0, 0);
          break;
      }
    });

    window.addEventListener('keyup', (e) => {
      switch (e.code) {
        case 'ArrowUp':
        case 'KeyW':
          this.keys.up = false;
          break;
        case 'ArrowDown':
        case 'KeyS':
          this.keys.down = false;
          break;
        case 'ArrowLeft':
        case 'KeyA':
          this.keys.left = false;
          break;
        case 'ArrowRight':
        case 'KeyD':
          this.keys.right = false;
          break;
        case 'Space':
          this.keys.handbrake = false;
          break;
      }
    });
  }

  _initAudioOnUserGesture() {
    if (this.audioInitialized) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioCtx();
      this.engineOsc = this.audioCtx.createOscillator();
      this.engineGain = this.audioCtx.createGain();

      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.setValueAtTime(60, this.audioCtx.currentTime);
      this.engineGain.gain.setValueAtTime(0.04, this.audioCtx.currentTime);

      // Filtro paso bajo para timbre ronco de motor bóxer
      const filter = this.audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450, this.audioCtx.currentTime);

      this.engineOsc.connect(filter);
      filter.connect(this.engineGain);
      this.engineGain.connect(this.audioCtx.destination);

      this.engineOsc.start();
      this.audioInitialized = true;
    } catch (e) {
      console.warn("Audio Context bloqueado o no soportado:", e);
    }
  }

  _updateEngineAudio() {
    if (!this.audioInitialized || !this.engineOsc) return;
    const baseFreq = 45;
    const pitch = baseFreq + (this.vehiclePhysics.rpm / 7800) * 160;
    this.engineOsc.frequency.setTargetAtTime(pitch, this.audioCtx.currentTime, 0.05);
  }

  setupUIListeners() {
    // Selector de eventos
    const eventSelect = document.getElementById('event-select-dropdown');
    if (eventSelect) {
      eventSelect.addEventListener('change', (e) => {
        const idx = parseInt(e.target.value, 10);
        const ev = this.festivalDirector.selectEvent(idx);
        document.getElementById('current-event-name').textContent = ev.name;
        this.vehiclePhysics.resetPosition(0, 0, 0);
      });
    }

    // Botón iniciar carrera
    const startBtn = document.getElementById('btn-start-race');
    if (startBtn) {
      startBtn.addEventListener('click', () => {
        this.raceManager.startRace();
        startBtn.textContent = 'Reiniciar Contrarreloj';
      });
    }

    // Panel Garaje
    const garageBtn = document.getElementById('btn-toggle-garage');
    const garagePanel = document.getElementById('panel-garage');
    const closeGarageBtn = document.getElementById('btn-close-garage');

    if (garageBtn && garagePanel) {
      garageBtn.addEventListener('click', () => {
        this.renderGarageCards();
        garagePanel.classList.toggle('active');
      });
    }
    if (closeGarageBtn && garagePanel) {
      closeGarageBtn.addEventListener('click', () => garagePanel.classList.remove('active'));
    }

    // Panel Clasificación (Leaderboard)
    const lbBtn = document.getElementById('btn-toggle-leaderboard');
    const lbPanel = document.getElementById('panel-leaderboard');
    const closeLbBtn = document.getElementById('btn-close-leaderboard');

    if (lbBtn && lbPanel) {
      lbBtn.addEventListener('click', () => {
        this.renderLeaderboardTable();
        lbPanel.classList.toggle('active');
      });
    }
    if (closeLbBtn && lbPanel) {
      closeLbBtn.addEventListener('click', () => lbPanel.classList.remove('active'));
    }

    // Panel Editor de Rutas Comunitarias
    const routeBtn = document.getElementById('btn-toggle-route-editor');
    const routePanel = document.getElementById('panel-route-editor');
    const closeRouteBtn = document.getElementById('btn-close-route-editor');
    const recBtn = document.getElementById('btn-rec-checkpoint');
    const finishRouteBtn = document.getElementById('btn-save-route');

    if (routeBtn && routePanel) {
      routeBtn.addEventListener('click', () => routePanel.classList.toggle('active'));
    }
    if (closeRouteBtn && routePanel) {
      closeRouteBtn.addEventListener('click', () => routePanel.classList.remove('active'));
    }

    if (recBtn) {
      recBtn.addEventListener('click', () => {
        if (!this.routeEditor.isRecording) {
          this.routeEditor.startRecording("Ruta del Piloto", "Tú");
          recBtn.textContent = "Colocar Checkpoint Aquí";
        } else {
          this.routeEditor.addCheckpointAt(this.vehiclePhysics.position, this.vehiclePhysics.rotation.yaw);
          const count = this.routeEditor.recordedCheckpoints.length;
          document.getElementById('route-editor-status').textContent = `Checkpoints colocados: ${count}`;
        }
      });
    }

    if (finishRouteBtn) {
      finishRouteBtn.addEventListener('click', () => {
        const result = this.routeEditor.finishRecording();
        if (result) {
          this.storage.saveCommunityRoute(result.routeData);
          document.getElementById('route-share-code').value = result.base64Code;
          alert(`¡Ruta guardada con éxito! Longitud: ${result.routeData.lengthKm} km.`);
          if (recBtn) recBtn.textContent = "Iniciar Nueva Grabación";
        } else {
          alert("Debes colocar al menos 2 checkpoints para crear una ruta válida.");
        }
      });
    }

    // Importar código de ruta compartida
    const loadCodeBtn = document.getElementById('btn-load-share-code');
    if (loadCodeBtn) {
      loadCodeBtn.addEventListener('click', () => {
        const code = document.getElementById('route-import-input').value;
        const routeObj = RouteSerializer.deserializeFromBase64(code);
        if (routeObj) {
          this.raceManager.loadEvent(routeObj);
          this.setWeather(routeObj.weatherPreset || 'sunny');
          alert(`¡Ruta comunitaria cargada: "${routeObj.title}" creada por ${routeObj.creator}!`);
          routePanel.classList.remove('active');
        } else {
          alert("Código de ruta inválido.");
        }
      });
    }
  }

  renderGarageCards() {
    const container = document.getElementById('garage-cards-container');
    if (!container) return;
    container.innerHTML = '';

    this.vehiclesCatalog.forEach((veh) => {
      const isSelected = this.vehiclePhysics.config.id === veh.id;
      const card = document.createElement('div');
      card.className = `vehicle-card ${isSelected ? 'selected' : ''}`;
      card.innerHTML = `
        <h3>${veh.name}</h3>
        <span class="veh-badge">${veh.category}</span>
        <div class="stats-row"><span>Velocidad Máx:</span><span>${veh.topSpeedKmh} km/h</span></div>
        <div class="stats-row"><span>Masa:</span><span>${veh.mass} kg</span></div>
        <div class="stats-row"><span>Tracción:</span><span>${veh.driveType}</span></div>
        <p style="font-size:0.75rem; margin-top:0.6rem; color:var(--text-secondary);">${veh.description}</p>
      `;

      card.addEventListener('click', () => {
        this.switchVehicle(veh);
        this.renderGarageCards();
      });

      container.appendChild(card);
    });
  }

  switchVehicle(vehConfig) {
    this.scene.remove(this.vehicleMesh);
    this.vehiclePhysics.setVehicle(vehConfig);
    this.vehicleMesh = this.createVehicle3DMesh(vehConfig);
    this.scene.add(this.vehicleMesh);
  }

  renderLeaderboardTable() {
    const tbody = document.getElementById('leaderboard-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const currentEvId = this.festivalDirector.getEvent(this.festivalDirector.activeEventIndex).id;
    const entries = this.storage.getLeaderboard(currentEvId);

    entries.forEach((e, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>#${idx + 1}</td>
        <td><strong>${e.pilot_name}</strong></td>
        <td>${e.vehicle_id}</td>
        <td>${this.hud.formatTime(e.time_ms)}</td>
        <td>${e.weather_condition}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  handleRaceFinished(results) {
    const banner = document.getElementById('finish-banner');
    const finalTimeEl = document.getElementById('finish-final-time');

    if (banner && finalTimeEl) {
      finalTimeEl.textContent = this.hud.formatTime(results.totalTimeMs);
      banner.classList.add('active');

      setTimeout(() => {
        banner.classList.remove('active');
      }, 5000);
    }

    // Registrar en Leaderboard persistente
    this.storage.addLeaderboardEntry({
      eventId: results.event.id,
      pilotName: 'Tú (Cóndor)',
      vehicleId: this.vehiclePhysics.config.name,
      timeMs: results.totalTimeMs,
      weather: this.currentWeather === 'sunny' ? 'Soleado' : (this.currentWeather === 'mist' ? 'Niebla' : 'Lluvia')
    });
  }

  update(dt) {
    // 1. Aplicar entradas del usuario
    let throttle = this.keys.up ? 1.0 : 0.0;
    let brake = this.keys.down ? 1.0 : 0.0;
    let steer = (this.keys.left ? -1.0 : 0.0) + (this.keys.right ? 1.0 : 0.0);
    let handbrake = this.keys.handbrake ? 1.0 : 0.0;

    this.vehiclePhysics.setInputs(throttle, brake, steer, handbrake);

    // 2. Simular física con influencia climática
    this.vehiclePhysics.update(dt, this.rainSystem.wetness);

    // 3. Sincronizar posición y rotación del modelo 3D
    const pos = this.vehiclePhysics.position;
    const rot = this.vehiclePhysics.rotation;

    this.vehicleMesh.position.set(pos.x, pos.y, pos.z);
    this.vehicleMesh.rotation.set(rot.pitch, rot.yaw, rot.roll, 'YXZ');

    // Giro de ruedas delanteras con la dirección
    if (this.vehicleMesh.wheels && this.vehicleMesh.wheels.length >= 2) {
      this.vehicleMesh.wheels[0].rotation.y = this.vehiclePhysics.steerAngle;
      this.vehicleMesh.wheels[1].rotation.y = this.vehiclePhysics.steerAngle;
    }

    // 4. Actualizar chunks dinámicos del terreno
    this.chunkManager.update(pos.x, pos.z);

    // 5. Partículas de lluvia y acumulación de barro
    this.rainSystem.update(dt, pos);

    // 6. Cronómetro y checkpoints del gestor de carreras
    this.raceManager.update(pos);

    // 7. Síntesis sonora del motor
    this._updateEngineAudio();
  }

  render(dt) {
    // Cámara en 3ª persona deportiva (seguimiento suave con amortiguación tipo Forza Horizon)
    const pos = this.vehiclePhysics.position;
    const yaw = this.vehiclePhysics.rotation.yaw;

    const followDistance = 7.5;
    const cameraHeight = 2.8;

    const targetCamX = pos.x - Math.sin(yaw) * followDistance;
    const targetCamZ = pos.z - Math.cos(yaw) * followDistance;
    const targetCamY = pos.y + cameraHeight;

    this.camera.position.lerp(new THREE.Vector3(targetCamX, targetCamY, targetCamZ), 0.12);
    this.camera.lookAt(pos.x, pos.y + 1.2, pos.z);

    // Actualizar sombras direccionales centradas en el coche
    this.dirLight.position.set(pos.x + 80, pos.y + 180, pos.z + 60);
    this.dirLight.target.position.set(pos.x, pos.y, pos.z);
    this.dirLight.target.updateMatrixWorld();

    // Render 3D Three.js
    this.renderer.render(this.scene, this.camera);

    // Telemetría en el HUD
    const weatherDesc = this.mudModel.getConditionLabel(this.rainSystem.wetness);
    this.hud.updateTelemetry(this.vehiclePhysics, this.erosionMemory, weatherDesc, this.raceManager);
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}

// Inicializar al cargar el DOM
window.addEventListener('DOMContentLoaded', () => {
  new CordilleraRallyApp();
});
