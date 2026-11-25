/**
 * Simcade Vehicle Physics Engine
 * Incluye aceleración, frenada, transferencia longitudinal y lateral de pesos,
 * derrape (drift controlable), suspensión 4 ruedas y respuesta a superficies andinas.
 */

import { TireModel, TIRE_COMPOUNDS } from './tires.js';
import { getSurfaceAt, SURFACE_PROPERTIES, SURFACE_TYPES } from '../terrain/surfaces.js';

export class VehiclePhysics {
  constructor(vehicleConfig, heightmap, erosionMemory) {
    this.config = vehicleConfig;
    this.heightmap = heightmap;
    this.erosionMemory = erosionMemory;

    this.tireModel = new TireModel(TIRE_COMPOUNDS.RALLY_GRAVEL);

    // Posición y orientación en el mundo
    this.position = { x: 0, y: 15, z: 0 };
    this.velocity = { x: 0, y: 0, z: 0 };
    this.rotation = { yaw: 0, pitch: 0, roll: 0 }; // Ángulos de Euler
    this.speedKmh = 0;
    this.rpm = 900;
    this.gear = 1;
    this.maxGear = 6;

    // Dinámica
    this.steerAngle = 0;
    this.driftAngle = 0;
    this.isAirborne = false;
    this.slipRatio = 0;
    this.currentSurface = SURFACE_TYPES.ASPHALT;

    // Ratios de marcha ficticios
    this.gearRatios = [3.4, 2.1, 1.5, 1.15, 0.92, 0.78];
    this.finalDrive = 3.8;

    // Entrada del jugador
    this.inputs = {
      throttle: 0,
      brake: 0,
      steer: 0,
      handbrake: 0
    };

    // Dimensiones
    this.wheelbase = 2.5; // Distancia entre ejes en metros
    this.trackWidth = 1.6; // Ancho de vías
  }

  setInputs(throttle, brake, steer, handbrake) {
    this.inputs.throttle = Math.max(0, Math.min(1, throttle));
    this.inputs.brake = Math.max(0, Math.min(1, brake));
    this.inputs.steer = Math.max(-1, Math.min(1, steer));
    this.inputs.handbrake = Math.max(0, Math.min(1, handbrake));
  }

  setVehicle(vehicleConfig) {
    this.config = vehicleConfig;
  }

  /**
   * Paso de simulación de física (dt en segundos, ej: 1/60)
   */
  update(dt, wetness = 0.0) {
    const { mass, topSpeedKmh, acceleration, brakeForce, handling, driftFactor } = this.config;

    // Dirección suave
    const targetSteer = this.inputs.steer * (0.55 * handling);
    this.steerAngle += (targetSteer - this.steerAngle) * Math.min(1.0, dt * 10);

    // Orientación hacia adelante
    const forwardX = Math.sin(this.rotation.yaw);
    const forwardZ = Math.cos(this.rotation.yaw);
    const rightX = Math.cos(this.rotation.yaw);
    const rightZ = -Math.sin(this.rotation.yaw);

    // Velocidad en el plano horizontal
    const speedMs = Math.hypot(this.velocity.x, this.velocity.z);
    this.speedKmh = speedMs * 3.6;

    // Detección de superficie y altura del terreno
    const groundY = this.heightmap.getHeight(this.position.x, this.position.z);
    const { normal, slope } = this.heightmap.getNormalAndSlope(this.position.x, this.position.z);
    const roadDist = this.heightmap.getDistanceFromMainHighway(this.position.x, this.position.z);
    const isRoad = roadDist < 7.5;
    this.currentSurface = getSurfaceAt(this.position.x, this.position.z, slope, isRoad, isRoad ? SURFACE_TYPES.ASPHALT : undefined);

    // Ajuste de altura del vehículo con respecto al suelo
    const clearance = 0.5;
    const targetY = groundY + clearance;

    if (this.position.y > targetY + 0.15) {
      // En el aire
      this.isAirborne = true;
      this.velocity.y -= 9.81 * dt; // Gravedad
    } else {
      // En contacto con el terreno
      this.isAirborne = false;
      this.position.y = targetY;
      this.velocity.y = 0;

      // Adaptación de pitch y roll a la pendiente
      const forwardSlope = normal.x * forwardX + normal.z * forwardZ;
      const lateralSlope = normal.x * rightX + normal.z * rightZ;
      this.rotation.pitch += (-forwardSlope * 0.7 - this.rotation.pitch) * dt * 8;
      this.rotation.roll += (lateralSlope * 0.7 - this.rotation.roll) * dt * 8;
    }

    // Si está en el suelo, aplicamos tracción y fuerzas de contacto
    if (!this.isAirborne) {
      // Modificador de erosión ("terreno memoria")
      const erosionMod = this.erosionMemory.getGripModifier(this.position.x, this.position.z, this.currentSurface);
      const surfProp = SURFACE_PROPERTIES[this.currentSurface];
      const baseGrip = surfProp.gripBase * erosionMod;

      // Resistencia al avance (aire + rozamiento de rodadura)
      const airDrag = 0.0006 * mass * speedMs * speedMs;
      const rollingDrag = surfProp.rollingResistance * mass * 9.81;
      const totalDrag = (airDrag + rollingDrag) * dt;

      // Fuerza de tracción motriz
      const maxForwardForce = mass * 7.5 * acceleration;
      let driveForce = this.inputs.throttle * maxForwardForce;
      if (this.speedKmh > topSpeedKmh) {
        driveForce = 0; // Corte de inyección en velocidad máxima
      }

      // Fuerza de frenado
      const braking = (this.inputs.brake * mass * 12.0 * brakeForce) + (this.inputs.handbrake * mass * 9.0);

      // Descomposición de velocidad local (longitudinal y lateral)
      const vLong = this.velocity.x * forwardX + this.velocity.z * forwardZ;
      const vLat = this.velocity.x * rightX + this.velocity.z * rightZ;

      // Ángulo de derrape (Drift Angle)
      this.driftAngle = speedMs > 1.5 ? Math.atan2(vLat, Math.abs(vLong)) : 0;
      this.slipRatio = Math.abs(vLat) / Math.max(1.0, speedMs);

      // Freno de mano induce derrape desestabilizando eje trasero
      let lateralFriction = baseGrip * 1.8;
      if (this.inputs.handbrake > 0.1) {
        lateralFriction *= (1.0 - driftFactor * 0.65);
      }

      // Actualizar aceleración longitudinal neta
      let netAccel = (driveForce - Math.sign(vLong) * braking - totalDrag) / mass;
      if (this.inputs.brake > 0 && Math.abs(vLong) < 0.8 && this.inputs.throttle === 0) {
        // Marcha atrás suave al frenar estando quieto
        netAccel = -3.5 * this.inputs.brake;
      }

      const newVLong = vLong + netAccel * dt;
      // Amortiguación de velocidad lateral por agarre de neumáticos
      const newVLat = vLat * Math.max(0, 1.0 - lateralFriction * dt * 5.0);

      // Rotación (yaw) en función de la velocidad y el giro de dirección
      const turnSpeed = (this.steerAngle * (newVLong / 6.0)) * (1.0 + Math.abs(this.driftAngle) * 0.8);
      this.rotation.yaw += turnSpeed * dt;

      // Reconstruir vector de velocidad en el mundo
      this.velocity.x = Math.sin(this.rotation.yaw) * newVLong + Math.cos(this.rotation.yaw) * newVLat;
      this.velocity.z = Math.cos(this.rotation.yaw) * newVLong - Math.sin(this.rotation.yaw) * newVLat;

      // Registro de erosión en el terreno si hay deslizamiento de neumáticos
      if (speedMs > 2.0 && surfProp.deformsSoil) {
        const isMuddy = (this.currentSurface === SURFACE_TYPES.MUD) || (wetness > 0.5);
        this.erosionMemory.recordTirePass(
          this.position.x,
          this.position.z,
          this.slipRatio + (this.inputs.handbrake > 0 ? 0.35 : 0),
          mass * 9.81 * 0.25,
          isMuddy
        );
      }
    }

    // Actualizar posición final
    this.position.x += this.velocity.x * dt;
    this.position.y += this.velocity.y * dt;
    this.position.z += this.velocity.z * dt;

    // Simulación de marcha y RPM de motor para el tacómetro y sonido
    this._updateGearAndRpm();
  }

  _updateGearAndRpm() {
    const ratio = Math.max(0, Math.min(1.0, this.speedKmh / this.config.topSpeedKmh));
    const gearFloat = ratio * (this.maxGear - 1) + 1;
    this.gear = Math.max(1, Math.min(this.maxGear, Math.floor(gearFloat)));

    const gearFraction = gearFloat - Math.floor(gearFloat);
    const idleRpm = 950;
    const maxRpm = 7800;

    if (this.inputs.throttle > 0) {
      this.rpm = idleRpm + gearFraction * (maxRpm - idleRpm) * (0.8 + this.inputs.throttle * 0.2);
    } else {
      this.rpm = Math.max(idleRpm, this.rpm - 150);
    }
  }

  resetPosition(x = 0, z = 0, yaw = 0) {
    this.position.x = x;
    this.position.z = z;
    this.position.y = this.heightmap.getHeight(x, z) + 0.5;
    this.velocity = { x: 0, y: 0, z: 0 };
    this.rotation.yaw = yaw;
    this.rotation.pitch = 0;
    this.rotation.roll = 0;
    this.speedKmh = 0;
    this.rpm = 950;
  }
}
