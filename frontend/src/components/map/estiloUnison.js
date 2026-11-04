// Estilo del mapa con la paleta UNISON.
// Base: estilo "dark" de OpenFreeMap (vectorial, gratuito, sin llave, datos de OpenStreetMap).
// Se descarga una vez, se recolorea capa por capa y se le agregan edificios en 3D.

const ESTILO_BASE = "https://tiles.openfreemap.org/styles/dark";

// Mismos valores que los tokens de frontend/src/index.css (@theme)
const PALETA = {
  fondo: "#071326",        // canvas-deep
  suelo: "#0e2246",        // canvas
  agua: "#0d2345",         // unison-blue-deep
  parque: "#10304f",
  edificio: "#122b56",     // panel-surface
  edificio3d: "#163466",   // surface
  calleMenor: "#1b3d75",   // surface-hover
  calleMayor: "#204a8e",   // unison-blue-light
  autopista: "#2a5aa8",
  borde: "#0a1830",
  linea: "#3a4a66",
  texto: "#d4d4d4",        // silver
  textoFuerte: "#F2F2F0",  // paper
  textoSuave: "#8a8a8a",
};

// [prefijo del id de capa, propiedad de pintura, color]; gana la primera coincidencia
const REGLAS = [
  ["background", "background-color", PALETA.fondo],
  ["water_name", "text-color", PALETA.textoSuave],
  ["waterway", "line-color", PALETA.agua],
  ["water", "fill-color", PALETA.agua],
  ["landuse_residential", "fill-color", PALETA.suelo],
  ["landuse_park", "fill-color", PALETA.parque],
  ["landcover_wood", "fill-color", PALETA.parque],
  ["building", "fill-color", PALETA.edificio],
  ["aeroway", "fill-color", PALETA.edificio],
  ["road_area_pier", "fill-color", PALETA.fondo],
  ["road_pier", "line-color", PALETA.fondo],
  ["highway_path", "line-color", PALETA.calleMenor],
  ["highway_minor", "line-color", PALETA.calleMenor],
  ["highway_major_casing", "line-color", PALETA.borde],
  ["highway_major", "line-color", PALETA.calleMayor],
  ["highway_motorway_casing", "line-color", PALETA.borde],
  ["highway_motorway", "line-color", PALETA.autopista],
  ["highway_name", "text-color", PALETA.textoSuave],
  ["railway", "line-color", PALETA.linea],
  ["boundary", "line-color", PALETA.linea],
  ["place_city", "text-color", PALETA.textoFuerte],
  ["place", "text-color", PALETA.texto],
];

function recolorear(estilo) {
  for (const capa of estilo.layers) {
    const regla = REGLAS.find(([prefijo, propiedad]) =>
      capa.id.startsWith(prefijo) && propiedad.startsWith(capa.type === "symbol" ? "text" : capa.type)
    );
    if (regla) capa.paint = { ...capa.paint, [regla[1]]: regla[2] };
    if (capa.type === "symbol" && capa.paint?.["text-halo-color"] !== undefined) {
      capa.paint["text-halo-color"] = PALETA.fondo;
    }
  }

  // Edificios en 3D al acercarse (altura real de OpenStreetMap cuando existe)
  const indiceEtiquetas = estilo.layers.findIndex((capa) => capa.type === "symbol");
  estilo.layers.splice(indiceEtiquetas, 0, {
    id: "edificios-3d",
    type: "fill-extrusion",
    source: "openmaptiles",
    "source-layer": "building",
    minzoom: 15,
    paint: {
      "fill-extrusion-color": PALETA.edificio3d,
      "fill-extrusion-height": ["coalesce", ["get", "render_height"], 6],
      "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0],
      "fill-extrusion-opacity": 0.8,
    },
  });
  return estilo;
}

let estiloEnCache = null;

// Una sola descarga por visita, compartida por todos los mapas de la página
export function cargarEstiloUnison() {
  if (!estiloEnCache) {
    estiloEnCache = fetch(ESTILO_BASE)
      .then((res) => {
        if (!res.ok) throw new Error(`Estilo del mapa: HTTP ${res.status}`);
        return res.json();
      })
      .then(recolorear)
      .catch((error) => {
        estiloEnCache = null; // permitir reintento en la siguiente carga
        throw error;
      });
  }
  return estiloEnCache;
}
