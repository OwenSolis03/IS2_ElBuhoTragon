// frontend/src/components/CampusMap.jsx
import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { FiLoader } from 'react-icons/fi';

// --- ARREGLO DE ICONOS ROTOS DE LEAFLET ---
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import { API_URL } from "../config";

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34]
});

L.Marker.prototype.options.icon = DefaultIcon;

const CampusMap = () => {
  const [tienditas, setTienditas] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Centro del campus (Rectoría UNISON)
  const centerPosition = [29.0837, -110.9613];

  useEffect(() => {
    let isMounted = true;
    const fetchTienditas = async () => {
      try {
        const response = await fetch(`${API_URL}/api/Tienditas/`);
        if (!response.ok) throw new Error("Error en respuesta de red");
        const data = await response.json();
        if (isMounted) {
          setTienditas(data);
          setLoading(false);
        }
      } catch (error) {
        console.error("Error al cargar cafeterías en el mapa:", error);
        if (isMounted) setLoading(false);
      }
    };
    fetchTienditas();
    return () => { isMounted = false; };
  }, []);

  return (
    <div className="w-full h-full relative z-0 leaflet-dark-tiles">
      {/* Indicador sutil de carga sobre el mapa */}
      {loading && (
        <div className="absolute top-4 right-4 z-[500] bg-[#071326]/90 border border-white/10 px-4 py-2 rounded-full backdrop-blur-md flex items-center gap-2.5 text-sm font-mono text-neutral-200">
          <FiLoader className="animate-spin text-[#B39A3A]" size={15} />
          <span>Localizando tienditas...</span>
        </div>
      )}

      <MapContainer
        center={centerPosition}
        zoom={16}
        style={{ height: "100%", width: "100%", background: "#071326" }}
        scrollWheelZoom={true}
      >
        {/* Tiles oscuros de CartoDB Dark Matter con fallback */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        {/* Marcadores de la base de datos */}
        {tienditas.map((tiendita) => (
          (tiendita.latitud && tiendita.longitud) && (
            <Marker
              key={tiendita.id_tiendita}
              position={[parseFloat(tiendita.latitud), parseFloat(tiendita.longitud)]}
            >
              <Popup>
                <div className="text-center min-w-[190px] p-2">
                  <span className="font-mono text-xs uppercase tracking-wider text-[#B39A3A] block mb-1 font-semibold">
                    Cafetería UNISON
                  </span>
                  <h3 className="font-display text-xl font-normal text-white mb-2 leading-snug">
                    {tiendita.nombre}
                  </h3>

                  {tiendita.hora_apertura && tiendita.hora_cierre && (
                    <div className="text-xs font-mono text-neutral-200 mb-3 bg-white/[0.08] py-1.5 px-3 rounded-md border border-white/[0.08]">
                      {tiendita.hora_apertura.slice(0, 5)} – {tiendita.hora_cierre.slice(0, 5)}
                    </div>
                  )}

                  <button
                    onClick={() => navigate(`/cafeterias/${tiendita.id_tiendita}`)}
                    className="w-full bg-[#163A70] hover:bg-[#204a8e] text-white text-sm font-mono uppercase tracking-wider py-2.5 px-4 rounded-full transition-colors cursor-pointer border border-[#204a8e]/50 font-semibold"
                  >
                    Consultar carta
                  </button>
                </div>
              </Popup>
            </Marker>
          )
        ))}
      </MapContainer>
    </div>
  );
};

export default CampusMap;