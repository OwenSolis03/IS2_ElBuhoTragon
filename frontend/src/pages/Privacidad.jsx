// src/pages/Privacidad.jsx
import React from 'react';
import Header from "../components/Header";
import Footer from "../components/Footer";
import ChatWidget from "../components/ChatWidget";
import PageHeader from "../components/PageHeader";

const Privacidad = () => {
  return (
    <div className="min-h-screen w-full bg-[#0e2246] text-[#F2F2F0] flex flex-col font-sans selection:bg-[#163A70] selection:text-white">
      <Header />

      <main className="flex-grow pt-28 pb-24 px-4 sm:px-8 lg:px-16 max-w-4xl mx-auto w-full">
        {/* Encabezado Editorial */}
        <PageHeader
          eyebrow="Protección de Datos · UNISON"
          title="Aviso de Privacidad"
          description="Transparencia y resguardo institucional en el tratamiento de credenciales y datos de consulta en Hungry Owl."
          maxWidth="max-w-4xl"
        />

        {/* Contenido Editorial */}
        <div className="space-y-12 text-neutral-200 font-light leading-relaxed text-base sm:text-lg">
          <section className="border-b border-white/[0.06] pb-8">
            <h2 className="font-display text-2xl sm:text-3xl text-white mb-3 font-normal">
              1. Privacidad Primero
            </h2>
            <p className="text-neutral-200 leading-relaxed">
              Hungry Owl no comercializa, transfiere ni comparte información de los estudiantes con entidades externas ni empresas de publicidad. La plataforma es un servicio académico sin rastreadores comerciales ni cookies de terceros.
            </p>
          </section>

          <section className="border-b border-white/[0.06] pb-8">
            <h2 className="font-display text-2xl sm:text-3xl text-white mb-3 font-normal">
              2. Datos de Cuenta y Autenticación
            </h2>
            <p className="text-neutral-200 leading-relaxed">
              Al registrarte en el sistema, almacenamos únicamente tu nombre de usuario, correo institucional (@unison.mx) y tu contraseña debidamente hasheada mediante algoritmos criptográficos seguros. Estos datos se emplean estrictamente para la autenticación y el registro de tu Pasaporte Tragón.
            </p>
          </section>

          <section className="border-b border-white/[0.06] pb-8">
            <h2 className="font-display text-2xl sm:text-3xl text-white mb-3 font-normal">
              3. Ubicación y Geolocalización en Campus
            </h2>
            <p className="text-neutral-200 leading-relaxed">
              La funcionalidad de mapas y el asistente inteligente pueden solicitar tu ubicación GPS para estimar distancias y tiempos de caminata hacia la cafetería más cercana. Estas coordenadas se procesan de forma efímera en la petición y no se almacenan de manera persistente en bases de datos.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl sm:text-3xl text-white mb-3 font-normal">
              4. Contacto Institucional
            </h2>
            <p className="text-neutral-200 leading-relaxed">
              Para cualquier consulta relacionada con el tratamiento de tus datos o con la administración de tu cuenta, puedes comunicarte con el equipo de desarrollo a través de los canales del Departamento de Matemáticas de la Universidad de Sonora.
            </p>
          </section>
        </div>
      </main>

      <Footer />
      <ChatWidget />
    </div>
  );
};

export default Privacidad;