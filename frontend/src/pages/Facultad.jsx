// src/pages/Facultad.jsx
import React from 'react';
import Header from "../components/Header";
import Footer from "../components/Footer";
import ChatWidget from "../components/ChatWidget";
import CampusMap from '../components/CampusMap';
import PageHeader from '../components/PageHeader';
import { FiNavigation, FiInfo, FiTarget } from 'react-icons/fi'; 

const Facultad = () => {
  return (
    <div className="min-h-screen w-full bg-[#0e2246] text-[#F2F2F0] flex flex-col font-sans selection:bg-[#163A70] selection:text-white">
      <Header />

      <main className="flex-grow pt-28 pb-24 px-4 sm:px-8 lg:px-16 max-w-7xl mx-auto w-full">
        {/* Encabezado Editorial Reutilizable */}
        <PageHeader
          eyebrow="Universidad de Sonora · Campus Hermosillo"
          title="Mapa del Campus"
          description="Distribución espacial de las cafeterías del campus universitario. Explora los cuadrantes académicos y selecciona cualquier punto de interés para consultar horarios y cartas de platillos."
        />

        {/* Contenedor del Mapa Editorial */}
        <section 
          className="relative w-full rounded-2xl overflow-hidden border border-white/[0.1] bg-[#0a1830] shadow-[0_20px_40px_-15px_rgba(0,0,0,0.6)] flex flex-col"
          aria-label="Mapa interactivo de cafeterías del campus"
        >
          <div className="h-[65vh] min-h-[480px] w-full relative z-0">
            <CampusMap />
          </div>
          
          {/* Barra inferior de Guía */}
          <div className="bg-[#071326] px-6 py-6 border-t border-white/[0.08]">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-neutral-200 font-sans">
              <div className="flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-full bg-[#163A70]/60 border border-[#204a8e]/30 flex items-center justify-center flex-shrink-0">
                  <FiNavigation className="text-[#B39A3A]" size={17} />
                </div>
                <span>Navega y haz zoom interactivo sobre los cuadrantes del campus.</span>
              </div>
              <div className="flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-full bg-[#163A70]/60 border border-[#204a8e]/30 flex items-center justify-center flex-shrink-0">
                  <FiTarget className="text-[#B39A3A]" size={17} />
                </div>
                <span>Toca cualquier marcador para abrir el resumen y carta de la tiendita.</span>
              </div>
              <div className="flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-full bg-[#163A70]/60 border border-[#204a8e]/30 flex items-center justify-center flex-shrink-0">
                  <FiInfo className="text-[#B39A3A]" size={17} />
                </div>
                <span>Información sincronizada con el ciclo académico UNISON.</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
      <ChatWidget />
    </div>
  );
};

export default Facultad;