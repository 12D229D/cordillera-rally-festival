/**
 * HUD & Telemetry Interface
 * Muestra velocímetro analógico/digital, tacómetro de RPM, marcha actual,
 * minimapa de rally, estado del terreno memoria, clima y tiempos de vuelta.
 */

export class HUD {
  constructor() {
    this.speedEl = document.getElementById('hud-speed');
    this.gearEl = document.getElementById('hud-gear');
    this.rpmBarEl = document.getElementById('hud-rpm-bar');
    this.rpmTextEl = document.getElementById('hud-rpm-text');
    this.surfaceEl = document.getElementById('hud-surface-badge');
    this.erosionEl = document.getElementById('hud-erosion-val');
    this.weatherEl = document.getElementById('hud-weather-badge');
    this.timerEl = document.getElementById('hud-timer');
    this.checkpointEl = document.getElementById('hud-checkpoint-text');

    // Minimapa Canvas 2D
    this.minimapCanvas = document.getElementById('minimap-canvas');
    this.minimapCtx = this.minimapCanvas ? this.minimapCanvas.getContext('2d') : null;
  }

  updateTelemetry(physics, erosionMemory, weatherDesc, raceManager) {
    if (this.speedEl) {
      this.speedEl.textContent = Math.round(physics.speedKmh);
    }

    if (this.gearEl) {
      this.gearEl.textContent = physics.gear;
    }

    if (this.rpmTextEl) {
      this.rpmTextEl.textContent = Math.round(physics.rpm);
    }

    if (this.rpmBarEl) {
      const pct = Math.min(100, (physics.rpm / 8000) * 100);
      this.rpmBarEl.style.width = `${pct}%`;
      if (pct > 88) {
        this.rpmBarEl.style.backgroundColor = '#ff1744';
      } else if (pct > 70) {
        this.rpmBarEl.style.backgroundColor = '#ffea00';
      } else {
        this.rpmBarEl.style.backgroundColor = '#00e5ff';
      }
    }

    if (this.surfaceEl) {
      this.surfaceEl.textContent = physics.currentSurface.toUpperCase();
    }

    if (this.erosionEl) {
      const erosion = erosionMemory.getErosionAt(physics.position.x, physics.position.z);
      this.erosionEl.textContent = `${Math.round(erosion * 100)}%`;
    }

    if (this.weatherEl) {
      this.weatherEl.textContent = weatherDesc;
    }

    // Cronómetro de carrera
    if (this.timerEl && raceManager) {
      if (raceManager.isActive) {
        this.timerEl.textContent = this.formatTime(raceManager.currentTime);
      } else if (!raceManager.isFinished) {
        this.timerEl.textContent = "--:--:---";
      }
    }

    if (this.checkpointEl && raceManager) {
      if (raceManager.isActive && raceManager.checkpoints.length > 0) {
        this.checkpointEl.textContent = `CP: ${raceManager.currentCheckpointIndex + 1} / ${raceManager.checkpoints.length}`;
      } else {
        this.checkpointEl.textContent = "MODO LIBRE";
      }
    }

    // Renderizar minimapa
    this.drawMinimap(physics.position, physics.rotation.yaw, raceManager ? raceManager.checkpoints : []);
  }

  formatTime(ms) {
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    const millis = Math.floor(ms % 1000);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${millis.toString().padStart(3, '0')}`;
  }

  drawMinimap(playerPos, yaw, checkpoints) {
    if (!this.minimapCtx || !this.minimapCanvas) return;
    const ctx = this.minimapCtx;
    const w = this.minimapCanvas.width;
    const h = this.minimapCanvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const scale = 0.22; // Escala de visualización del mapa

    ctx.clearRect(0, 0, w, h);

    // Fondo del minimapa
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.beginPath();
    ctx.arc(cx, cy, cx - 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255, 145, 0, 0.4)';
    ctx.stroke();

    ctx.save();
    ctx.translate(cx, cy);

    // Checkpoints en el minimapa
    if (checkpoints && checkpoints.length > 0) {
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.5)';
      ctx.beginPath();
      checkpoints.forEach((cp, i) => {
        const mx = (cp.x - playerPos.x) * scale;
        const my = (cp.z - playerPos.z) * scale;
        if (i === 0) ctx.moveTo(mx, my);
        else ctx.lineTo(mx, my);
      });
      ctx.stroke();

      checkpoints.forEach((cp, i) => {
        const mx = (cp.x - playerPos.x) * scale;
        const my = (cp.z - playerPos.z) * scale;
        ctx.fillStyle = i === 0 ? '#00e5ff' : '#ff9100';
        ctx.beginPath();
        ctx.arc(mx, my, 3.5, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // Puntero del coche (jugador) en el centro rotado
    ctx.save();
    ctx.rotate(-yaw);
    ctx.fillStyle = '#ff3d00';
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(5, 6);
    ctx.lineTo(0, 3);
    ctx.lineTo(-5, 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.restore();
  }
}
