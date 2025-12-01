// src/pages/Facultad.jsx
import React from 'react';
import Header from "../components/Header";
import Footer from "../components/Footer";
import CampusMap from '../components/CampusMap';
import { FiNavigation, FiInfo, FiTarget } from 'react-icons/fi'; 

const Facultades = () => {
  return (
    // 1. MANTENEMOS TU ESTRUCTURA DE FONDO EXACTA (Para no romper layout)
    <div style={{
      minHeight: "100vh",
      width: "100vw",
      margin: 0,
      padding: 0,
      display: "flex",
      flexDirection: "column",
      backgroundColor: "#141b2d",
      backgroundSize: "600% 600%",
      animation: "backgroundAnimation 30s ease infinite",
      color: "white",
      overflowX: "hidden"
    }}>
      
      <Header />

      <main style={{ flexGrow: 1, width: '100%' }} className="pt-28 pb-12 px-4 md:px-8 lg:px-16">
        
        {/* Encabezado de la Página */}
        <div className="text-center mb-10 max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4 tracking-tight drop-shadow-lg">
            Mapa del Campus
          </h1>
          <p className="text-lg text-gray-400 font-medium">
            Ubica tu próxima parada. Explora todas las cafeterías universitarias en un solo lugar.
          </p>
        </div>

        {/* --- TARJETA PRINCIPAL DEL MAPA (Estilo Glassmorphism) --- */}
        <section className="relative w-full max-w-6xl mx-auto rounded-3xl overflow-hidden shadow-2xl border border-white/10 bg-[#1e2538]/60 backdrop-blur-lg flex flex-col">
          
          {/* Contenedor del Mapa */}
          <div className="h-[60vh] w-full relative z-0">
            <CampusMap />
            
            {/* Overlay decorativo en la parte superior para integrar el mapa con el borde */}
            <div className="absolute top-0 left-0 w-full h-8 bg-gradient-to-b from-black/20 to-transparent pointer-events-none z-[400]"></div>
          </div>
          
          {/* Panel de Instrucciones (Estilo Consola) */}
          <div className="bg-[#0b101b] p-6 border-t border-white/5">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
               
                {/* Item 1 */}
                <div className="flex flex-col items-center justify-center text-center gap-2 group">
                   <div className="p-3 rounded-full bg-[#1e2538] border border-white/5 group-hover:border-yellow-500/30 transition-colors">
                      <FiNavigation className="text-yellow-500 text-xl" />
                   </div>
                   <p className="text-gray-300">
                      Usa <span className="font-bold text-white">dos dedos</span> para navegar y hacer zoom.
                   </p>
                </div>

                {/* Item 2 */}
                <div className="flex flex-col items-center justify-center text-center gap-2 group border-t md:border-t-0 md:border-l border-white/5 pt-4 md:pt-0">
                   <div className="p-3 rounded-full bg-[#1e2538] border border-white/5 group-hover:border-yellow-500/30 transition-colors">
                      <FiTarget className="text-yellow-500 text-xl" />
                   </div>
                   <p className="text-gray-300">
                      Toca un <span className="font-bold text-white">marcador</span> para ver el menú.
                   </p>
                </div>

                {/* Item 3 */}
                <div className="flex flex-col items-center justify-center text-center gap-2 group border-t md:border-t-0 md:border-l border-white/5 pt-4 md:pt-0">
                   <div className="p-3 rounded-full bg-[#1e2538] border border-white/5 group-hover:border-yellow-500/30 transition-colors">
                      <FiInfo className="text-yellow-500 text-xl" />
                   </div>
                   <p className="text-gray-300">
                      Datos actualizados al <span className="font-bold text-white">Semestre 2025-1</span>.
                   </p>
                </div>

             </div>
          </div>
        </section>

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

export default Facultades;