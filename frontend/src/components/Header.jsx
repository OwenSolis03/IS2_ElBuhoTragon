// src/components/Header.jsx
import React, { useState } from "react";
import { Link } from "react-router-dom";
import logo from "../assets/logo.png";
import { FiMenu, FiX } from "react-icons/fi"; // Importamos iconos para el menú móvil

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  // Estilos base para los botones de navegación
  const navLinkClass = "text-white font-semibold hover:text-yellow-400 transition-colors duration-200";
  const authButtonClass = "px-4 py-2 rounded-md font-bold transition-all duration-200";

  return (
    <header className="fixed top-0 w-full z-50 bg-[#161b33]/90 backdrop-blur-md shadow-lg border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* --- SECCIÓN IZQUIERDA (Escritorio) --- */}
          <div className="hidden md:flex items-center space-x-6">
            <Link to="/cafeterias" className={navLinkClass}>Cafeterías</Link>
            <Link to="/facultad" className={navLinkClass}>Facultad</Link>
          </div>

          {/* --- SECCIÓN CENTRAL (Logo) --- */}
          {/* En móvil el logo se va a la izquierda para dejar espacio al menú a la derecha */}
          <div className="flex-shrink-0 flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2">
              <img src={logo} alt="El Búho Tragón" className="h-10 w-10" />
              <span className="font-bold text-xl text-white tracking-wide">
                El Búho Tragón
              </span>
            </Link>
          </div>

          {/* --- SECCIÓN DERECHA (Escritorio) --- */}
          <div className="hidden md:flex items-center space-x-4">
            <Link to="/login">
              <button className={`${authButtonClass} text-white hover:bg-white/10`}>
                Login
              </button>
            </Link>
            <Link to="/registro">
              <button className={`${authButtonClass} bg-yellow-500 text-gray-900 hover:bg-yellow-400`}>
                Registro
              </button>
            </Link>
          </div>

          {/* --- BOTÓN MENÚ MÓVIL (Solo visible en celulares) --- */}
          <div className="md:hidden flex items-center">
            <button
              onClick={toggleMenu}
              className="text-white hover:text-yellow-400 focus:outline-none p-2"
            >
              {isMenuOpen ? <FiX size={28} /> : <FiMenu size={28} />}
            </button>
          </div>
        </div>
      </div>

      {/* --- MENÚ DESPLEGABLE MÓVIL --- */}
      {isMenuOpen && (
        <div className="md:hidden bg-[#1f2457] border-t border-white/10 absolute w-full">
          <div className="px-4 pt-2 pb-6 space-y-2 flex flex-col text-center shadow-2xl">
            <Link 
              to="/cafeterias" 
              className="block px-3 py-3 rounded-md text-base font-medium text-white hover:bg-white/10"
              onClick={() => setIsMenuOpen(false)}
            >
              Cafeterías
            </Link>
            <Link 
              to="/facultad" 
              className="block px-3 py-3 rounded-md text-base font-medium text-white hover:bg-white/10"
              onClick={() => setIsMenuOpen(false)}
            >
              Facultad
            </Link>
            
            <div className="border-t border-white/10 my-2 pt-2 flex flex-col gap-3 px-3">
              <Link to="/login" onClick={() => setIsMenuOpen(false)}>
                <button className="w-full py-2 rounded-md text-white border border-white/20 hover:bg-white/10 font-semibold">
                  Login
                </button>
              </Link>
              <Link to="/registro" onClick={() => setIsMenuOpen(false)}>
                <button className="w-full py-2 rounded-md bg-yellow-500 text-gray-900 hover:bg-yellow-400 font-bold">
                  Registro
                </button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;