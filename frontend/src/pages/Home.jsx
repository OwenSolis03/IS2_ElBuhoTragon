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
// Importamos FiChevronDown junto con los otros iconos
import { FiSearch, FiMessageSquare, FiChevronDown } from 'react-icons/fi';

const cafeterias = [
 { name: "Cafetería Derecho", image: Derecho1, path: "/cafeterias/cafeteria-derecho" },
 { name: "Cafetería Trabajo Social", image: TrabajoSocial, path: "/cafeterias/cafeteria-de-trabajo-social" },
 { name: "Cafetería Educación", image: Educacion, path: "/cafeterias/cafeteria-educacion" },
 { name: "Cafetería Historia/Sociologia", image: Historia, path: "/cafeterias/cafeteria-historia/sociologia" },
 { name: "Cafetería Medicina", image: Medicina1, path: "/cafeterias/cafetería-medicina" },
 { name: "Cafetería Medicina 2", image: Medicina2, path: "/cafeterias/cafetería-medicina-2" },
 { name: "Cafetería Civil-Minas", image: CivilMinas, path: "/cafeterias/cafeteria-departemento-de-ingenieria-industrial/civil" },
 { name: "Cafetería Ingeniería Química", image: IngenieriaQuimica, path: "/cafeterias/cafeteria-departemento-de-ingenieria-quimica" },
 { name: "Cafetería Matematicas", image: Matematicas, path: "/cafeterias/cafetería-matemáticas"},
 { name: "Cafeteria Geologia", image: Geologia, path: "/cafeterias/cafetería-geología"},
 { name: "Cafeteria Artes", image: Artes, path: "/cafeterias/cafetería-artes"},
];

const Home = () => {
  // --- Estados y useEffects (sin cambios) ---
  const [cafeteriaDestacada, setCafeteriaDestacada] = useState(cafeterias[0]);
  const [hover, setHover] = useState(false);
  const [autoplay, setAutoplay] = useState(true);

  const siguienteCafeteria = () => {
     const index = cafeterias.indexOf(cafeteriaDestacada);
     setCafeteriaDestacada(cafeterias[(index + 1) % cafeterias.length]);
     setAutoplay(false);
  };
  const anteriorCafeteria = () => {
     const index = cafeterias.indexOf(cafeteriaDestacada);
     setCafeteriaDestacada(cafeterias[(index - 1 + cafeterias.length) % cafeterias.length]);
     setAutoplay(false);
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
  useEffect(() => { /* ... */ }, []);
  // --- Fin Estados y useEffects ---

  return (
    // Div principal con estilo inline para el fondo
    <div style={{
      minHeight: "100vh",
      width: "100vw",
      margin: 0,
      padding: 0,
      display: "flex",
      flexDirection: "column",
      background: "linear-gradient(-45deg, #161b33, #1f2457, #2a3558)",
      backgroundSize: "600% 600%",
      animation: "backgroundAnimation 30s ease infinite",
      color: "white",
      overflowX: "hidden"
    }}>
      <Header />

      {/* Contenido Principal con padding general */}
      <main style={{ flexGrow: 1, paddingTop: '5rem', width: '100%' }} className="px-8 sm:px-12 lg:px-16">

        {/* Barra de Búsqueda (centrada) */}
        <div className="relative mb-6 max-w-xl mx-auto">
          <input
            type="text"
            placeholder="¿Qué se te antoja hoy?"
            className="w-full pl-10 pr-4 py-3 bg-black/30 backdrop-blur-sm border border-white/10 rounded-full text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-md"
          />
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
        </div>

        {/* --- INICIO: Sección de Filtros con Botones Blancos --- */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
          {/* Botón Facultad */}
          {/* <-- CAMBIO AQUÍ: Clases de color modificadas a blanco/gris --> */}
          <button className="flex items-center justify-between bg-white border border-gray-300 rounded-md px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition duration-150 w-40 shadow-sm">
            <span>Facultad</span>
            <FiChevronDown className="ml-2 text-gray-500" />
          </button>

          {/* Botón Categoría */}
          {/* <-- CAMBIO AQUÍ: Clases de color modificadas a blanco/gris --> */}
          <button className="flex items-center justify-between bg-white border border-gray-300 rounded-md px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition duration-150 w-40 shadow-sm">
            <span>Categoría</span>
            <FiChevronDown className="ml-2 text-gray-500" />
          </button>

          {/* Botón Abierto */}
          {/* <-- CAMBIO AQUÍ: Clases de color modificadas a blanco/gris --> */}
          <button className="flex items-center justify-between bg-white border border-gray-300 rounded-md px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition duration-150 w-40 shadow-sm">
            <span>Abierto</span>
            <FiChevronDown className="ml-2 text-gray-500" />
          </button>
        </div>
        {/* --- FIN: Sección de Filtros con Botones Blancos --- */}

        {/* Botón de Chat (centrado) */}
        <div className="flex justify-center mb-8">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6 pb-8">
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

      {/* Estilos globales */}
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