import React from 'react';
import Header from "../components/Header";
import Footer from "../components/Footer";
import CampusMap from '../components/CampusMap';
import { FiNavigation, FiInfo, FiTarget } from 'react-icons/fi'; 
// Nota: Eliminé la importación de FaMapMarkedAlt ya que no se usa

const Facultades = () => {
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
        
        {/* Encabezado de la Página (MODIFICADO) */}
        <div className="text-center mb-10 max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold text-white mb-4">
            Mapa del Campus
          </h1>
          <p className="text-lg text-gray-300">
            Ubica tu próxima parada. Explora las cafeterías disponibles en la Unidad Regional Centro.
          </p>
        </div>

        {/* Contenedor del Mapa */}
        <section className="relative z-0 w-full rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-black/20 backdrop-blur-sm">
          <div className="h-[60vh] w-full">
            <CampusMap />
          </div>
          
          <div className="bg-black/40 backdrop-blur-md p-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm border-t border-white/5">
            <div className="flex items-center justify-center gap-2 text-gray-300">
              <FiNavigation className="text-orange-400 text-xl" />
              <span>Usa <strong>dos dedos</strong> para hacer zoom</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-gray-300">
              <FiTarget className="text-yellow-400 text-xl" />
              <span>Toca un <strong>marcador</strong> para ver detalles</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-gray-300">
              <FiInfo className="text-blue-400 text-xl" />
              <span>Datos actualizados al <strong>Semestre 2025-1</strong></span>
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