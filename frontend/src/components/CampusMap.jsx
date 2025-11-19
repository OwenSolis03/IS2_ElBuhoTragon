import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// --- CONFIGURACIÓN TÉCNICA DE ICONOS ---
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

const CampusMap = () => {
  // 1. Coordenadas del Centro de la UNISON (Actualizado)
  const POSITION_UNISON = [29.083836, -110.962568]; 
  const DEFAULT_ZOOM = 16; // en 16 queda la uni centrada 

  // 2. Arreglo vacío esperando datos reales
  const cafeterias = [
    // Aquí van las coordenadas de cada cafeteria.
    // Ejemplo de formato:
    // { id: 1, nombre: "Ejemplo", lat: 0, lng: 0, tipo: "..." },
  ];

  return (
    <div className="w-full h-[500px] rounded-xl overflow-hidden shadow-lg border border-gray-200 dark:border-gray-700 z-0">
      <MapContainer 
        center={POSITION_UNISON} 
        zoom={DEFAULT_ZOOM} 
        style={{ height: "100%", width: "100%", zIndex: 0 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Renderizado condicional: Solo pintará si hay cafeterías en la lista */}
        {cafeterias.map((cafe) => (
          <Marker key={cafe.id} position={[cafe.lat, cafe.lng]}>
            <Popup>
              <div className="text-center">
                <h3 className="font-bold text-orange-600">{cafe.nombre}</h3>
                <p className="text-sm text-gray-600">{cafe.tipo}</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default CampusMap;