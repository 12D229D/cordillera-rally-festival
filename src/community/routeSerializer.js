/**
 * Route Serializer
 * Serializa y deserializa rutas y checkpoints en formato JSON y Base64 comprimido para compartir.
 */

export class RouteSerializer {
  /**
   * Serializa un objeto de ruta a cadena Base64
   */
  static serializeToBase64(routeObj) {
    try {
      const minified = {
        t: routeObj.title || 'Ruta Andina',
        c: routeObj.creator || 'Piloto Festival',
        w: routeObj.weather || 'sunny',
        d: routeObj.difficulty || 'Medio',
        cp: (routeObj.checkpoints || []).map(p => [
          Math.round(p.x * 10) / 10,
          Math.round(p.y * 10) / 10,
          Math.round(p.z * 10) / 10,
          Math.round(p.radius || 15)
        ])
      };
      const jsonStr = JSON.stringify(minified);
      return btoa(encodeURIComponent(jsonStr));
    } catch (e) {
      console.error("Error al serializar ruta a Base64:", e);
      return null;
    }
  }

  /**
   * Deserializa una cadena Base64 a objeto de ruta
   */
  static deserializeFromBase64(base64Str) {
    try {
      const jsonStr = decodeURIComponent(atob(base64Str.trim()));
      const min = JSON.parse(jsonStr);
      return {
        id: 'comm_' + Date.now().toString(36),
        title: min.t,
        creator: min.c,
        weatherPreset: min.w,
        difficulty: min.d,
        checkpoints: (min.cp || []).map((arr, i) => ({
          x: arr[0],
          y: arr[1],
          z: arr[2],
          radius: arr[3],
          name: i === 0 ? 'Salida' : (i === min.cp.length - 1 ? 'Meta' : `CP ${i}`)
        }))
      };
    } catch (e) {
      console.error("Error al deserializar ruta desde Base64:", e);
      return null;
    }
  }

  /**
   * Calcula longitud total en kilómetros de un trazado
   */
  static calculateLengthKm(checkpoints) {
    if (!checkpoints || checkpoints.length < 2) return 0;
    let distTotal = 0;
    for (let i = 0; i < checkpoints.length - 1; i++) {
      const p1 = checkpoints[i];
      const p2 = checkpoints[i + 1];
      distTotal += Math.hypot(p2.x - p1.x, p2.y - p1.y, p2.z - p1.z);
    }
    return Math.round((distTotal / 1000) * 100) / 100;
  }
}
