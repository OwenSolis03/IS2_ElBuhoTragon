// src/pages/Contacto.jsx
import React, { useState } from 'react';
import Header from "../components/Header";
import Footer from "../components/Footer";
import ChatWidget from "../components/ChatWidget";
import PageHeader from "../components/PageHeader";
import { FiMail, FiMapPin, FiGithub, FiCheck } from 'react-icons/fi';

const Contacto = () => {
  const [enviado, setEnviado] = useState(false);
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [mensaje, setMensaje] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setEnviado(true);
  };

  return (
    <div className="min-h-screen w-full bg-[#0e2246] text-[#F2F2F0] flex flex-col font-sans selection:bg-[#163A70] selection:text-white">
      <Header />

      <main className="flex-grow pt-28 pb-24 px-4 sm:px-8 lg:px-16 max-w-6xl mx-auto w-full">
        {/* Encabezado Editorial */}
        <PageHeader
          eyebrow="Universidad de Sonora · Campus Hermosillo"
          title="Contacto & Soporte"
          description="¿Detectaste alguna modificación en menús, precios desactualizados o deseas sugerir información de una cafetería? Envíanos tus observaciones."
          maxWidth="max-w-6xl"
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
          {/* Columna Izquierda: Información Académica */}
          <div className="lg:col-span-5 space-y-8">
            <div>
              <span className="font-mono text-sm uppercase tracking-widest text-[#B39A3A] block mb-2.5 flex items-center gap-2 font-semibold">
                <FiMapPin size={16} />
                <span>Ubicación Académica</span>
              </span>
              <p className="text-base text-neutral-200 font-light leading-relaxed">
                Universidad de Sonora<br />
                Departamento de Matemáticas<br />
                Licenciatura en Ciencias de la Computación<br />
                Hermosillo, Sonora, México
              </p>
            </div>

            <div>
              <span className="font-mono text-sm uppercase tracking-widest text-[#B39A3A] block mb-2.5 flex items-center gap-2 font-semibold">
                <FiMail size={16} />
                <span>Correo Institucional</span>
              </span>
              <p className="text-base font-mono text-neutral-200">
                a223201053@unison.mx
              </p>
            </div>

            <div>
              <span className="font-mono text-sm uppercase tracking-widest text-[#B39A3A] block mb-2.5 flex items-center gap-2 font-semibold">
                <FiGithub size={16} />
                <span>Repositorio del Proyecto</span>
              </span>
              <a 
                href="https://github.com/OwenSolis03/IS2_ElBuhoTragon" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-sm font-mono text-neutral-200 hover:text-white underline inline-block"
              >
                github.com/OwenSolis03/IS2_ElBuhoTragon ↗
              </a>
            </div>
          </div>

          {/* Columna Derecha: Formulario */}
          <div className="lg:col-span-7">
            <div className="p-8 sm:p-10 rounded-2xl bg-[#0a1830] border border-white/[0.1] shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)]">
              {enviado ? (
                <div className="py-12 text-center space-y-4 animate-fade-in">
                  <div className="w-14 h-14 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
                    <FiCheck size={28} />
                  </div>
                  <h3 className="font-display text-3xl sm:text-4xl text-white font-normal">
                    Mensaje Recibido
                  </h3>
                  <p className="text-neutral-200 text-base font-light max-w-sm mx-auto leading-relaxed">
                    Agradecemos tus observaciones. El equipo de desarrollo del proyecto revisará tu reporte para actualizar el catálogo.
                  </p>
                  <button
                    onClick={() => { setEnviado(false); setNombre(''); setEmail(''); setMensaje(''); }}
                    className="mt-4 px-7 py-3 rounded-full bg-white text-black text-sm font-mono uppercase tracking-wider hover:bg-neutral-200 transition-colors font-semibold cursor-pointer shadow-md"
                  >
                    Enviar otro mensaje
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label 
                      htmlFor="contacto-nombre" 
                      className="block font-mono text-xs uppercase tracking-wider text-neutral-300 mb-2 font-medium"
                    >
                      Nombre Completo
                    </label>
                    <input
                      id="contacto-nombre"
                      type="text"
                      required
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      placeholder="Tu nombre y apellido"
                      className="w-full bg-[#071326] border border-white/[0.12] focus:border-[#B39A3A] text-white text-base rounded-xl px-4 py-3.5 placeholder-neutral-400 focus:outline-none transition-colors font-sans"
                    />
                  </div>

                  <div>
                    <label 
                      htmlFor="contacto-email" 
                      className="block font-mono text-xs uppercase tracking-wider text-neutral-300 mb-2 font-medium"
                    >
                      Correo Electrónico
                    </label>
                    <input
                      id="contacto-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="correo@ejemplo.com"
                      className="w-full bg-[#071326] border border-white/[0.12] focus:border-[#B39A3A] text-white text-base rounded-xl px-4 py-3.5 placeholder-neutral-400 focus:outline-none transition-colors font-sans"
                    />
                  </div>

                  <div>
                    <label 
                      htmlFor="contacto-mensaje" 
                      className="block font-mono text-xs uppercase tracking-wider text-neutral-300 mb-2 font-medium"
                    >
                      Mensaje u Observación
                    </label>
                    <textarea
                      id="contacto-mensaje"
                      required
                      rows="4"
                      value={mensaje}
                      onChange={(e) => setMensaje(e.target.value)}
                      placeholder="Indica qué cafetería, platillo o sugerencia deseas compartir..."
                      className="w-full bg-[#071326] border border-white/[0.12] focus:border-[#B39A3A] text-white text-base rounded-xl p-4 placeholder-neutral-400 focus:outline-none transition-colors resize-none font-sans leading-relaxed"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 bg-white text-black font-sans text-sm font-mono uppercase tracking-wider rounded-full hover:bg-neutral-200 transition-colors cursor-pointer font-semibold shadow-md mt-2"
                  >
                    Enviar Mensaje
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
      <ChatWidget />
    </div>
  );
};

export default Contacto;