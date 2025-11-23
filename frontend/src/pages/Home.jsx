// src/pages/Home.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import CafeCard from "../components/CafeCard";
import Header from "../components/Header";
import Footer from "../components/Footer";
import ChatWidget from "../components/ChatWidget";
import { FiSearch, FiChevronDown } from 'react-icons/fi';

// --- IMÁGENES ESTÁTICAS ---
import Derecho1 from "/Derecho1Card.jpeg";
import TrabajoSocial from "/TrabajoSocial1Card.jpeg";
import Educacion from "/Eduacion1Card.jpeg";
import Derecho2 from "/Derecho2Card.jpeg";
import Historia from "/Historia1Card.jpeg";
import Medicina1 from "/Medicina1Card.jpeg";
import Medicina2 from "/Medicina2Card.jpeg";
import CivilMinas from "/IngenieriaCivil1Card.jpeg";
import IngenieriaQuimica from "/IngQuimica1Card.jpeg";
import Geologia from "/Cafeteria-Geologia1Card.jpeg";
import Matematicas from "/Matematicas1Card.png";
import Artes from "/Artes1Card.png";
import LogoDefault from "../assets/logo.png";

const Home = () => {
  const [cafeterias, setCafeterias] = useState([]); // Todas las cafeterías
  const [allMenus, setAllMenus] = useState([]);     // Todos los menús para filtrar
  const [filteredCafeterias, setFilteredCafeterias] = useState([]); // Lista resultante
  const [facultades, setFacultades] = useState([]); // Lista de facultades

  const [loading, setLoading] = useState(true);
  const [cafeteriaDestacada, setCafeteriaDestacada] = useState(null);
  const [autoplay, setAutoplay] = useState(true);

  // --- ESTADOS DE LOS FILTROS ---
  const [filterFacultad, setFilterFacultad] = useState("");
  const [filterComida, setFilterComida] = useState("");
  const [filterPrecio, setFilterPrecio] = useState("");

  // Opciones de comida (Hardcodeadas para consistencia visual)
  const categoriasOptions = [
      "Desayuno", 
      "Almuerzo", 
      "Comida", 
      "Comida Corrida", 
      "Vegana / Vegetariana", 
      "Fit / Saludable", 
      "Bebidas", 
      "Postres", 
      "Snacks"
  ];

  // Mapa de imágenes
  const imagenesOriginales = {
    1: Derecho1, 2: TrabajoSocial, 3: Educacion, 4: Derecho2,
    5: Historia, 6: IngenieriaQuimica, 7: CivilMinas, 8: Medicina1,
    9: Matematicas, 10: Artes, 11: Geologia, 13: Medicina2
  };

  // 1. CARGA DE DATOS MAESTRA
  useEffect(() => {
    const loadData = async () => {
      try {
        const [resCafes, resMenus, resFacus] = await Promise.all([
            fetch("http://127.0.0.1:8000/api/Tienditas/"),
            fetch("http://127.0.0.1:8000/api/Menus/"),
            fetch("http://127.0.0.1:8000/api/Facultades/")
        ]);
        
        const dataCafes = await resCafes.json();
        const dataMenus = await resMenus.json();
        const dataFacus = await resFacus.json();

        setCafeterias(dataCafes);
        setAllMenus(dataMenus);
        setFacultades(dataFacus);
        
        // Inicializar
        setFilteredCafeterias(dataCafes);
        if (dataCafes.length > 0) setCafeteriaDestacada(dataCafes[0]);
        setLoading(false);
      } catch (e) { console.error(e); }
    };
    loadData();
  }, []);

  // 2. MOTOR DE FILTRADO INTELIGENTE
  useEffect(() => {
    let result = cafeterias;

    // A) Filtro por Facultad
    if (filterFacultad) {
        result = result.filter(c => c.id_facultad === parseInt(filterFacultad));
    }

    // B) Filtro por Comida (Busca en los menús)
    if (filterComida) {
        // Encontramos los IDs de tiendas que venden esa comida
        const tiendasConComida = allMenus
            .filter(m => m.categoria === filterComida)
            .map(m => m.id_tiendita);
        result = result.filter(c => tiendasConComida.includes(c.id_tiendita));
    }

    // C) Filtro por Precio (Busca platillos accesibles)
    if (filterPrecio) {
        const maxPrecio = parseFloat(filterPrecio);
        // Encontramos tiendas con al menos un platillo en ese rango
        const tiendasEnPresupuesto = allMenus
            .filter(m => parseFloat(m.precio) <= maxPrecio)
            .map(m => m.id_tiendita);
        result = result.filter(c => tiendasEnPresupuesto.includes(c.id_tiendita));
    }

    setFilteredCafeterias(result);
  }, [filterFacultad, filterComida, filterPrecio, cafeterias, allMenus]);

  // 3. LÓGICA DE HORARIOS (Abiertas/Cerradas)
  const getHorarioStatus = (list) => {
    const ahora = new Date();
    const minutosActuales = ahora.getHours() * 60 + ahora.getMinutes();
    const abiertas = [];
    const cerradas = [];

    list.forEach(cafe => {
      if (!cafe.hora_apertura || !cafe.hora_cierre) {
        cerradas.push(cafe); // Sin horario = Cerrada por defecto
        return;
      }
      const [apH, apM] = cafe.hora_apertura.split(':').map(Number);
      const [ciH, ciM] = cafe.hora_cierre.split(':').map(Number);
      const inicio = apH * 60 + apM;
      const fin = ciH * 60 + ciM;

      if (minutosActuales >= inicio && minutosActuales < fin) abiertas.push(cafe);
      else cerradas.push(cafe);
    });
    return { abiertas, cerradas };
  };

  const { abiertas, cerradas } = getHorarioStatus(filteredCafeterias);

  // Lógica de Carrusel
  const siguienteCafeteria = () => {
    if (!cafeterias.length) return;
    const index = cafeterias.indexOf(cafeteriaDestacada);
    setCafeteriaDestacada(cafeterias[(index + 1) % cafeterias.length]);
    setAutoplay(false);
  };
  
  const anteriorCafeteria = () => {
    if (!cafeterias.length) return;
    const index = cafeterias.indexOf(cafeteriaDestacada);
    setCafeteriaDestacada(cafeterias[(index - 1 + cafeterias.length) % cafeterias.length]);
    setAutoplay(false);
  };

  useEffect(() => {
    let intervalo;
    if (autoplay && cafeterias.length > 0) {
      intervalo = setInterval(() => {
        const index = cafeterias.indexOf(cafeteriaDestacada);
        setCafeteriaDestacada(cafeterias[(index + 1) % cafeterias.length]);
      }, 5000);
    }
    return () => clearInterval(intervalo);
  }, [cafeteriaDestacada, autoplay, cafeterias]);

  const getImageSource = (cafe) => {
    if (imagenesOriginales[cafe.id_tiendita]) return imagenesOriginales[cafe.id_tiendita];
    return cafe.imagen_url || LogoDefault;
  };

  return (
    <div style={{
      minHeight: "100vh", width: "100vw", margin: 0, padding: 0,
      display: "flex", flexDirection: "column",
      backgroundColor: "#141b2d", color: "#e4e4e7", overflowX: "hidden"
    }}>
      <Header />

      <main style={{ flexGrow: 1, paddingTop: '7rem', width: '100%' }} className="px-8 sm:px-12 lg:px-16">

        {/* Buscador */}
        <div className="relative mb-12 max-w-xl mx-auto">
          <input
            type="text"
            placeholder="¿Qué se te antoja hoy?"
            className="w-full pl-10 pr-4 py-3 bg-[#1e2538] border border-white/10 rounded-full text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-all"
          />
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
        </div>

        {/* --- FILTROS (DISEÑO PRESERVADO) --- */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-12 relative z-40">
          
          {/* Filtro Facultad */}
          <div className="relative w-48">
             <select 
                className="w-full px-4 py-2 text-sm font-medium border border-yellow-600/50 text-yellow-500 bg-[#141b2d] focus:outline-none hover:bg-yellow-500 hover:text-[#0f172a] transition-all duration-200 rounded-none appearance-none cursor-pointer"
                value={filterFacultad}
                onChange={(e) => setFilterFacultad(e.target.value)}
             >
                <option value="">Todas las Facultades</option>
                {facultades.map(f => <option key={f.id_facultad} value={f.id_facultad}>{f.nombre}</option>)}
             </select>
             <FiChevronDown className="absolute right-3 top-3 text-yellow-500 pointer-events-none" />
          </div>

          {/* Filtro Comida */}
          <div className="relative w-48">
             <select 
                className="w-full px-4 py-2 text-sm font-medium border border-yellow-600/50 text-yellow-500 bg-[#141b2d] focus:outline-none hover:bg-yellow-500 hover:text-[#0f172a] transition-all duration-200 rounded-none appearance-none cursor-pointer"
                value={filterComida}
                onChange={(e) => setFilterComida(e.target.value)}
             >
                <option value="">Cualquier Comida</option>
                {categoriasOptions.map(c => <option key={c} value={c}>{c}</option>)}
             </select>
             <FiChevronDown className="absolute right-3 top-3 text-yellow-500 pointer-events-none" />
          </div>

          {/* Filtro Precio (Input Numérico) */}
          <div className="relative w-48">
             <input 
                type="number"
                placeholder="Presupuesto Máx"
                className="w-full px-4 py-2 text-sm font-medium border border-yellow-600/50 text-yellow-500 bg-[#141b2d] focus:outline-none focus:border-yellow-400 transition-all duration-200 rounded-none placeholder-yellow-700/50"
                value={filterPrecio}
                onChange={(e) => setFilterPrecio(e.target.value)}
             />
             {/* Si hay texto, mostramos una X para limpiar rápido */}
             {filterPrecio && (
                 <FiChevronDown className="absolute right-3 top-3 text-yellow-500 pointer-events-none rotate-180" /> 
             )}
          </div>
          
          {/* Botón Limpiar (Solo aparece si hay filtros activos) */}
          {(filterFacultad || filterComida || filterPrecio) && (
              <button 
                onClick={() => {setFilterFacultad(""); setFilterComida(""); setFilterPrecio("");}}
                className="text-xs text-red-400 hover:text-red-300 underline decoration-red-400/50 underline-offset-4"
              >
                Limpiar Filtros
              </button>
          )}
        </div>

        {loading ? (
             <p className="text-gray-400 text-center text-xl animate-pulse">Cargando cafeterías...</p>
        ) : (
          <>
            {/* --- SECCIÓN 1: ABIERTAS AHORA --- */}
            {abiertas.length > 0 && (
                <div className="mb-16">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="h-8 w-1 bg-yellow-500 rounded-full"></div>
                        <h2 className="text-3xl font-bold text-white tracking-tight">
                        Abiertas ahora
                        </h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 relative z-0">
                        {abiertas.map((cafeteria) => (
                            <CafeCard
                            key={cafeteria.id_tiendita}
                            name={cafeteria.nombre}
                            image={getImageSource(cafeteria)}
                            path={`/cafeterias/${cafeteria.id_tiendita}`}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* --- SECCIÓN 2: CERRADAS AHORA --- */}
            {cerradas.length > 0 && (
                <div className="mb-12 opacity-75 hover:opacity-100 transition-opacity duration-300">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="h-8 w-1 bg-red-500 rounded-full"></div>
                        <h2 className="text-3xl font-bold text-gray-300 tracking-tight">
                        Cerradas ahora
                        </h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 relative z-0">
                        {cerradas.map((cafeteria) => (
                            <div key={cafeteria.id_tiendita} className="relative filter grayscale-[30%] hover:grayscale-0 transition-all duration-300">
                                <CafeCard
                                key={cafeteria.id_tiendita}
                                name={cafeteria.nombre}
                                image={getImageSource(cafeteria)}
                                path={`/cafeterias/${cafeteria.id_tiendita}`}
                                />
                                <div className="absolute top-4 right-4 bg-red-600/90 text-white text-xs font-bold px-2 py-1 rounded shadow-lg pointer-events-none">
                                    CERRADO
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
          </>
        )}

      </main>

      <Footer />
      <ChatWidget />
    </div>
  );
};

export default Home;