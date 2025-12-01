// src/pages/Home.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import CafeCard from "../components/CafeCard";
import Header from "../components/Header";
import Footer from "../components/Footer";
import ChatWidget from "../components/ChatWidget";
import { FiSearch, FiChevronDown, FiFilter, FiX } from 'react-icons/fi';

// --- ASSETS ---
import BuhoChef from "../assets/chef.png";
import BuhoZZZ from "../assets/zzz.png";
import BuhoCartel from "../assets/cartel.png";
import LogoDefault from "../assets/logo.png";

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

const Home = () => {
  const [cafeterias, setCafeterias] = useState([]);
  const [allMenus, setAllMenus] = useState([]);
  const [filteredCafeterias, setFilteredCafeterias] = useState([]);
  const [facultades, setFacultades] = useState([]);

  const [loading, setLoading] = useState(true);
  const [cafeteriaDestacada, setCafeteriaDestacada] = useState(null);
  const [autoplay, setAutoplay] = useState(true);

  // --- FILTROS ---
  const [filterFacultad, setFilterFacultad] = useState("");
  const [filterComida, setFilterComida] = useState("");
  const [filterPrecio, setFilterPrecio] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const categoriasOptions = [
      "Desayuno", "Almuerzo", "Comida", "Comida Corrida", 
      "Vegana / Vegetariana", "Fit / Saludable", "Bebidas", "Postres", "Snacks"
  ];

  const imagenesOriginales = {
    1: Derecho1, 2: TrabajoSocial, 3: Educacion, 4: Derecho2,
    5: Historia, 6: IngenieriaQuimica, 7: CivilMinas, 8: Medicina1,
    9: Matematicas, 10: Artes, 11: Geologia, 13: Medicina2
  };

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
        setFilteredCafeterias(dataCafes);
        if (dataCafes.length > 0) setCafeteriaDestacada(dataCafes[0]);
        setLoading(false);
      } catch (e) { console.error(e); }
    };
    loadData();
  }, []);

  useEffect(() => {
    let result = cafeterias;

    if (filterFacultad) {
        result = result.filter(c => c.id_facultad === parseInt(filterFacultad));
    }

    if (filterComida) {
        const tiendasConComida = allMenus
            .filter(m => m.categoria === filterComida)
            .map(m => m.id_tiendita);
        result = result.filter(c => tiendasConComida.includes(c.id_tiendita));
    }

    if (filterPrecio) {
        const maxPrecio = parseFloat(filterPrecio);
        const tiendasEnPresupuesto = allMenus
            .filter(m => parseFloat(m.precio) <= maxPrecio)
            .map(m => m.id_tiendita);
        result = result.filter(c => tiendasEnPresupuesto.includes(c.id_tiendita));
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(c => {
        const matchNombre = c.nombre.toLowerCase().includes(term);
        const matchMenu = allMenus.some(m => 
          m.id_tiendita === c.id_tiendita && m.nombre.toLowerCase().includes(term)
        );
        return matchNombre || matchMenu;
      });
    }

    setFilteredCafeterias(result);
  }, [filterFacultad, filterComida, filterPrecio, searchTerm, cafeterias, allMenus]);

  const getHorarioStatus = (list) => {
    const ahora = new Date();
    const minutosActuales = ahora.getHours() * 60 + ahora.getMinutes();
    const abiertas = [];
    const cerradas = [];

    list.forEach(cafe => {
      if (!cafe.hora_apertura || !cafe.hora_cierre) {
        cerradas.push(cafe);
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

      <main style={{ flexGrow: 1, paddingTop: '7rem', width: '100%' }} className="px-4 sm:px-8 lg:px-16 pb-16">

        {/* --- BUSCADOR --- */}
        <div className="relative mb-10 max-w-2xl mx-auto">
             <input
                type="text"
                placeholder="¿Qué se te antoja hoy? (ej. Boneless, Pizza...)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-[#1e2538] border border-white/10 rounded-full text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-yellow-500 shadow-xl transition-all"
             />
             <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-yellow-500" size={24} />
        </div>

        {/* --- FILTROS (DISEÑO CÁPSULA UNA FILA - SIN BARRA NEÓN) --- */}
        <div className="flex justify-center w-full mb-16">
            <div className="relative bg-[#1e2538] p-4 rounded-2xl border border-white/10 shadow-2xl inline-block max-w-full overflow-x-auto">
                
                <div className="flex flex-nowrap items-center justify-center gap-3 min-w-max">
                    
                    <div className="flex items-center gap-2 text-cyan-400 font-bold mr-2 hidden md:flex">
                        <FiFilter /> <span className="uppercase tracking-wider text-xs">Filtros</span>
                    </div>

                    <div className="h-6 w-px bg-white/10 hidden md:block"></div>

                    {/* SELECT: FACULTAD */}
                    <div className="relative group">
                        <select 
                            className="px-3 py-2 pr-8 text-sm font-medium bg-[#141b2d] border border-white/20 rounded-lg text-gray-200 focus:outline-none focus:border-cyan-500 hover:bg-[#1a2236] cursor-pointer appearance-none min-w-[160px] transition-all"
                            value={filterFacultad}
                            onChange={(e) => setFilterFacultad(e.target.value)}
                        >
                            <option value="">Todas las Facultades</option>
                            {facultades.map(f => <option key={f.id_facultad} value={f.id_facultad}>{f.nombre}</option>)}
                        </select>
                        <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none group-hover:text-cyan-400 transition-colors" size={14} />
                    </div>

                    <div className="h-6 w-px bg-white/10 hidden md:block"></div>

                    {/* SELECT: COMIDA */}
                    <div className="relative group">
                        <select 
                            className="px-3 py-2 pr-8 text-sm font-medium bg-[#141b2d] border border-white/20 rounded-lg text-gray-200 focus:outline-none focus:border-cyan-500 hover:bg-[#1a2236] cursor-pointer appearance-none min-w-[150px] transition-all"
                            value={filterComida}
                            onChange={(e) => setFilterComida(e.target.value)}
                        >
                            <option value="">Cualquier Comida</option>
                            {categoriasOptions.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none group-hover:text-cyan-400 transition-colors" size={14} />
                    </div>

                    <div className="h-6 w-px bg-white/10 hidden md:block"></div>

                    {/* INPUT: PRECIO */}
                    <div className="relative group">
                        <input 
                            type="number"
                            placeholder="Presupuesto"
                            className="px-3 py-2 w-28 text-sm font-medium bg-[#141b2d] border border-white/20 rounded-lg text-gray-200 focus:outline-none focus:border-cyan-500 hover:bg-[#1a2236] transition-all placeholder-gray-500"
                            value={filterPrecio}
                            onChange={(e) => setFilterPrecio(e.target.value)}
                        />
                    </div>
                    
                    {/* BOTÓN LIMPIAR */}
                    {(filterFacultad || filterComida || filterPrecio || searchTerm) && (
                        <>
                            <div className="h-6 w-px bg-white/10 hidden md:block"></div>
                            <button 
                                onClick={() => {
                                setFilterFacultad(""); 
                                setFilterComida(""); 
                                setFilterPrecio("");
                                setSearchTerm("");
                                }}
                                className="ml-1 p-2 text-red-400 hover:text-white hover:bg-red-500 rounded-lg transition-all border border-red-500/30"
                                title="Limpiar filtros"
                            >
                                <FiX size={16} />
                            </button>
                        </>
                    )}
                </div>
                {/* NOTA: SE ELIMINÓ LA BARRA NEÓN DE AQUÍ */}
            </div>
        </div>

        {/* --- ESTADO DE CARGA O SIN RESULTADOS --- */}
        {loading ? (
             <div className="flex flex-col items-center justify-center py-20 animate-pulse">
                <img src={BuhoZZZ} className="w-32 h-32 mb-4 opacity-50 drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]" alt="Cargando"/>
                <p className="text-gray-400 text-xl">Despertando al búho...</p>
             </div>
        ) : (
          <>
            {/* CASO: 0 RESULTADOS */}
            {abiertas.length === 0 && cerradas.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 animate-float">
                    <div className="relative w-64 h-64 md:w-80 md:h-80">
                        <img 
                            src={BuhoCartel} 
                            alt="No encontrado" 
                            className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(0,0,0,0.5)]"
                        />
                        <div className="absolute top-[55%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[60%] text-center rotate-1">
                            <p className="text-[#3e2723] font-bold text-lg leading-tight font-serif mb-1">
                                ¿"{searchTerm}"?
                            </p>
                            <p className="text-[#5d4037] text-sm font-medium font-serif">
                                No encontré nada parecido hoy.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* --- SECCIÓN 1: ABIERTAS AHORA (BARRA VERDE NEÓN) --- */}
            {abiertas.length > 0 && (
                <div className="mb-16">
                    <div className="relative flex items-center gap-6 mb-8 bg-[#1e2538]/40 backdrop-blur-md p-6 rounded-3xl border border-white/5 group overflow-hidden">
                        
                        <div className="relative transition-transform duration-300 transform group-hover:scale-110">
                            <img 
                                src={BuhoChef} 
                                alt="Chef Búho" 
                                className="relative h-24 w-24 object-contain -rotate-6 drop-shadow-[0_0_15px_rgba(234,179,8,0.4)]"
                            />
                        </div>
                        
                        <div>
                            <div className="flex items-center gap-3">
                                <span className="h-3 w-3 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_#22c55e]"></span>
                                <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
                                    Abiertas ahora
                                </h2>
                            </div>
                        </div>

                        {/* --- BARRA VERDE NEÓN AQUÍ --- */}
                        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1/3 h-1.5 bg-green-500 shadow-[0_0_20px_rgba(34,197,94,0.8)] rounded-t-full"></div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 relative z-0">
                        {abiertas.map((cafeteria) => (
                            <CafeCard
                              key={cafeteria.id_tiendita}
                              name={cafeteria.nombre}
                              image={getImageSource(cafeteria)}
                              path={`/cafeterias/${cafeteria.id_tiendita}`}
                              searchTerm={searchTerm}
                              cafeteriaMenus={allMenus.filter(m => m.id_tiendita === cafeteria.id_tiendita)}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* --- SECCIÓN 2: CERRADAS AHORA (BARRA ROJA NEÓN) --- */}
            {cerradas.length > 0 && (
                <div className="mb-12 opacity-80 hover:opacity-100 transition-opacity duration-500">
                    <div className="relative flex items-center gap-6 mb-8 bg-[#1e2538]/40 backdrop-blur-md p-6 rounded-3xl border border-white/5 group overflow-hidden">
                        
                        <div className="relative transition-transform duration-300 transform group-hover:scale-110">
                            <img 
                                src={BuhoZZZ} 
                                alt="Búho Durmiendo" 
                                className="h-20 w-20 object-contain rotate-3 grayscale-[20%] drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]" 
                            />
                        </div>
                        
                        <div>
                            <div className="flex items-center gap-3">
                                <span className="h-3 w-3 bg-red-500 rounded-full"></span>
                                <h2 className="text-3xl font-bold text-gray-300 tracking-tight">
                                    Cerradas ahora
                                </h2>
                            </div>
                        </div>

                        {/* --- BARRA ROJA NEÓN AQUÍ --- */}
                        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1/3 h-1.5 bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.8)] rounded-t-full"></div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 relative z-0">
                        {cerradas.map((cafeteria) => (
                            <div key={cafeteria.id_tiendita} className="relative filter grayscale-[40%] hover:grayscale-0 transition-all duration-300 group">
                                <CafeCard
                                  key={cafeteria.id_tiendita}
                                  name={cafeteria.nombre}
                                  image={getImageSource(cafeteria)}
                                  path={`/cafeterias/${cafeteria.id_tiendita}`}
                                  searchTerm={searchTerm}
                                  cafeteriaMenus={allMenus.filter(m => m.id_tiendita === cafeteria.id_tiendita)}
                                />
                                <div className="absolute top-4 right-4 bg-red-900/90 text-red-200 text-xs font-bold px-3 py-1 rounded-full shadow-lg pointer-events-none border border-red-500/30">
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
      
      <style jsx>{`
        @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
        }
        .animate-float {
            animation: float 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default Home;