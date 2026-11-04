// frontend/src/components/map/BuhoMap.jsx
// Mapa vectorial (MapLibre GL) con la paleta UNISON. Reemplaza a Leaflet.
import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";
import { cargarEstiloUnison } from "./estiloUnison";

// MapLibre calcula la ruta de su worker a partir de su propio archivo, y eso se rompe
// al empaquetar con Vite; se le indica explícitamente el worker como asset.
maplibregl.setWorkerUrl(workerUrl);

const CENTRO_CAMPUS = [-110.9625, 29.0833]; // [lon, lat]

// Textos de los controles de MapLibre en español
const LOCALE_ES = {
  "AttributionControl.ToggleAttribution": "Mostrar u ocultar créditos del mapa",
  "Map.Title": "Mapa",
  "Marker.Title": "Cafetería",
  "NavigationControl.ResetBearing": "Arrastra para girar el mapa; clic para volver al norte",
  "NavigationControl.ZoomIn": "Acercar",
  "NavigationControl.ZoomOut": "Alejar",
  "Popup.Close": "Cerrar",
  "CooperativeGesturesHandler.WindowsHelpText": "Usa Ctrl + rueda del ratón para hacer zoom",
  "CooperativeGesturesHandler.MacHelpText": "Usa ⌘ + rueda del ratón para hacer zoom",
  "CooperativeGesturesHandler.MobileHelpText": "Usa dos dedos para mover el mapa",
};

// En pantallas táctiles un dedo desplaza la página y dos mueven el mapa
const ES_TACTIL = typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches;

// El contenido del popup se arma con nodos de texto (nunca HTML), porque los
// nombres y horarios vienen de la base de datos.
function crearPopup(punto, onAbrirPunto) {
  const caja = document.createElement("div");
  caja.className = "text-center min-w-[190px] p-1";

  const etiqueta = document.createElement("span");
  etiqueta.className = "font-mono text-[11px] uppercase tracking-[0.2em] text-unison-gold-light block mb-1";
  etiqueta.textContent = "Cafetería UNISON";

  const nombre = document.createElement("h3");
  nombre.className = "font-display text-xl text-paper mb-2 leading-snug";
  nombre.textContent = punto.nombre;
  caja.append(etiqueta, nombre);

  if (punto.horario) {
    const horario = document.createElement("div");
    horario.className = "text-xs font-mono text-neutral-200 mb-3 bg-white/[0.08] py-1.5 px-3 rounded-md border border-white/[0.08]";
    horario.textContent = punto.horario;
    caja.append(horario);
  }

  if (onAbrirPunto) {
    const boton = document.createElement("button");
    boton.type = "button";
    boton.className = "w-full bg-unison-blue hover:bg-unison-blue-light text-white text-sm font-mono uppercase tracking-wider py-2.5 px-4 rounded-full transition-colors cursor-pointer border border-unison-blue-light/50";
    boton.textContent = "Consultar carta";
    boton.addEventListener("click", () => onAbrirPunto(punto));
    caja.append(boton);
  }
  return new maplibregl.Popup({ offset: 18, closeButton: true, maxWidth: "260px" }).setDOMContent(caja);
}

function crearMarcador(punto) {
  const el = document.createElement("button");
  el.type = "button";
  el.className = "buho-marcador";
  el.setAttribute("aria-label", punto.nombre);
  return el;
}

/**
 * @param {Array<{id, lat, lon, nombre, horario?}>} puntos  Cafeterías a marcar
 * @param {[number, number]} [centro]  [lat, lon]; si falta, se encuadran los puntos
 * @param {number} [zoom]
 * @param {(punto) => void} [onAbrirPunto]  Si se pasa, el popup muestra "Consultar carta"
 * @param {boolean} [gestosCooperativos]  Para mapas dentro de una página con scroll:
 *        hace falta Ctrl/dos dedos para mover el mapa
 */
export default function BuhoMap({ puntos = [], centro, zoom = 16, onAbrirPunto, gestosCooperativos = false, className = "" }) {
  const contenedor = useRef(null);
  const mapa = useRef(null);
  const marcadores = useRef([]);
  const [error, setError] = useState(null);
  const [listo, setListo] = useState(false);

  // Crear el mapa una sola vez
  useEffect(() => {
    let cancelado = false;
    cargarEstiloUnison()
      .then((estilo) => {
        if (cancelado || !contenedor.current) return;
        mapa.current = new maplibregl.Map({
          container: contenedor.current,
          style: structuredClone(estilo),
          center: centro ? [centro[1], centro[0]] : CENTRO_CAMPUS,
          zoom,
          pitch: 45,
          maxPitch: 70,
          cooperativeGestures: gestosCooperativos || ES_TACTIL,
          attributionControl: { compact: true },
          locale: LOCALE_ES,
        });
        mapa.current.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-left");
        if (gestosCooperativos) {
          // En mapas chicos la atribución desplegada tapa el mapa: queda detrás del botón "i"
          // (es un <details>: colapsado = sin atributo "open" y con la clase compact-show)
          mapa.current.once("load", () => {
            const atribucion = contenedor.current?.querySelector(".maplibregl-ctrl-attrib.maplibregl-compact");
            atribucion?.removeAttribute("open");
            atribucion?.classList.add("maplibregl-compact-show");
          });
        }
        // Los marcadores son elementos HTML: no hace falta esperar a que carguen las teselas
        setListo(true);
      })
      .catch((err) => {
        // Sin WebGL o sin conexión con el servidor de mapas
        console.error("No se pudo cargar el mapa:", err);
        if (!cancelado) setError(err);
      });

    return () => {
      cancelado = true;
      mapa.current?.remove();
      mapa.current = null;
    };
    // El mapa se crea con la vista inicial; los cambios de puntos se manejan abajo
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Marcadores: se rehacen cuando cambian los puntos
  useEffect(() => {
    if (!listo || !mapa.current) return;
    marcadores.current.forEach((m) => m.remove());
    marcadores.current = puntos.map((punto) =>
      new maplibregl.Marker({ element: crearMarcador(punto) })
        .setLngLat([punto.lon, punto.lat])
        .setPopup(crearPopup(punto, onAbrirPunto))
        .addTo(mapa.current)
    );

    if (!centro && puntos.length > 1) {
      const limites = new maplibregl.LngLatBounds();
      puntos.forEach((p) => limites.extend([p.lon, p.lat]));
      mapa.current.fitBounds(limites, { padding: 60, maxZoom: 17, pitch: 45, duration: 0 });
    }
  }, [listo, puntos, centro, onAbrirPunto]);

  if (error) {
    return (
      <div className={`w-full h-full flex items-center justify-center bg-canvas-deep text-center p-6 ${className}`}>
        <p className="text-sm text-silver">
          No se pudo cargar el mapa en este navegador.
          {puntos.length === 1 && (
            <a
              className="block mt-2 text-unison-gold-light underline"
              href={`https://www.google.com/maps/search/?api=1&query=${puntos[0].lat},${puntos[0].lon}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Abrir en Google Maps
            </a>
          )}
        </p>
      </div>
    );
  }

  return <div ref={contenedor} className={`w-full h-full bg-canvas-deep ${className}`} />;
}
