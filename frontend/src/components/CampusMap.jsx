import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// --- ARREGLO DE ICONOS ROTOS DE LEAFLET ---
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

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
    const navigate = useNavigate();

    // Centro del mapa (Rectoría UNISON)
    const centerPosition = [29.0837, -110.9613];

    // 1. CARGA DE DATOS REALES (DJANGO API)
    useEffect(() => {
        const fetchTienditas = async () => {
            try {
                // Asegúrate que tu backend esté corriendo en el puerto 8000
                const response = await fetch('http://127.0.0.1:8000/api/Tienditas/');
                const data = await response.json();
                setTienditas(data);
                console.log("📍 Cafeterías cargadas:", data.length);
            } catch (error) {
                console.error("❌ Error cargando mapa:", error);
            }
        };
        fetchTienditas();
    }, []);

    return (
        <div className="w-full h-full rounded-xl overflow-hidden shadow-lg border border-gray-700 relative z-0">
            <MapContainer
                center={centerPosition}
                zoom={16}
                style={{ height: "100%", width: "100%" }}
                scrollWheelZoom={true}
            >
                <TileLayer
                    attribution='&copy; OpenStreetMap'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* 2. RENDERIZADO DE MARCADORES DE LA BD */}
                {tienditas.map((tiendita) => (
                    // Validamos que tenga coordenadas antes de pintar
                    (tiendita.latitud && tiendita.longitud) && (
                        <Marker
                            key={tiendita.id_tiendita}
                            position={[tiendita.latitud, tiendita.longitud]}
                        >
                            <Popup>
                                <div className="text-center min-w-[150px]">
                                    <h3 className="font-bold text-gray-800 text-sm mb-1 uppercase">
                                        {tiendita.nombre}
                                    </h3>

                                    {tiendita.hora_apertura && (
                                        <div className="text-xs text-gray-500 mb-2 bg-gray-100 p-1 rounded">
                                            🕒 {tiendita.hora_apertura.slice(0,5)} - {tiendita.hora_cierre.slice(0,5)}
                                        </div>
                                    )}

                                    <button
                                        onClick={() => navigate(`/cafeterias/${tiendita.id_tiendita}`)}
                                        className="w-full bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold py-2 px-3 rounded transition-colors mt-1"
                                    >
                                        VER MENÚ 🍔
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