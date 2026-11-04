// frontend/src/components/CampusMap.jsx
import React, { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiLoader } from 'react-icons/fi';
import { API_URL } from "../config";
import { puntoDeTiendita } from './map/puntos';

// MapLibre pesa ~800 KB: solo se descarga en las páginas que muestran un mapa
const BuhoMap = lazy(() => import('./map/BuhoMap'));

const CampusMap = () => {
  const [tienditas, setTienditas] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

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

  const puntos = useMemo(() => tienditas.map(puntoDeTiendita).filter(Boolean), [tienditas]);
  const abrirCafeteria = useCallback((punto) => navigate(`/cafeterias/${punto.id}`), [navigate]);

  return (
    <div className="w-full h-full relative z-0">
      {/* Indicador sutil de carga sobre el mapa */}
      {loading && (
        <div className="absolute top-4 right-4 z-10 bg-canvas-deep/90 border border-white/10 px-4 py-2 rounded-full backdrop-blur-md flex items-center gap-2.5 text-sm font-mono text-neutral-200">
          <FiLoader className="animate-spin text-unison-gold-light" size={15} />
          <span>Localizando tienditas...</span>
        </div>
      )}

      <Suspense fallback={<div className="w-full h-full bg-canvas-deep" />}>
        <BuhoMap puntos={puntos} onAbrirPunto={abrirCafeteria} />
      </Suspense>
    </div>
  );
};

export default CampusMap;
