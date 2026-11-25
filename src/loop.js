/**
 * Main Game Loop & Animation Runner
 * Orquesta Three.js, actualización de física a paso fijo y renderizado a 60 FPS.
 */

export class GameLoop {
  constructor(updateFn, renderFn) {
    this.updateFn = updateFn;
    this.renderFn = renderFn;

    this.isRunning = false;
    this.lastTime = 0;
    this.fixedStep = 1 / 60; // 60 Hz física
    this.accumulator = 0;
    this._rafId = null;

    this._tick = this._tick.bind(this);
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this._rafId = requestAnimationFrame(this._tick);
  }

  stop() {
    this.isRunning = false;
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  }

  _tick(currentTime) {
    if (!this.isRunning) return;

    let delta = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    // Evitar salto gigante tras desenfoque de pestaña
    if (delta > 0.1) delta = 0.1;
    this.accumulator += delta;

    while (this.accumulator >= this.fixedStep) {
      this.updateFn(this.fixedStep);
      this.accumulator -= this.fixedStep;
    }

    this.renderFn(delta);

    this._rafId = requestAnimationFrame(this._tick);
  }
}
