// src/pages/Home.jsx
import React, { useEffect, useState } from "react";
import CafeCard from "../components/CafeCard";
import Header from "../components/Header";
import Footer from "../components/Footer";
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
import { FiSearch, FiMessageSquare, FiChevronDown, FiX } from 'react-icons/fi';

// --- DATOS DE PRUEBA (MOCKUP) ---
const cafeterias = [
  { name: "Cafetería Derecho", image: Derecho1, path: "/cafeterias/cafeteria-derecho", tags: ["Desayunos", "Comida"], price: "$" },
  { name: "Cafetería Trabajo Social", image: TrabajoSocial, path: "/cafeterias/cafeteria-de-trabajo-social", tags: ["Snacks", "Postres"], price: "$$" },
  { name: "Cafetería Educación", image: Educacion, path: "/cafeterias/cafeteria-educacion", tags: ["Comida Corrida"], price: "$" },
  { name: "Cafetería Historia/Sociologia", image: Historia, path: "/cafeterias/cafeteria-historia/sociologia", tags: ["Variado"], price: "$$" },
  { name: "Cafetería Medicina", image: Medicina1, path: "/cafeterias/cafetería-medicina", tags: ["Saludable"], price: "$$$" },
  { name: "Cafetería Medicina 2", image: Medicina2, path: "/cafeterias/cafetería-medicina-2", tags: ["Café", "Paninis"], price: "$$" },
  { name: "Cafetería Civil-Minas", image: CivilMinas, path: "/cafeterias/cafeteria-departemento-de-ingenieria-industrial/civil", tags: ["Burritos"], price: "$" },
  { name: "Cafetería Ingeniería Química", image: IngenieriaQuimica, path: "/cafeterias/cafeteria-departemento-de-ingenieria-quimica", tags: ["Tortas"], price: "$" },
  { name: "Cafetería Matematicas", image: Matematicas, path: "/cafeterias/cafetería-matemáticas", tags: ["Snacks"], price: "$"},
  { name: "Cafeteria Geologia", image: Geologia, path: "/cafeterias/cafetería-geología", tags: ["Café"], price: "$$"},
  { name: "Cafeteria Artes", image: Artes, path: "/cafeterias/cafetería-artes", tags: ["Vegetariano"], price: "$$$"},
];

// Opciones para los filtros
const filterOptions = {
  facultad: ["Ingeniería", "Sociales", "Medicina", "Humanidades", "Económicas"],
  comida: ["Desayunos", "Comida Corrida", "Snacks", "Café", "Saludable"],
  precio: ["$ (Económico)", "$$ (Medio)", "$$$ (Premium)"]
};

// --- COMPONENTE REUTILIZABLE PARA EL DROPDOWN ---
const FilterDropdown = ({ label, options, active, onToggle, selectedValue, onSelect }) => {
  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className={`
          flex items-center justify-between border w-48 px-4 py-2 text-sm transition duration-150 shadow-sm
          ${active || selectedValue ? '!bg-gray-100 border-gray-400' : '!bg-white border-gray-300'}
          !text-gray-700 !rounded-none hover:!bg-gray-50
        `}
      >
        <span className="truncate">{selectedValue || label}</span>
        {selectedValue ? (
          <FiX 
            className="ml-2 text-gray-500 hover:text-red-500 z-10" 
            onClick={(e) => { e.stopPropagation(); onSelect(null); }} 
          />
        ) : (
          <FiChevronDown className={`ml-2 text-gray-500 transition-transform duration-200 ${active ? 'rotate-180' : ''}`} />
        )}
      </button>

      {/* Menú Desplegable */}
      {active && (
        <div className="absolute top-full left-0 w-full bg-white border border-gray-200 shadow-lg z-50 max-h-60 overflow-y-auto">
          {options.map((option, index) => (
            <div
              key={index}
              onClick={() => onSelect(option)}
              className="px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-none"
            >
              {option}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const Home = () => {
  const [cafeteriaDestacada, setCafeteriaDestacada] = useState(cafeterias[0]);
  const [autoplay, setAutoplay] = useState(true);
  
  // Estados para los filtros
  const [activeDropdown, setActiveDropdown] = useState(null); // Cuál menú está abierto
  const [selectedFilters, setSelectedFilters] = useState({
    facultad: null,
    comida: null,
    precio: null
  });

  // Manejar la selección de un filtro
  const handleSelectFilter = (category, value) => {
    setSelectedFilters(prev => ({ ...prev, [category]: value }));
    setActiveDropdown(null); // Cerrar menú al seleccionar
  };

  // Alternar visibilidad del menú
  const toggleDropdown = (dropdownName) => {
    setActiveDropdown(activeDropdown === dropdownName ? null : dropdownName);
  };

  // Carrusel (Lógica existente)
  useEffect(() => {
    let intervalo;
    if (autoplay) {
      intervalo = setInterval(() => {
        const index = cafeterias.indexOf(cafeteriaDestacada);
        setCafeteriaDestacada(cafeterias[(index + 1) % cafeterias.length]);
      }, 5000);
    }
    return () => clearInterval(intervalo);
  }, [cafeteriaDestacada, autoplay]);

  return (
    <div style={{
      minHeight: "100vh",
      width: "100vw",
      margin: 0,
      padding: 0,
      display: "flex",
      flexDirection: "column",
      background: "linear-gradient(135deg, #0f172a, #1e293b, #334155)",
      backgroundSize: "600% 600%",
      animation: "backgroundAnimation 30s ease infinite",
      color: "white",
      overflowX: "hidden"
    }}>
      <Header />

      <main style={{ flexGrow: 1, paddingTop: '5rem', width: '100%' }} className="px-8 sm:px-12 lg:px-16">

        {/* Barra de Búsqueda */}
        <div className="relative mb-6 max-w-xl mx-auto">
          <input
            type="text"
            placeholder="¿Qué se te antoja hoy?"
            className="w-full pl-10 pr-4 py-3 bg-black/30 backdrop-blur-sm border border-white/10 rounded-full text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-md"
          />
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
        </div>

        {/* --- Sección de Filtros Avanzados (UI IMPLEMENTADA) --- */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-8 relative z-40">
          
          {/* Filtro: Facultad */}
          <FilterDropdown 
            label="Facultad" 
            options={filterOptions.facultad} 
            active={activeDropdown === 'facultad'}
            onToggle={() => toggleDropdown('facultad')}
            selectedValue={selectedFilters.facultad}
            onSelect={(val) => handleSelectFilter('facultad', val)}
          />

          {/* Filtro: Tipo de Comida */}
          <FilterDropdown 
            label="Tipo de Comida" 
            options={filterOptions.comida} 
            active={activeDropdown === 'comida'}
            onToggle={() => toggleDropdown('comida')}
            selectedValue={selectedFilters.comida}
            onSelect={(val) => handleSelectFilter('comida', val)}
          />

          {/* Filtro: Precio */}
          <FilterDropdown 
            label="Precio" 
            options={filterOptions.precio} 
            active={activeDropdown === 'precio'}
            onToggle={() => toggleDropdown('precio')}
            selectedValue={selectedFilters.precio}
            onSelect={(val) => handleSelectFilter('precio', val)}
          />
          
        </div>

        {/* Botón de Chat */}
        <div className="flex justify-center mb-8 relative z-0">
          <button className="flex items-center gap-2 px-6 py-3 bg-blue-600/70 hover:bg-blue-700/80 backdrop-blur-sm border border-blue-500/50 rounded-full text-white font-semibold transition duration-200 shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-400">
            <FiMessageSquare size={18} />
            Chatea con buhito
          </button>
        </div>

        {/* Título de Sección */}
        <h2 className="text-2xl font-semibold mb-6 text-gray-200">
          Abiertas ahora
        </h2>

        {/* Grid de Cafeterías */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-8 relative z-0">
          {/* Aquí podrías filtrar 'cafeterias' usando 'selectedFilters' */}
          {cafeterias.map((cafeteria, index) => (
            <CafeCard
              key={index}
              name={cafeteria.name}
              image={cafeteria.image}
              path={cafeteria.path}
            />
          ))}
        </div>

      </main>

      <Footer />

      <style jsx global>{`
        @keyframes backgroundAnimation {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </div>
  );
};

export default Home;