// src/pages/Home.jsx
import React, { useEffect, useState } from "react";
import CafeCard from "../components/CafeCard";
import Header from "../components/Header";
import Footer from "../components/Footer";
import ChatWidget from "../components/ChatWidget"; // <--- IMPORTAR EL CHAT

// Imágenes
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
import { FiSearch, FiChevronDown, FiX } from 'react-icons/fi'; // Quitamos FiMessageSquare que ya no se usa aquí

// --- DATOS DE PRUEBA ---
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

const filterOptions = {
  facultad: ["Ingeniería", "Sociales", "Medicina", "Humanidades", "Económicas"],
  comida: ["Desayunos", "Comida Corrida", "Snacks", "Café", "Saludable"],
  precio: ["$ (Económico)", "$$ (Medio)", "$$$ (Premium)"]
};

// --- COMPONENTE DROPDOWN ---
const FilterDropdown = ({ label, options, active, onToggle, selectedValue, onSelect }) => {
  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className={`
          flex items-center justify-between w-48 px-4 py-2 text-sm font-medium transition-all duration-200
          border rounded-none shadow-sm
          ${active || selectedValue 
            ? 'bg-yellow-500 text-[#0f172a] border-yellow-500' 
            : 'bg-transparent text-yellow-500 border-yellow-600/50 hover:bg-yellow-500 hover:text-[#0f172a]'
          }
        `}
      >
        <span className="truncate">{selectedValue || label}</span>
        {selectedValue ? (
          <FiX 
            className="ml-2 hover:text-red-600 z-10" 
            onClick={(e) => { e.stopPropagation(); onSelect(null); }} 
          />
        ) : (
          <FiChevronDown className={`ml-2 transition-transform duration-200 ${active ? 'rotate-180' : ''}`} />
        )}
      </button>

      {active && (
        <div className="absolute top-full left-0 w-full bg-[#1e293b] border border-white/10 shadow-xl z-50 max-h-60 overflow-y-auto mt-1">
          {options.map((option, index) => (
            <div
              key={index}
              onClick={() => onSelect(option)}
              className="px-4 py-2 text-sm text-gray-300 hover:bg-yellow-500 hover:text-[#0f172a] cursor-pointer border-b border-white/5 last:border-none transition-colors"
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
  
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [selectedFilters, setSelectedFilters] = useState({
    facultad: null,
    comida: null,
    precio: null
  });

  const handleSelectFilter = (category, value) => {
    setSelectedFilters(prev => ({ ...prev, [category]: value }));
    setActiveDropdown(null);
  };

  const toggleDropdown = (dropdownName) => {
    setActiveDropdown(activeDropdown === dropdownName ? null : dropdownName);
  };

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
      backgroundColor: "#141b2d", 
      color: "#e4e4e7",
      overflowX: "hidden"
    }}>
      <Header />

      <main style={{ flexGrow: 1, paddingTop: '7rem', width: '100%' }} className="px-8 sm:px-12 lg:px-16">

        {/* Barra de Búsqueda */}
        <div className="relative mb-8 max-w-xl mx-auto">
          <input
            type="text"
            placeholder="¿Qué se te antoja hoy?"
            className="w-full pl-10 pr-4 py-3 bg-[#1e293b]/80 border border-white/10 rounded-full text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent shadow-lg transition-all"
          />
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-10 relative z-40">
          <FilterDropdown 
            label="Facultad" 
            options={filterOptions.facultad} 
            active={activeDropdown === 'facultad'}
            onToggle={() => toggleDropdown('facultad')}
            selectedValue={selectedFilters.facultad}
            onSelect={(val) => handleSelectFilter('facultad', val)}
          />
          <FilterDropdown 
            label="Tipo de Comida" 
            options={filterOptions.comida} 
            active={activeDropdown === 'comida'}
            onToggle={() => toggleDropdown('comida')}
            selectedValue={selectedFilters.comida}
            onSelect={(val) => handleSelectFilter('comida', val)}
          />
          <FilterDropdown 
            label="Precio" 
            options={filterOptions.precio} 
            active={activeDropdown === 'precio'}
            onToggle={() => toggleDropdown('precio')}
            selectedValue={selectedFilters.precio}
            onSelect={(val) => handleSelectFilter('precio', val)}
          />
        </div>

        {/* --- BOTÓN DE CHAT ANTIGUO ELIMINADO --- */}

        {/* Título con acento */}
        <div className="flex items-center gap-3 mb-8">
            <div className="h-8 w-1 bg-yellow-500 rounded-full"></div>
            <h2 className="text-3xl font-bold text-white tracking-tight">
              Abiertas ahora
            </h2>
        </div>

        {/* Grid de Cafeterías */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 pb-12 relative z-0">
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

      {/* AGREGAMOS EL CHAT WIDGET FLOTANTE */}
      <ChatWidget />
      
    </div>
  );
};

export default Home;