# ASSETS-LICENSES.md — Cordillera Rally Festival

Este documento certifica el origen, la titularidad y las licencias aplicables de todos los activos de software, modelos, sonidos y componentes utilizados en el videojuego **Cordillera Rally Festival**.

---

## 1. Declaración de Originalidad y Propiedad Intelectual
- **Coches y Marcas de Vehículos**: Todos los vehículos presentes en el juego (`Vicuña RS Turbo`, `Cóndor Apex GT`, `Alpaca Raid 4x4`, `Páramo EV Mach-R`) son **100 % ficticios**, diseñados con nombres originales y parametrizaciones físicas exclusivas. No representan marcas comerciales registradas, logotipos ni diseños industriales protegidos de fabricantes reales (Porsche, Ford, Subaru, Toyota, etc.).
- **Toponimia y Geografía**: La región andina recreada en el juego, así como sus hitos (*Mirador de Frailejones*, *Horquilla del Cóndor*, *Valle Central*), son construcciones geográficas ficticias de inspiración genérica.
- **Términos del Juego**: No se hace uso de marcas o terminología patentada de otras franquicias (como *Forza*, *Horizon*, *Drivatar*, *Autoshow* o *Horizon Life*). En su lugar se emplean términos propios (*Fantasmas de ruta*, *Paddock Festival*, *Terreno Memoria*).

---

## 2. Bibliotecas y Frameworks de Terceros

| Componente | Versión | Licencia | Propósito en el Juego | Enlace / Autor |
| :--- | :---: | :---: | :--- | :--- |
| **Three.js** | `r160` | MIT License | Motor de renderizado WebGL 3D, sombras dinámicas y shaders de terreno por chunks. | [mrdoob/three.js](https://github.com/mrdoob/three.js) |
| **Google Fonts (Outfit)** | WebFont | SIL Open Font License 1.1 | Tipografía legible para la telemetría y textos generales del HUD. | [Outfit on Google Fonts](https://fonts.google.com/specimen/Outfit) |
| **Google Fonts (Rajdhani)** | WebFont | SIL Open Font License 1.1 | Tipografía deportiva para tacómetro de RPM, velocímetro digital y encabezados de rally. | [Rajdhani on Google Fonts](https://fonts.google.com/specimen/Rajdhani) |

---

## 3. Síntesis Sonora y Efectos de Audio
- **Motor y Tacómetro**: El sonido del motor se genera en tiempo real mediante el estándar nativo **Web Audio API** del navegador mediante osciladores matemáticos modulados (`sawtooth` con filtro pasobajo dinámico y pitch escalado por las RPM del motor). No contiene grabaciones con copyright ni samples comerciales.

---

## 4. Modelado 3D y Generación Procedural
- **Modelos de Coche y Checkpoints**: Geometrías paramétricas nativas creadas por código en Three.js (`BoxGeometry`, `CylinderGeometry`, `TorusGeometry`).
- **Terreno y Texturizado**: Mallas procedurales generadas en tiempo real mediante algoritmos fractales de ruido suave y coloreado por vértices según pendiente, altitud y bioma.

---

## 5. Cumplimiento Legal (FTO - Freedom to Operate)
El diseño y código han sido estructurados para operar con total libertad comercial y académica, exentos de infracción de patentes de asistencia de conducción de terceros o derechos de imagen de marcas del sector automotriz.
