// src/pages/Terminos.jsx
import React from 'react';
import Header from "../components/Header";
import Footer from "../components/Footer";
import ChatWidget from "../components/ChatWidget";
import PageHeader from "../components/PageHeader";

const Terminos = () => {
  return (
    <div className="min-h-screen w-full bg-[#0e2246] text-[#F2F2F0] flex flex-col font-sans selection:bg-[#163A70] selection:text-white">
      <Header />

      <main className="flex-grow pt-28 pb-24 px-4 sm:px-8 lg:px-16 max-w-4xl mx-auto w-full">
        {/* Encabezado Editorial */}
        <PageHeader
          eyebrow="Marco Normativo y Académico"
          title="Términos y Condiciones"
          description="Lineamientos oficiales para la consulta, registro y participación comunitaria en la plataforma Hungry Owl."
          maxWidth="max-w-4xl"
        />

        {/* Contenido Editorial */}
        <div className="space-y-12 text-neutral-200 font-light leading-relaxed text-base sm:text-lg">
          <section className="border-b border-white/[0.06] pb-8">
            <h2 className="font-display text-2xl sm:text-3xl text-white mb-3 font-normal">
              1. Naturaleza del Proyecto
            </h2>
            <p className="text-neutral-200 leading-relaxed">
              Hungry Owl es un proyecto académico de software desarrollado para la comunidad de la Universidad de Sonora. Su propósito es brindar orientación gastronómica, localización geográfica de cafeterías y visualización de cartas de platillos dentro del campus Hermosillo.
            </p>
          </section>

          <section className="border-b border-white/[0.06] pb-8">
            <h2 className="font-display text-2xl sm:text-3xl text-white mb-3 font-normal">
              2. Exactitud de la Información
            </h2>
            <p className="text-neutral-200 leading-relaxed">
              Los precios, menús, platillos y horarios registrados son recopilados directamente en los establecimientos físicos del campus. Si bien el sistema se actualiza de forma continua, los concesionarios pueden modificar precios o disponibilidad sin previo aviso.
            </p>
          </section>

          <section className="border-b border-white/[0.06] pb-8">
            <h2 className="font-display text-2xl sm:text-3xl text-white mb-3 font-normal">
              3. Participación y Reseñas Comunitarias
            </h2>
            <p className="text-neutral-200 leading-relaxed">
              Las opiniones y valoraciones emitidas por los estudiantes deben apegarse al respeto mutuo y a la convivencia universitaria. Hungry Owl se reserva el derecho de moderar contenidos ofensivos, publicitarios o ajenos al objetivo del servicio gastronómico.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl sm:text-3xl text-white mb-3 font-normal">
              4. Propiedad Intelectual e Identidad
            </h2>
            <p className="text-neutral-200 leading-relaxed">
              Los logotipos e insignias institucionales son utilizados con fines de identificación académica universitaria. El código y diseño de la plataforma corresponden a los desarrolladores del proyecto en el Departamento de Matemáticas de la Universidad de Sonora.
            </p>
          </section>
        </div>
      </main>

      <Footer />
      <ChatWidget />
    </div>
  );
};

export default Terminos;