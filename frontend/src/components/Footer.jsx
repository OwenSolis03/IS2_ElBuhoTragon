// src/components/Footer.jsx
import React from "react";
import { Link } from "react-router-dom";
import UnisonLogo from "../assets/unison-logo.png";
import logo from "../assets/logo.png";

const Footer = () => {
  return (
    <footer className="w-full relative mt-auto bg-[#071326] text-neutral-300 border-t border-white/[0.08]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center pb-8 border-b border-white/[0.06]">
          
          {/* Columna 1: Marca Hungry Owl */}
          <div className="flex flex-col items-center md:items-start gap-2.5">
            <div className="flex items-center gap-2.5">
              <img src={logo} alt="Hungry Owl" className="h-8 w-8 object-contain opacity-90" />
              <span className="font-display font-semibold text-xl text-[#F2F2F0] tracking-wider uppercase">
                Hungry Owl
              </span>
            </div>
            <p className="text-sm text-neutral-300 text-center md:text-left max-w-sm leading-relaxed font-light">
              Guía gastronómica independiente y asistente inteligente para la comunidad universitaria de la UNISON.
            </p>
          </div>

          {/* Columna 2: Afiliación y Campus */}
          <div className="flex flex-col items-center justify-center gap-3">
            <img
              src={UnisonLogo}
              alt="Universidad de Sonora"
              className="h-11 w-auto object-contain opacity-85 hover:opacity-100 transition-opacity duration-300"
            />
            <span className="text-xs font-mono tracking-widest text-neutral-300 uppercase">
              Campus Hermosillo · Sonora
            </span>
          </div>

          {/* Columna 3: Enlaces Institucionales y Navegación */}
          <div className="flex flex-col items-center md:items-end gap-2.5">
            <span className="text-xs font-mono font-semibold tracking-widest uppercase text-[#B39A3A]">
              Documentación & Legal
            </span>
            <div className="flex flex-wrap gap-4 text-sm font-medium text-neutral-200">
              <Link to="/terminos" className="hover:text-white transition-colors py-1">
                Términos
              </Link>
              <span className="text-white/20 py-1" aria-hidden="true">/</span>
              <Link to="/privacidad" className="hover:text-white transition-colors py-1">
                Privacidad
              </Link>
              <span className="text-white/20 py-1" aria-hidden="true">/</span>
              <Link to="/contacto" className="hover:text-white transition-colors py-1">
                Contacto
              </Link>
            </div>
          </div>
        </div>

        {/* Barra inferior de créditos */}
        <div className="pt-6 flex flex-col sm:flex-row justify-between items-center text-xs text-neutral-300 font-mono gap-2 text-center sm:text-left">
          <span>
            Desarrollado para Ingeniería de Software II · Departamento de Matemáticas
          </span>
          <span className="text-neutral-400">
            © {new Date().getFullYear()} Hungry Owl. Comunidad Búho UNISON.
          </span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;